// src/components/DoctorProfile.jsx
import React, { useState, useEffect, useCallback } from 'react';
import './DoctorProfile.css';
import apiService from '../services/api';

// Reusable toggle switch component
const ToggleSwitch = ({ id, label, checked, onChange }) => (
    <div className="preference-item">
        <div className="preference-label">{label}</div>
        <label className="toggle-switch">
            <input type="checkbox" id={id} checked={checked} onChange={onChange} />
            <span className="toggle-slider"></span>
        </label>
    </div>
);

const DoctorProfile = () => {
    const [loading, setLoading] = useState(true);
    const [doctorId, setDoctorId] = useState(null);

    // Doctor profile data
    const [doctorData, setDoctorData] = useState({
        name: "",
        specialty: "",
        id: "",
        cabin: "",
        department: "",
        registration: "",
        contact: "",
        email: "",
        qualifications: "",
        bio: "",
    });

    const [availabilityStatus, setAvailabilityStatus] = useState("online");

    // Preferences
    const [consultTimeMode, setConsultTimeMode] = useState("auto");
    const [manualConsultTime, setManualConsultTime] = useState(15);
    const [acceptWalkins, setAcceptWalkins] = useState(true);
    const [acceptTelemedicine, setAcceptTelemedicine] = useState(true);
    const [genderPreference, setGenderPreference] = useState("any");
    const [maxPatients, setMaxPatients] = useState(25);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [smsNotifications, setSmsNotifications] = useState(false);
    const [cabinDisplay, setCabinDisplay] = useState(true);
    const [autoExtendTime, setAutoExtendTime] = useState(false);

    // -------------------------------
    // FETCH PROFILE (Correct Backend)
    // -------------------------------
    const fetchProfileData = useCallback(async () => {
        try {
            setLoading(true);

            // 1. GET doctor dashboard
            const dash = await apiService.getDoctorDashboard();
            const profile = dash?.profile || dash;

            if (!profile) throw new Error("Profile not found");

            setDoctorId(profile.id);

            // 2. GET full doctor profile
            const detail = await apiService.getDoctorDetail(profile.id);

            setDoctorData({
                name: detail.full_name || "",
                specialty: detail.specialty || "",
                id: detail.license_number || "N/A",
                cabin: detail.cabin || "A-12",
                department: detail.department_name || "",
                registration: detail.license_number || "N/A",
                contact: detail.phone || "",
                email: detail.email || "",
                qualifications: detail.qualification || "",
                bio: detail.bio || "",
            });

            setAvailabilityStatus(detail.queue_status || "online");

            // Load preferences (if your backend sends it)
            if (detail.preferences) {
                const p = detail.preferences;
                setConsultTimeMode(p.consultTimeMode || "auto");
                setManualConsultTime(p.manualConsultTime || 15);
                setAcceptWalkins(p.acceptWalkins ?? true);
                setAcceptTelemedicine(p.acceptTelemedicine ?? true);
                setGenderPreference(p.genderPreference || "any");
                setMaxPatients(p.maxPatients || 25);
                setPushNotifications(p.pushNotifications ?? true);
                setSmsNotifications(p.smsNotifications ?? false);
                setCabinDisplay(p.cabinDisplay ?? true);
                setAutoExtendTime(p.autoExtendTime ?? false);
            }

        } catch (err) {
            console.error("Failed to fetch profile:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    // -------------------------------
    // UPDATE STATUS (Correct Backend)
    // -------------------------------
    const handleStatusChange = async (status) => {
        setAvailabilityStatus(status);

        try {
            await apiService.updateDoctorAvailability({
                queue_status: status,
                is_available: status === "online"
            });
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    };

    // -------------------------------
    // INPUT HANDLERS
    // -------------------------------
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setDoctorData(prev => ({ ...prev, [name]: value }));
    };

    const handleTextAreaChange = (e) => {
        const { name, value } = e.target;
        setDoctorData(prev => ({ ...prev, [name]: value }));
    };

    // -------------------------------
    // SAVE CHANGES → PUT /doctor/{id}/
    // -------------------------------
    const handleSaveChanges = async () => {
        if (!doctorId) return alert("Error: doctor ID missing");

        const payload = {
            full_name: doctorData.name,
            specialty: doctorData.specialty,
            cabin: doctorData.cabin,
            phone: doctorData.contact,
            email: doctorData.email,
            qualification: doctorData.qualifications,
            bio: doctorData.bio,
            license_number: doctorData.registration,
            queue_status: availabilityStatus,
            is_available: availabilityStatus === "online",
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
                autoExtendTime
            }
        };

        try {
            setLoading(true);
            await apiService.updateDoctor(doctorId, payload);
            alert("Profile updated successfully!");
            fetchProfileData();
        } catch (err) {
            console.error("Update failed:", err);
            alert("Something went wrong while saving.");
        } finally {
            setLoading(false);
        }
    };

    // -------------------------------
    // RENDER
    // -------------------------------
    if (loading) {
        return <div className="loading-screen">Loading profile…</div>;
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
                    {/* LEFT SIDEBAR */}
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
                                </div>
                            </div>
                        </div>

                        {/* Availability */}
                        <div className="profile-card">
                            <div className="card-header">
                                <h3 className="card-title">Availability Status</h3>
                            </div>

                            <div className="availability-status">
                                <div className="status-toggle">

                                    <div
                                        className={`status-option ${availabilityStatus === "online" ? "selected" : ""}`}
                                        onClick={() => handleStatusChange("online")}
                                    >
                                        <div className="status-indicator status-online"></div>
                                        <span className="status-label">Accepting Tokens</span>
                                    </div>

                                    <div
                                        className={`status-option ${availabilityStatus === "paused" ? "selected" : ""}`}
                                        onClick={() => handleStatusChange("paused")}
                                    >
                                        <div className="status-indicator status-paused"></div>
                                        <span className="status-label">Paused</span>
                                    </div>

                                    <div
                                        className={`status-option ${availabilityStatus === "offline" ? "selected" : ""}`}
                                        onClick={() => handleStatusChange("offline")}
                                    >
                                        <div className="status-indicator status-offline"></div>
                                        <span className="status-label">Off Duty</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MAIN SECTION */}
                    <div className="profile-main">
                        {/* Personal Info */}
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
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input type="email" className="form-control" name="email" value={doctorData.email} onChange={handleInputChange} />
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
                                <label className="form-label">Bio / Specialization</label>
                                <textarea className="form-control" rows="4" name="bio" value={doctorData.bio} onChange={handleTextAreaChange}></textarea>
                            </div>
                        </div>

                        {/* Preferences */}
                        <div className="profile-card">
                            <div className="card-header">
                                <h3 className="card-title">Preferences</h3>
                            </div>

                            <div className="preferences-grid">
                                <ToggleSwitch id="walkins" label="Accept Walk-ins" checked={acceptWalkins} onChange={(e) => setAcceptWalkins(e.target.checked)} />
                                <ToggleSwitch id="telemedicine" label="Accept Telemedicine" checked={acceptTelemedicine} onChange={(e) => setAcceptTelemedicine(e.target.checked)} />

                                <div className="preference-item">
                                    <div className="preference-label">Gender Preference</div>
                                    <select className="form-control" value={genderPreference} onChange={(e) => setGenderPreference(e.target.value)}>
                                        <option value="any">Any</option>
                                        <option value="male">Male Patients</option>
                                        <option value="female">Female Patients</option>
                                    </select>
                                </div>

                                <div className="preference-item">
                                    <div className="preference-label">Max Patients Per Day</div>
                                    <input type="number" className="form-control" value={maxPatients} onChange={(e) => setMaxPatients(e.target.value)} />
                                </div>

                                <ToggleSwitch id="push" label="Push Notifications" checked={pushNotifications} onChange={(e) => setPushNotifications(e.target.checked)} />
                                <ToggleSwitch id="sms" label="SMS Notifications" checked={smsNotifications} onChange={(e) => setSmsNotifications(e.target.checked)} />
                                <ToggleSwitch id="cabin" label="Cabin Display" checked={cabinDisplay} onChange={(e) => setCabinDisplay(e.target.checked)} />
                                <ToggleSwitch id="auto-time" label="Auto Extend Time" checked={autoExtendTime} onChange={(e) => setAutoExtendTime(e.target.checked)} />
                            </div>
                        </div>

                        {/* Consult Time */}
                        <div className="profile-card">
                            <div className="card-header">
                                <h3 className="card-title">Consultation Time</h3>
                            </div>

                            <div className="consult-time-settings">

                                {/* AUTO MODE */}
                                <div
                                    className={`time-option ${consultTimeMode === "auto" ? "selected" : ""}`}
                                    onClick={() => setConsultTimeMode("auto")}
                                >
                                    <div>
                                        <div className="form-label">Auto Time</div>
                                        <div className="form-text">Based on doctor's past sessions</div>
                                    </div>
                                    <div className="time-input">
                                        <input type="text" value="14 min" disabled />
                                    </div>
                                </div>

                                {/* MANUAL MODE */}
                                <div
                                    className={`time-option ${consultTimeMode === "manual" ? "selected" : ""}`}
                                    onClick={() => setConsultTimeMode("manual")}
                                >
                                    <div>
                                        <div className="form-label">Set Manual</div>
                                    </div>

                                    <div className="time-input">
                                        <input
                                            type="number"
                                            min="5"
                                            max="60"
                                            value={manualConsultTime}
                                            onChange={(e) => setManualConsultTime(parseInt(e.target.value))}
                                            disabled={consultTimeMode !== "manual"}
                                        />
                                        <span>min</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
};

export default DoctorProfile;
