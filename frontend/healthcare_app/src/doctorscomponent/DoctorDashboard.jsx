// src/components/DoctorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import './DoctorDashboard.css';

const DoctorDashboard = () => {
  const { user } = useAuth();

  const [doctorStatus, setDoctorStatus] = useState('online');
  const [queue, setQueue] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [queueStats, setQueueStats] = useState(null);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await apiService.safeRequest('/doctor/dashboard/');

      const allAppointments = data.today_appointments || [];

      // ✅ Filter queue → only in-progress or pending appointments
      const activeQueue = allAppointments.filter((a) =>
        ['waiting', 'inprogress', 'scheduled', 'confirmed'].includes(a.status)
      );

      // ✅ Filter upcoming → only future/scheduled ones (not started)
      const upcomingPatients = allAppointments.filter((a) =>
        ['scheduled', 'confirmed'].includes(a.status)
      );

      setDoctor(data.profile);
      setQueue(activeQueue);
      setUpcoming(upcomingPatients);
      setQueueStats(data.current_queue || null);
    } catch (err) {
      console.error('Error fetching doctor dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActiveAppointment = () => {
    if (!queueStats?.current_token)
      return queue.find((a) =>
        ['inprogress', 'waiting'].includes(a.status)
      );
    return queue.find((a) => a.token_number === queueStats.current_token);
  };

  // ✅ FIXED: Corrected endpoint for ending consultation
  const handleEndConsultation = async () => {
    const active = getActiveAppointment();
    if (!active) return alert('No active consultation found.');

    try {
      await apiService.safeRequest(`/appointments/${active.id}/endconsultation/`, {
        method: 'POST',
        body: JSON.stringify({
          notes: 'Consultation completed successfully.',
        }),
      });
      alert(`Consultation for Token #${active.token_number} ended successfully.`);
      setTimer(0);
      await fetchDashboardData();
    } catch (err) {
      console.error('Error ending consultation:', err);
      alert('Failed to end consultation.');
    }
  };

  // ✅ FIXED: Corrected endpoint for starting consultation
  const handleCallNext = async () => {
    const next = queue.find((a) =>
      ['scheduled', 'confirmed', 'waiting'].includes(a.status)
    );
    if (!next) return alert('No next patient in queue.');

    try {
      await apiService.safeRequest(`/appointments/${next.id}/startconsultation/`, {
        method: 'POST',
      });
      alert(`Next patient Token #${next.token_number} is now in consultation.`);
      await fetchDashboardData();
    } catch (err) {
      console.error('Error calling next patient:', err);
      alert('Error calling next patient (check your backend endpoint).');
    }
  };

  // ✅ FIXED: Corrected endpoint for marking no-show
  const handleMarkNoShow = async () => {
    const active = getActiveAppointment();
    if (!active) return alert('No active patient to mark no-show.');

    try {
      await apiService.safeRequest(`/appointments/${active.id}/endconsultation/`, {
        method: 'POST',
        body: JSON.stringify({
          no_show: true,
          notes: 'Patient marked as no-show.',
        }),
      });
      alert(`Token #${active.token_number} marked as no-show.`);
      await fetchDashboardData();
    } catch (err) {
      console.error('Error marking No-Show:', err);
      alert('Unable to mark No-Show.');
    }
  };

  const handleStatusChange = async (status) => {
    setDoctorStatus(status);
    try {
      await apiService.safeRequest('/doctor/availability/', {
        method: 'POST',
        body: JSON.stringify({
          is_available: status === 'online',
          is_active: status === 'online',
        }),
      });
    } catch (err) {
      console.error('Error changing status:', err);
    }
  };

  const handlePauseTokens = async () => {
    try {
      await apiService.safeRequest('/doctor/availability/', {
        method: 'POST',
        body: JSON.stringify({ is_available: false, is_active: false }),
      });
      setDoctorStatus('paused');
      alert('Paused accepting new tokens.');
    } catch (err) {
      console.error('Error pausing tokens:', err);
    }
  };

  const handleRequestAssistance = () => {
    alert('Assistance request sent to admin.');
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTimer((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const offline = setTimeout(() => setIsOffline(true), 15000);
    return () => clearTimeout(offline);
  }, []);

  if (loading) return <div className="loading-screen">Loading dashboard...</div>;

  const statusMap = {
    online: { cls: 'status-online', text: 'Accepting Tokens', icon: 'fas fa-circle' },
    paused: { cls: 'status-offline', text: 'Paused', icon: 'fas fa-circle' },
    break: { cls: 'status-break', text: 'On Break', icon: 'fas fa-circle' },
  };

  const s = statusMap[doctorStatus];
  const tooManyPatients = queue.length > 5;

  return (
    <>
      {/* Header */}
      <div className="container">
        <div className="doctor-header">
          <div className="doctor-info">
            <div className="doctor-avatar"><i className="fas fa-user-md" /></div>
            <div className="doctor-details">
              <h1>{doctor?.full_name || 'Dr. Unknown'}</h1>
              <p>{doctor?.specialty || 'Specialist'}</p>
              <p><i className="far fa-clock" /> Current Shift: 9:00 AM - 5:00 PM</p>
              <div className={`status-badge ${s.cls}`}>
                <i className={s.icon} /> {s.text}
              </div>
            </div>
          </div>
          <div className="status-toggle">
            {['online', 'paused', 'break'].map((state) => (
              <button
                key={state}
                className={`toggle-btn ${doctorStatus === state ? 'active' : ''}`}
                onClick={() => handleStatusChange(state)}
              >
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard */}
      <div className="container">
        <div className="dashboard">
          <div className="dashboard-main">
            {/* Now Serving */}
            <div className="dashboard-card now-serving">
              <div className="card-header">
                <h2 className="card-title" style={{ color: 'white' }}>Now Serving</h2>
                <div className="consultation-timer">{formatTime(timer)}</div>
              </div>
              <div className="current-patient">
                <div className="patient-avatar"><i className="fas fa-user" /></div>
                <div className="patient-details">
                  <h3>Token #{queueStats?.current_token || 'N/A'}</h3>
                  <p>Patients Served: {queueStats?.completed_tokens || 0}</p>
                  <p>Avg. Time: {queueStats?.average_time_per_patient || 'N/A'} min</p>
                </div>
              </div>
              <div className="consultation-actions">
                <button className="btn btn-secondary" onClick={handleEndConsultation}>
                  <i className="fas fa-check-circle" /> End Consultation
                </button>
                <button className="btn btn-danger" onClick={handleMarkNoShow}>
                  <i className="fas fa-times-circle" /> Mark No-Show
                </button>
              </div>
            </div>

            {/* Queue */}
            <div className="dashboard-card">
              <div className="card-header">
                <h2 className="card-title">Today's Queue</h2>
                <div className="queue-count">{queue.length} Patients</div>
              </div>
              <div className="queue-list">
                {queue.map((appt) => (
                  <div className="queue-item" key={appt.id}>
                    <div className="token-info">
                      <div className="token-number">{appt.token_number}</div>
                      <div className="patient-brief">
                        <div className="patient-name">{appt.patient_name}</div>
                        <div className="appointment-type">{appt.reason}</div>
                      </div>
                    </div>
                    <div className="queue-status">
                      <div className="eta">Time: {appt.time_slot}</div>
                      <div className={`status-label status-${appt.status}`}>{appt.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Workload Warning */}
            {tooManyPatients && (
              <div className="workload-warning show">
                <div className="warning-header">
                  <i className="fas fa-exclamation-triangle" />
                  <h3>High Queue Load Warning</h3>
                </div>
                <p>Your queue exceeds the optimal threshold. Consider pausing or seeking help.</p>
                <div className="warning-actions">
                  <button className="btn btn-warning" onClick={handlePauseTokens}>
                    <i className="fas fa-pause" /> Pause New Tokens
                  </button>
                  <button className="btn btn-outline" onClick={handleRequestAssistance}>
                    <i className="fas fa-user-md" /> Request Assistance
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="dashboard-sidebar">
            <div className="dashboard-card">
              <div className="card-header"><h2>Upcoming Patients</h2></div>
              <div className="upcoming-patients">
                {upcoming.map((p) => (
                  <div className="upcoming-patient" key={p.id}>
                    <div className="upcoming-patient-info">
                      <div className="upcoming-patient-avatar"><i className="fas fa-user" /></div>
                      <div>
                        <div className="patient-name">{p.patient_name}</div>
                        <div className="appointment-type">{p.token_number} • {p.time_slot}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-header"><h2>Quick Stats</h2></div>
              <div className="stats-grid">
                <div className="stat-card"><div className="stat-value">{queue.length}</div><div className="stat-label">Waiting</div></div>
                <div className="stat-card"><div className="stat-value">{queueStats?.completed_tokens || 0}</div><div className="stat-label">Completed</div></div>
                <div className="stat-card"><div className="stat-value">{queueStats?.average_time_per_patient || 'N/A'} min</div><div className="stat-label">Avg Time</div></div>
              </div>
            </div>

            <div className="call-next-container">
              <button className="call-next-btn" onClick={handleCallNext}>
                <i className="fas fa-bullhorn" /> Call Next Patient
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`network-status ${isOffline ? 'show' : ''}`}>
        <i className="fas fa-wifi" />
        <span>Live updates paused — Offline mode active.</span>
      </div>
    </>
  );
};

export default DoctorDashboard;
