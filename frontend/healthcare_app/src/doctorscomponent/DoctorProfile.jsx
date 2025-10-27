import React, { useState, useEffect, useCallback } from 'react';
// import { Link } from 'react-router-dom'; // Link is not used, so commented out
import './DoctorProfile.css';
import apiService from '../services/api';

// --- Helper Components ---
const ToggleSwitch = ({ id, label, checked, onChange }) => (
    <div className="preference-item">
        <div className="preference-label">{label}</div>
        <label className="toggle-switch">
            <input type="checkbox" id={id} checked={checked} onChange={onChange} />
            <span className="toggle-slider"></span>
        </label>
    </div>
);

// --- Main Component ---
const DoctorProfile = () => 
{
    // --- State Variables ---
    const [loading, setLoading] = useState(true);
    const [doctorId, setDoctorId] = useState(null); // To store the numeric ID for API calls
    const [doctorData, setDoctorData] = useState({
        name: "",
        specialty: "",
        id: "", // license_number
        cabin: "A-12",
        department: "",
        registration: "", // license_number
        contact: "",
        email: "",
        qualifications: "",
        bio: "",
    });
    const [availabilityStatus, setAvailabilityStatus] = useState('online'); // 'online', 'paused', 'offline'
    const [consultTimeMode, setConsultTimeMode] = useState('auto'); // 'auto' or 'manual'
    const [manualConsultTime, setManualConsultTime] = useState(15);
    const [showConsultTimeAlert, setShowConsultTimeAlert] = useState(false);
    const [consultAlertMessage, setConsultAlertMessage] = useState('');

    // Preferences State
    const [acceptWalkins, setAcceptWalkins] = useState(true);
    const [acceptTelemedicine, setAcceptTelemedicine] = useState(true);
    const [genderPreference, setGenderPreference] = useState('any');
    const [maxPatients, setMaxPatients] = useState(25);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [smsNotifications, setSmsNotifications] = useState(false);
    const [cabinDisplay, setCabinDisplay] = useState(true);
    const [autoExtendTime, setAutoExtendTime] = useState(false);

    // --- Fetch Profile Data ---
    const fetchProfileData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await apiService.getDoctorDashboard();
            const profile = data.profile;

            if (profile) {
                setDoctorId(profile.id);
                setDoctorData({
                    name: profile.full_name || "",
                    specialty: profile.specialty || "",
                    id: profile.license_number || "N/A",
                    cabin: profile.cabin || "A-12",
                    department: profile.department_name || "",
                    registration: profile.license_number || "N/A",
                    contact: profile.phone || "",
                    email: profile.email || "",
                    qualifications: profile.qualification || "",
                    bio: profile.bio || "",
                });
                setAvailabilityStatus(profile.queue_status || 'online');
                // TODO: Load preferences from backend if available
            }
        } catch (error) {
            console.error("Failed to fetch doctor profile:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    // --- Event Handlers ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setDoctorData(prev => ({ ...prev, [name]: value }));
    };

    const handleTextAreaChange = (e) => {
        const { name, value } = e.target;
        setDoctorData(prev => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = async (status) => {
        setAvailabilityStatus(status);
        if (!doctorId) return;

        try {
            await apiService.updateDoctorProfile(doctorId, {
                queue_status: status,
                is_available: status === 'online',
            });
            console.log(`Doctor status set to: ${status}`);
        } catch (error) {
            console.error("Failed to update status:", error);
            // Optionally revert status by calling fetchProfileData()
        }
    };

    const handleBreak = (time) => {
        if (time === 'Custom') {
            const customTime = prompt('Enter break duration in minutes:');
            if (customTime && !isNaN(customTime)) {
                console.log(`Break set for ${customTime} minutes`);
                handleStatusChange('break');
            }
        } else {
            console.log(`Break set for ${time}`);
            handleStatusChange('break');
        }
    };

    const handleConsultTimeModeChange = (mode) => {
        setConsultTimeMode(mode);
        setShowConsultTimeAlert(mode === 'manual');
        if (mode === 'manual') {
            setConsultAlertMessage(`Are you sure? This affects patient ETAs.`);
        }
    };

    const handleManualTimeChange = (e) => {
        const newTime = parseInt(e.target.value, 10);
        setManualConsultTime(newTime);
        if (newTime < 10) {
            setShowConsultTimeAlert(true);
            setConsultAlertMessage(`Are you sure? A shorter consult time (${newTime} min) affects patient ETAs.`);
        } else {
            setShowConsultTimeAlert(false);
        }
    };

    const handleSaveChanges = async () => {
        if (!doctorId) {
            alert('Error: Doctor ID not found. Cannot save changes.');
            return;
        }

        const dataToSave = {
            full_name: doctorData.name,
            specialty: doctorData.specialty,
            phone: doctorData.contact,
            email: doctorData.email,
            qualification: doctorData.qualifications,
            bio: doctorData.bio,
            license_number: doctorData.registration,
            queue_status: availabilityStatus,
            is_available: availabilityStatus === 'online',
            preferences: {
                consultTimeMode,
                manualConsultTime,
                acceptWalkins,
                acceptTelemedicine,
                genderPreference,
                maxPatients,
                pushNotifications,
                smsNotifications,
                cabinDisplay,
                autoExtendTime,
            }
        };

        try {
            setLoading(true);
            await apiService.updateDoctorProfile(doctorId, dataToSave);
            alert('Profile settings saved successfully!');
            fetchProfileData();
        } catch (error) {
            console.error('Failed to save changes:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // --- Render ---
    if (loading) {
        return <div className="loading-screen">Loading profile...</div>;
    }

    return (
        <>
            <div className="container">
                <div className="profile-header">
                    <h1 className="profile-title">Doctor Profile & Settings</h1>
                    <button className="btn btn-primary" onClick={handleSaveChanges}>
                        <i className="fas fa-save"></i> Save Changes
                    </button>
                </div>

                <div className="profile-content">
                    <div className="profile-sidebar">
                        <div className="profile-card">
                            <div className="profile-info">
                                <div className="profile-avatar"><i className="fas fa-user-md"></i></div>
                                <h2 className="profile-name">{doctorData.name}</h2>
                                <p className="profile-specialty">{doctorData.specialty}</p>
                                <div className="profile-details">
                                    <div className="detail-item">
                                        <span className="detail-label">Doctor ID:</span>
                                        <span className="detail-value">{doctorData.id}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Cabin No:</span>
                                        <span className="detail-value">{doctorData.cabin}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Department:</span>
                                        <span className="detail-value">{doctorData.department}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Registration:</span>
                                        <span className="detail-value">{doctorData.registration}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="profile-card">
                            <div className="card-header">
                                <h3 className="card-title">Availability Status</h3>
                            </div>
                            <div className="availability-status">
                                <div className="status-toggle">
                                    <div
                                        className={`status-option ${availabilityStatus === 'online' ? 'selected' : ''}`}
                                        onClick={() => handleStatusChange('online')}
                                    >
                                        <div className="status-indicator status-online"></div>
                                        <span className="status-label">Accepting Tokens</span>
                                        {availabilityStatus === 'online' && <i className="fas fa-check"></i>}
                                    </div>
                                    <div
                                        className={`status-option ${availabilityStatus === 'paused' ? 'selected' : ''}`}
                                        onClick={() => handleStatusChange('paused')}
                                    >
                                        <div className="status-indicator status-paused"></div>
                                        <span className="status-label">Paused</span>
                                        {availabilityStatus === 'paused' && <i className="fas fa-check"></i>}
                                    </div>
                                    <div
                                        className={`status-option ${availabilityStatus === 'offline' ? 'selected' : ''}`}
                                        onClick={() => handleStatusChange('offline')}
                                    >
                                        <div className="status-indicator status-offline"></div>
                                        <span className="status-label">Off Duty</span>
                                        {availabilityStatus === 'offline' && <i className="fas fa-check"></i>}
                                    </div>
                                </div>
                                <div className="break-options">
                                    <div className="break-title">Quick Break</div>
                                    <div className="break-buttons">
                                        {['15 min', '30 min', '45 min', '60 min', 'Custom', 'Lunch'].map(time => (
                                            <button key={time} className="break-btn" onClick={() => handleBreak(time)}>
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="profile-main">
                        <div className="profile-card">
                            <div className="card-header">
                                <h3 className="card-title">Personal Information</h3>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input type="text" className="form-control" name="name" value={doctorData.name} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contact Number</label>
                                    <input type="text" className="form-control" name="contact" value={doctorData.contact} onChange={handleInputChange} />
                                    <div className="form-text">Not visible to patients</div>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input type="email" className="form-control" name="email" value={doctorData.email} onChange={handleInputChange} />
                                    <div className="form-text">Not visible to patients</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Cabin Number</label>
                                    <input type="text" className="form-control" name="cabin" value={doctorData.cabin} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Qualifications</label>
                                <textarea className="form-control" rows="3" name="qualifications" value={doctorData.qualifications} onChange={handleTextAreaChange}></textarea>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Bio / Specialization Details</label>
                                <textarea className="form-control" rows="4" name="bio" value={doctorData.bio} onChange={handleTextAreaChange}></textarea>
                            </div>
                        </div>

                        <div className="profile-card">
                            <div className="card-header">
                                <h3 className="card-title">Average Consult Time</h3>
                            </div>
                            <div className="consult-time-settings">
                                {showConsultTimeAlert && (
                                    <div className="alert alert-warning">
                                        <i className="fas fa-exclamation-triangle"></i>
                                        <span>{consultAlertMessage}</span>
                                    </div>
                                )}
                                <div
                                    className={`time-option ${consultTimeMode === 'auto' ? 'selected' : ''}`}
                                    onClick={() => handleConsultTimeModeChange('auto')}
                                >
                                    <div>
                                        <div className="form-label">Use Auto-Calculated Average</div>
                                        <div className="form-text">System calculates based on your recent consultation times</div>
                                    </div>
                                    <div className="time-input">
                                        <input type="text" value="14 min" disabled />
                                    </div>
                                </div>
                                <div
                                    className={`time-option ${consultTimeMode === 'manual' ? 'selected' : ''}`}
                                    onClick={() => handleConsultTimeModeChange('manual')}
                                >
                                    <div>
                                        <div className="form-label">Set Manual Consult Time</div>
                                        <div className="form-text">Override system calculation with your preferred time</div>
                                    </div>
                                    <div className="time-input">
                                        <input
                                            type="number"
                                            value={manualConsultTime}
                                            min="5"
                                            max="60"
                                            onChange={handleManualTimeChange}
                                            disabled={consultTimeMode === 'auto'}
                                        />
                                        <span>minutes</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="profile-card">
                            <div className="card-header">
                                <h3 className="card-title">Preferences</h3>
                            </div>
                            <div className="preferences-grid">
                                <ToggleSwitch id="accept-walkins" label="Accept Walk-ins" checked={acceptWalkins} onChange={(e) => setAcceptWalkins(e.target.checked)} />
                                <ToggleSwitch id="accept-telemedicine" label="Accept Telemedicine" checked={acceptTelemedicine} onChange={(e) => setAcceptTelemedicine(e.target.checked)} />
                                <div className="preference-item">
                                    <div className="preference-label">Gender Preference</div>
                                    <select className="form-control" style={{ width: '150px' }} value={genderPreference} onChange={(e) => setGenderPreference(e.target.value)}>
                                        <option value="any">Any Gender</option>
                                        <option value="male">Male Patients</option>
                                        <option value="female">Female Patients</option>
                                    </select>
                                </div>
                                <div className="preference-item">
                                    <div className="preference-label">Max Patients Per Day</div>
                                    <input type="number" className="form-control" value={maxPatients} onChange={(e) => setMaxPatients(e.target.value)} style={{ width: '100px' }} />
                                </div>
                                <ToggleSwitch id="push-notifications" label="Push Notifications" checked={pushNotifications} onChange={(e) => setPushNotifications(e.target.checked)} />
                                <ToggleSwitch id="sms-notifications" label="SMS Notifications" checked={smsNotifications} onChange={(e) => setSmsNotifications(e.target.checked)} />
                                <ToggleSwitch id="cabin-display" label="Cabin Display" checked={cabinDisplay} onChange={(e) => setCabinDisplay(e.target.checked)} />
                                <ToggleSwitch id="auto-extend" label="Auto-extend Time" checked={autoExtendTime} onChange={(e) => setAutoExtendTime(e.target.checked)} />
                            </div>
                        </div>

                        <div className="profile-card">
                            <div className="card-header">
                                <h3 className="card-title">Shift Management</h3>
                                <div className="card-actions">
                                    <button className="action-btn"><i className="fas fa-calendar-plus"></i> Request Change</button>
                                </div>
                            </div>
                            <div className="shift-calendar">
                                <div className="calendar-header">
                                    <h4>November 2023</h4>
                                    <div className="calendar-nav">
                                        <button className="calendar-nav-btn"><i className="fas fa-chevron-left"></i></button>
                                        <button className="calendar-nav-btn"><i className="fas fa-chevron-right"></i></button>
                                    </div>
                                </div>
                                <div className="calendar-grid">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="calendar-day">{day}</div>)}
                                    {[29, 30, 31, 1, 2, 3].map(d => <div key={`prev-${d}`} className="calendar-date">{d}</div>)}
                                    {[4, 5, 6, 7, 8].map(d => <div key={d} className="calendar-date has-shift">{d}</div>)}
                                    {[9, 10, 11, 12].map(d => <div key={d} className="calendar-date">{d}</div>)}
                                    <div className="calendar-date active has-shift">13</div>
                                    {[14, 15, 16].map(d => <div key={d} className="calendar-date has-shift">{d}</div>)}
                                    {[17, 18, 19, 20].map(d => <div key={d} className="calendar-date">{d}</div>)}
                                    {[21, 22, 23, 24].map(d => <div key={d} className="calendar-date has-shift">{d}</div>)}
                                    {[25, 26, 27, 28].map(d => <div key={d} className="calendar-date">{d}</div>)}
                                    {[29, 30].map(d => <div key={d} className="calendar-date has-shift">{d}</div>)}
                                    {[1, 2].map(d => <div key={`next-${d}`} className="calendar-date">{d}</div>)}
                                </div>
                                <div className="shift-details">
                                    <div className="shift-info">
                                        <div>
                                            <div className="form-label">Today's Shift</div>
                                            <div className="shift-time">9:00 AM - 5:00 PM</div>
                                        </div>
                                        <div className="shift-actions">
                                            <button className="btn btn-outline btn-sm"><i className="fas fa-exchange-alt"></i> Swap</button>
                                            <button className="btn btn-outline btn-sm"><i className="fas fa-times"></i> Cancel</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            </>
    );
}

export default DoctorProfile;
