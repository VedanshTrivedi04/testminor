// src/components/LiveSession.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import './LiveSession.css';

const formatTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const LiveSession = () => {
  const { user } = useAuth();

  const [currentSession, setCurrentSession] = useState(null);
  const [nextPatients, setNextPatients] = useState([]);
  const [sessionStatus, setSessionStatus] = useState('in-progress');
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showFloatingControls, setShowFloatingControls] = useState(false);
  const [modalState, setModalState] = useState({ type: null, data: null });
  const [toast, setToast] = useState({ visible: false, message: '' });

  // Use ref to store interval ID to avoid stale closures
  const timerRef = useRef(null);

  // --- Fetch session data ---
  const fetchSessionData = async () => {
    try {
      const dashboard = await apiService.safeRequest('/doctor/dashboard/');
      setCurrentSession(dashboard.current_session || null);
      setNextPatients(dashboard.next_patients || []);
      setSessionStatus(dashboard.session_status || 'in-progress');
      setSessionSeconds(dashboard.session_elapsed_seconds || 0);
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, []);

  // --- Timer logic ---
  useEffect(() => {
    // Clear any existing interval first
    if (timerRef.current) clearInterval(timerRef.current);

    if (sessionStatus === 'in-progress') {
      timerRef.current = setInterval(() => {
        setSessionSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionStatus]);

  // --- Toast helper ---
  const showToast = useCallback((message) => {
    setToast({ visible: true, message });
    setTimeout(() => {
      setToast({ visible: false, message: '' });
    }, 3000);
  }, []);

  // --- Controls ---
  const toggleFloatingControls = () => setShowFloatingControls((prev) => !prev);
  const closeFloatingControls = () => setShowFloatingControls(false);

  const openModal = (type) => setModalState({ type, data: currentSession });
  const closeModal = () => setModalState({ type: null, data: null });

  // --- Actions ---
  const handleCompleteSession = async () => {
    if (!currentSession) return;
    try {
      await apiService.finishConsultation(currentSession.id);
      setSessionStatus('completed');
      showToast('Session completed successfully!');
      await fetchSessionData();
    } catch (error) {
      console.error(error);
      alert('Failed to complete session');
    }
  };

  const handleConfirmHold = () => {
    setSessionStatus('on-hold');
    closeModal();
    showToast('Session placed on hold.');
  };

  const handleConfirmExtend = () => {
    showToast('Session extended. Waiting patients notified.');
    closeModal();
  };

  const handleConfirmTransfer = () => {
    showToast('Session transferred successfully.');
    closeModal();
  };

  const handleCallNext = async () => {
    if (nextPatients.length === 0) {
      alert('No next patient in queue.');
      return;
    }
    try {
      await apiService.startConsultation(nextPatients[0].id);
      await fetchSessionData();
      showToast('Next patient has been called.');
    } catch (error) {
      console.error(error);
      alert('Failed to call next patient');
    }
  };

  const handleSendReminders = () => {
    showToast('Reminders sent to next 3 patients.');
  };

  const timelineStepStatus = (stepIndex) => {
    const stepMap = { 'queued': 0, 'called': 1, 'in-progress': 2, 'completed': 3, 'on-hold': 1 };
    const currentStepIndex = stepMap[sessionStatus] ?? 0;
    if (stepIndex < currentStepIndex) return 'step-completed';
    if (stepIndex === currentStepIndex) return 'step-active';
    return '';
  };

  const statusIndicatorMap = {
    'in-progress': { className: 'status-in-progress', text: 'Session In Progress', icon: 'fas fa-circle' },
    'on-hold': { className: 'status-on-hold', text: 'Session On Hold', icon: 'fas fa-pause' },
    'completed': { className: 'status-completed', text: 'Session Completed', icon: 'fas fa-check' }
  };
  const currentStatusIndicator = statusIndicatorMap[sessionStatus] || statusIndicatorMap['in-progress'];

  return (
    <>
      <div className="container">
        <div className="session-header">
          <h1 className="session-title">Live Session View</h1>
          <div className="session-status">
            <div className={`status-indicator ${currentStatusIndicator.className}`}>
              <i className={currentStatusIndicator.icon}></i> {currentStatusIndicator.text}
            </div>
            <button className="btn btn-outline btn-sm" onClick={toggleFloatingControls}>
              <i className="fas fa-window-restore"></i> Toggle Controls
            </button>
          </div>
        </div>

        <div className="session-timeline">
          {['Queued', 'Called', 'In Progress', 'Completed'].map((label, index) => (
            <div className={`timeline-step ${timelineStepStatus(index)}`} key={label}>
              <div className="step-icon">
                <i className={
                  index === 0 ? "fas fa-clipboard-list" :
                  index === 1 ? "fas fa-bullhorn" :
                  index === 2 ? "fas fa-user-md" :
                  "fas fa-check-circle"
                }></i>
              </div>
              <div className="step-label">{label}</div>
            </div>
          ))}
        </div>

        {currentSession ? (
          <div className="current-session">
            <div className="session-patient">
              <div className="patient-avatar"><i className="fas fa-user"></i></div>
              <div className="patient-details">
                <h2>{currentSession.patient_name}</h2>
                <p>Token: <strong>{currentSession.token_number}</strong></p>
                <p>Age: {currentSession.age} • Gender: {currentSession.gender}</p>
                <p>Appointment Type: {currentSession.appointment_type}</p>
              </div>
            </div>
            <div className="session-timer">{formatTime(sessionSeconds)}</div>
            <div className="session-actions">
              <button className="btn btn-secondary" onClick={handleCompleteSession}>
                <i className="fas fa-check-circle"></i> Complete Session
              </button>
              <button className="btn btn-warning" onClick={() => openModal('hold')}>
                <i className="fas fa-pause"></i> Hold Session
              </button>
              <button className="btn btn-info" onClick={() => openModal('extend')}>
                <i className="fas fa-clock"></i> Extend Time
              </button>
              <button className="btn btn-outline" onClick={() => openModal('transfer')}>
                <i className="fas fa-exchange-alt"></i> Transfer Session
              </button>
            </div>
          </div>
        ) : (
          <p>No session in progress</p>
        )}

        {/* Rest of your UI remains unchanged */}
      </div>
    </>
  );
};

export default LiveSession;
