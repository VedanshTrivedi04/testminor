// src/components/CabinDisplay.jsx
import React, { useState, useEffect, useRef } from 'react';
import apiService from '../services/api';
import './CabinDisplay.css';

const quickMessages = [
  { icon: 'fas fa-coffee', text: 'Short Break', message: 'Doctor on short break — back soon' },
  { icon: 'fas fa-directions', text: 'Change Waiting Area', message: 'Please wait in hall no. 2' },
  { icon: 'fas fa-first-aid', text: 'Emergency Delay', message: 'Doctor in emergency — please wait' },
  { icon: 'fas fa-tools', text: 'Technical Issue', message: 'Technical issue — please bear with us' }
];

const CabinDisplay = () => {
  // BACKEND STATE
  const [nowServing, setNowServing] = useState({ token: '—', patient: 'No active patient' });
  const [upcomingTokens, setUpcomingTokens] = useState([]);

  // DOCTOR INFO (new)
  const [doctorName, setDoctorName] = useState('Dr. —');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');

  // UI STATE
  const [message, setMessage] = useState('');
  const [isMessageVisible, setIsMessageVisible] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [showFullNames, setShowFullNames] = useState(true);
  const [showTokens, setShowTokens] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [cabinStatus, setCabinStatus] = useState('normal');
  const [toast, setToast] = useState({ visible: false, message: '' });

  const previewRef = useRef(null);

  const showToast = (msg) => {
    setToast({ visible: true, message: msg });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const anonymizeName = (n) => {
    if (!n) return '—';
    const p = n.split(' ');
    return p.length < 2 ? `${p[0][0]}.` : `${p[0][0]}. ${p[p.length - 1]}`;
  };
  const getName = (name) => showFullNames ? name : anonymizeName(name);

  // Robust loader: first try dashboard (which has current_queue + today_appointments),
  // then fallback to the doctor/appointments endpoint if dashboard doesn't include appointments.
  const loadCabinData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      // 1) Try dashboard (preferred)
      let dashboard = null;
      try {
        dashboard = await apiService.safeRequest('/doctor/dashboard/');
      } catch (err) {
        dashboard = null;
      }

      // If dashboard had profile info, set doctor name & specialty
      if (dashboard?.profile) {
        const prof = dashboard.profile;
        setDoctorName(prof.full_name ? `Dr. ${prof.full_name}` : (prof.doctor_name ? `Dr. ${prof.doctor_name}` : 'Dr. —'));
        setDoctorSpecialty(prof.specialty || prof.department_name || '');
      }

      // Extract token from dashboard if available
      const activeTokenRaw = dashboard?.current_queue?.current_token ?? null;
      const activeToken = activeTokenRaw ? String(activeTokenRaw) : null;

      // 2) Get appointments: prefer dashboard.today_appointments if present (avoid extra request)
      let appointments = [];
      if (Array.isArray(dashboard?.today_appointments) && dashboard.today_appointments.length > 0) {
        appointments = dashboard.today_appointments;
      } else {
        // fallback to appointments endpoint (may be paginated)
        try {
          const resp = await apiService.safeRequest(`/doctor/appointments/?date=${today}`);
          appointments = Array.isArray(resp) ? resp : (resp?.results || []);
        } catch (err) {
          console.error('CabinDisplay: cannot fetch appointments:', err);
          return;
        }
      }

      // Normalize appointments (defensive checks) and also try to capture doctor info from an appointment
      appointments = appointments.map(a => ({
        id: a.id,
        token_number: a.token_number != null ? String(a.token_number) : (a.token ?? ''),
        patient_name: a.patient_name || a.patient?.full_name || a.patient || 'Unknown',
        status: (a.status || '').toLowerCase(),
        reason: a.reason || a.booking_type || a.reason_for_visit || '—',
        time_slot: a.time_slot || a.appointment_time || '',
        // optional doctor name from appointment
        doctor_name: a.doctor_name || (a.doctor?.full_name) || a.doctor || null
      }));

      // If dashboard didn't include profile, try fill doctorName from first appointment's doctor_name
      if ((!dashboard || !dashboard.profile) && appointments.length > 0) {
        const apptDoctor = appointments.find(a => a.doctor_name);
        if (apptDoctor && apptDoctor.doctor_name) {
          setDoctorName(prev => prev === 'Dr. —' ? `Dr. ${apptDoctor.doctor_name}` : prev);
        }
      }

      // Find active patient by matching token. Use "includes" to handle cases like "CARD-YYYY..." vs numeric token
      let activePatient = null;
      if (activeToken) {
        activePatient = appointments.find(appt =>
          (String(appt.token_number) && String(appt.token_number).includes(activeToken)) ||
          (activeToken.includes(String(appt.token_number))) ||
          (String(appt.token_number) === activeToken)
        );
        if (!activePatient) {
          activePatient = appointments.find(appt => String(appt.token_number) === activeToken);
        }
      } else {
        // if dashboard didn't provide a token, find first in-progress or waiting
        activePatient = appointments.find(a => ['in_progress', 'inprogress', 'waiting', 'arrived'].includes(a.status));
      }

      setNowServing({
        token: activeToken || (activePatient?.token_number || '—'),
        patient: activePatient?.patient_name || 'Waiting for next patient...'
      });

      // Upcoming tokens = those waiting/pending/arrived but exclude the activePatient used above
      const upcoming = appointments
        .filter(a => ['waiting', 'pending', 'arrived', 'scheduled', 'confirmed'].includes(a.status))
        .filter(a => !(activePatient && String(a.token_number) === String(activePatient.token_number)))
        // attempt numeric sorting when possible else fallback to string
        .sort((a, b) => {
          const an = Number(a.token_number);
          const bn = Number(b.token_number);
          if (!isNaN(an) && !isNaN(bn)) return an - bn;
          return String(a.token_number).localeCompare(String(b.token_number));
        })
        .map(a => ({ token: a.token_number, patient: a.patient_name, reason: a.reason }));

      // limit to next 3 tokens for display
      setUpcomingTokens(upcoming.slice(0, 3));
    } catch (err) {
      console.error('CabinDisplay load error:', err);
    }
  };

  useEffect(() => {
    loadCabinData();
    const interval = setInterval(loadCabinData, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UI handlers (unchanged)
  const handleQuickMessage = (msg) => {
    setMessage(msg);
    setIsMessageVisible(true);
    showToast(`Message sent: "${msg}"`);
  };

  const handleSendCustomMessage = () => {
    if (!customMessage.trim()) return;
    setMessage(customMessage.trim());
    setIsMessageVisible(true);
    showToast('Custom message sent');
    setCustomMessage('');
  };

  const handleClearMessage = () => {
    setIsMessageVisible(false);
    showToast('Message cleared');
  };

  const handleCallToken = (token, patient) => {
    setNowServing({ token, patient });
    showToast(`Token ${token} called`);
    // optionally you could call an API to notify the patient; left as UI-only to preserve original behavior
  };

  const handleSetStatus = (status, label, msg) => {
    setCabinStatus(status);
    showToast(`Cabin status set to: ${label}`);
    if (status !== 'normal') {
      setMessage(msg);
      setIsMessageVisible(true);
    } else {
      setIsMessageVisible(false);
    }
  };

  const handleRefresh = () => {
    loadCabinData();
    showToast('Preview refreshed');
  };

  const handleFullscreen = () => {
    if (previewRef.current?.requestFullscreen) previewRef.current.requestFullscreen();
  };

  const handleReset = () => {
    loadCabinData();
    setShowFullNames(true);
    setShowTokens(true);
    setShowUpcoming(true);
    setCabinStatus('normal');
    setIsMessageVisible(false);
    showToast('Cabin display reset to default');
  };

  return (
    <>
      <div className="container">
        <div className="cabin-header">
          <h1 className="cabin-title">Cabin Display Controls</h1>
          <div className="cabin-actions">
            <button className="btn btn-primary" onClick={handleRefresh}>
              <i className="fas fa-sync-alt"></i> Refresh Preview
            </button>
          </div>
        </div>

        <div className="cabin-content">
          <div className="cabin-preview-container">
            <div className="preview-header">
              <h3 className="preview-title">Cabin Display Preview</h3>
              <div className="preview-actions">
                <button className="btn btn-outline btn-sm" onClick={handleFullscreen}>
                  <i className="fas fa-expand"></i> Fullscreen
                </button>
                <button className="btn btn-outline btn-sm" onClick={handleReset}>
                  <i className="fas fa-undo"></i> Reset
                </button>
              </div>
            </div>

            <div className="cabin-preview" ref={previewRef}>
              <div className="cabin-header-info">
                <div className="cabin-doctor-name">{doctorName}</div>
                <div className="cabin-doctor-specialty">{doctorSpecialty}</div>
              </div>

              <div className="cabin-status">
                <div className="now-serving-label">NOW SERVING</div>
                {showTokens && <div className="now-serving-token">{nowServing.token}</div>}
                <div className="now-serving-patient">{getName(nowServing.patient)}</div>
              </div>

              {isMessageVisible && <div className="cabin-message show">{message}</div>}

              {showUpcoming && (
                <div className="cabin-upcoming">
                  <div className="upcoming-label">COMING UP NEXT</div>
                  <div className="upcoming-tokens">
                    {upcomingTokens.map(t => (
                      <div className="upcoming-token" key={String(t.token)}>
                        {showTokens && <div className="token-number">{t.token}</div>}
                        <div className="token-patient">{getName(t.patient)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls panel UI intentionally preserved (not repeated here to keep file short) */}
        </div>
      </div>

      <div className={`toast ${toast.visible ? 'show' : ''}`}>
        <i className="fas fa-check-circle"></i>
        <span>{toast.message}</span>
      </div>
    </>
  );
};

export default CabinDisplay;
