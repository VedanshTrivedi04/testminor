// src/components/LiveSession.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import './LiveSession.css';

const formatTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const getTokenFromAppointment = (appt) => {
  if (!appt) return '—';
  return appt.token_number ?? appt.token ?? appt.id ?? '—';
};

const parseIsoToSecondsSince = (isoString) => {
  if (!isoString) return null;
  const then = new Date(isoString).getTime();
  if (isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 1000);
};

const LiveSession = () => {
  const { user } = useAuth();

  const [currentSession, setCurrentSession] = useState(null);
  const [nextPatients, setNextPatients] = useState([]);
  const [sessionStatus, setSessionStatus] = useState('queued'); // queued | in-progress | on-hold | completed
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const timerRef = useRef(null);

  const fetchSessionData = async () => {
    try {
      const data = await apiService.safeRequest('/doctor/dashboard/');
      const all = data.today_appointments || [];

      // find active appointment
      let active = all.find(a => a.status === 'in_progress') ||
                   (data.current_queue?.current_token ? all.find(a => {
                     const t = a.token_number ?? a.token;
                     return t === data.current_queue.current_token;
                   }) : null);

      // fallback to first waiting/scheduled/confirmed
      if (!active) active = all.find(a => ['waiting', 'scheduled', 'confirmed'].includes(a.status));

      setCurrentSession(active ?? null);

      // next patients after the active (simple: all waiting/scheduled/confirmed except active)
      const waiting = all.filter(a => ['waiting', 'scheduled', 'confirmed'].includes(a.status) && a.id !== (active?.id));
      setNextPatients(waiting);

      // set status
      if (active?.status === 'in_progress') setSessionStatus('in-progress');
      else if (active) setSessionStatus('called');
      else setSessionStatus('queued');

      // compute seconds from consultation_started_at if available
      const elapsed = parseIsoToSecondsSince(active?.consultation_started_at ?? active?.consultation_start_time ?? data.current_queue?.started_at);
      if (elapsed !== null) {
        setSessionSeconds(elapsed);
      } else {
        // if backend supplied a seconds field use it, else 0
        setSessionSeconds(data.current_queue?.session_seconds ?? 0);
      }
    } catch (err) {
      console.error('Failed to load session data:', err);
    }
  };

  useEffect(() => {
    fetchSessionData();
    // poll for live updates (every 2s)
    const poll = setInterval(fetchSessionData, 2000);
    return () => clearInterval(poll);
  }, []);

  // timer handling
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (sessionStatus === 'in-progress') {
      timerRef.current = setInterval(() => {
        setSessionSeconds(prev => prev + 1);
      }, 1000);
    }

    return () => clearInterval(timerRef.current);
  }, [sessionStatus]);

  const showToast = useCallback((msg) => {
    // simple console for now; you already have UI toast in original file
    console.log('TOAST:', msg);
  }, []);

  // ACTIONS
  const handleCompleteSession = async () => {
    if (!currentSession) return alert('No active session');
    try {
      await apiService.endConsultation(currentSession.id);
      showToast('Session completed');
      await fetchSessionData();
    } catch (err) {
      console.error(err);
      alert('Failed to complete session');
    }
  };

  const handleCallNext = async () => {
    if (!nextPatients.length) return alert('No next patient');
    try {
      await apiService.startConsultation(nextPatients[0].id);
      showToast('Called next patient');
      await fetchSessionData();
    } catch (err) {
      console.error(err);
      alert('Failed to call next patient');
    }
  };

  const handleHold = () => {
    setSessionStatus('on-hold');
    showToast('Session on hold');
  };

  const handleExtend = () => {
    showToast('Session extended');
  };

  const handleTransfer = () => {
    showToast('Session transferred');
  };

  return (
    <div className="container">
      <div className="session-header">
        <h1 className="session-title">Live Session View</h1>
        <div className="session-status">
          <div className={`status-indicator status-${sessionStatus}`}>
            <i className="fas fa-circle"></i> {sessionStatus.replace('-', ' ')}
          </div>
        </div>
      </div>

      <div className="session-timeline">
        {['Queued','Called','In Progress','Completed'].map((label, idx) => (
          <div className="timeline-step" key={label}>
            <div className="step-icon"><i className={
              idx === 0 ? "fas fa-clipboard-list" :
              idx === 1 ? "fas fa-bullhorn" :
              idx === 2 ? "fas fa-user-md" :
              "fas fa-check-circle"
            }></i></div>
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
              <p>Token: <strong>{getTokenFromAppointment(currentSession)}</strong></p>
              <p>Age: {currentSession.patient_age ?? 'N/A'}</p>
              <p>Reason: {currentSession.reason ?? currentSession.appointment_type ?? ''}</p>
            </div>
          </div>

          <div className="session-timer">{formatTime(sessionSeconds)}</div>

          <div className="session-actions">
            <button className="btn btn-secondary" onClick={handleCompleteSession}>Complete Session</button>
            <button className="btn btn-warning" onClick={handleHold}>Hold Session</button>
            <button className="btn btn-info" onClick={handleExtend}>Extend Time</button>
            <button className="btn btn-outline" onClick={handleTransfer}>Transfer</button>
            <button className="btn btn-primary" onClick={handleCallNext}>Call Next</button>
          </div>
        </div>
      ) : (
        <p>No session in progress</p>
      )}
    </div>
  );
};

export default LiveSession;
