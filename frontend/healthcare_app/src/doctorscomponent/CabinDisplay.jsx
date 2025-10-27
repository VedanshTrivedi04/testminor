// src/components/CabinDisplay.jsx
import React, { useState, useRef } from 'react';
import './CabinDisplay.css';

// --- Data (moved from hardcoded HTML) ---
const quickMessages = [
    { icon: 'fas fa-coffee', text: 'Short Break', message: 'Doctor on short break — back at 3:15' },
    { icon: 'fas fa-directions', text: 'Change Waiting Area', message: 'Please wait in hall no. 2' },
    { icon: 'fas fa-first-aid', text: 'Emergency Delay', message: 'Doctor in emergency — please wait' },
    { icon: 'fas fa-tools', text: 'Technical Issue', message: 'Technical issue — please bear with us' }
];

const defaultUpcoming = [
    { token: 'A104', patient: 'Priya Patel', reason: 'Emergency' },
    { token: 'A105', patient: 'Anil Kumar', reason: 'VIP' },
    { token: 'A106', patient: 'Sneha Gupta', reason: 'Follow-up' }
];

const defaultNowServing = { token: 'A103', patient: 'Ravi Sharma' };

// --- React Component ---
const CabinDisplay = () => {
    // --- State Variables ---
    const [nowServing, setNowServing] = useState(defaultNowServing);
    const [upcomingTokens, setUpcomingTokens] = useState(defaultUpcoming);
    
    const [message, setMessage] = useState('');
    const [isMessageVisible, setIsMessageVisible] = useState(false);
    const [customMessage, setCustomMessage] = useState('');
    
    const [showFullNames, setShowFullNames] = useState(true);
    const [showTokens, setShowTokens] = useState(true);
    const [showUpcoming, setShowUpcoming] = useState(true);
    
    const [cabinStatus, setCabinStatus] = useState('normal'); // 'normal', 'paused', 'break'
    
    const [toast, setToast] = useState({ visible: false, message: '' });

    // --- Refs ---
    const previewRef = useRef(null); // For fullscreen functionality

    // --- Utility Functions ---

    // Shows a toast notification for 3 seconds
    const showToast = (message) => {
        setToast({ visible: true, message });
        setTimeout(() => {
            setToast({ visible: false, message: '' });
        }, 3000);
    };

    // Anonymizes a name (e.g., "Ravi Sharma" -> "R. Sharma")
    const anonymizeName = (fullName) => {
        const parts = fullName.split(' ');
        if (parts.length < 2) return `${parts[0][0]}.`;
        return `${parts[0][0]}. ${parts[parts.length - 1]}`;
    };

    // --- Event Handlers ---

    // Quick Messages
    const handleQuickMessage = (messageText) => {
        setMessage(messageText);
        setIsMessageVisible(true);
        showToast(`Message sent: "${messageText}"`);
    };

    const handleSendCustomMessage = () => {
        if (customMessage.trim()) {
            setMessage(customMessage.trim());
            setIsMessageVisible(true);
            showToast('Custom message sent');
            setCustomMessage('');
        }
    };

    const handleClearMessage = () => {
        setIsMessageVisible(false);
        showToast('Message cleared');
    };

    // Token Override
    const handleCallToken = (token, patient) => {
        setNowServing({ token, patient });
        showToast(`Token ${token} called. Patient ${patient} notified.`);
        // In a real app, you would also update the upcomingTokens state
    };

    // Privacy Toggles
    const handleToggleFullNames = (e) => {
        const isChecked = e.target.checked;
        setShowFullNames(isChecked);
        showToast(`Patient names ${isChecked ? 'shown' : 'hidden'}`);
    };

    const handleToggleTokens = (e) => {
        const isChecked = e.target.checked;
        setShowTokens(isChecked);
        showToast(`Token numbers ${isChecked ? 'shown' : 'hidden'}`);
    };

    const handleToggleUpcoming = (e) => {
        const isChecked = e.target.checked;
        setShowUpcoming(isChecked);
        showToast(`Upcoming tokens ${isChecked ? 'shown' : 'hidden'}`);
    };

    // Cabin Status
    const handleSetStatus = (status, label, statusMessage) => {
        setCabinStatus(status);
        showToast(`Cabin status set to: ${label}`);
        
        if (status !== 'normal') {
            setMessage(statusMessage);
            setIsMessageVisible(true);
        } else {
            setIsMessageVisible(false);
        }
    };

    // Consultation Controls
    const handleStartConsultation = () => {
        showToast('Consultation started. Cabin display updated.');
        // Add real logic here
    };

    const handleCompleteConsultation = () => {
        showToast('Consultation completed. Next patient called.');
        // Add real logic here (e.g., update nowServing to first in upcoming)
    };

    // Preview Actions
    const handleRefresh = () => {
        showToast('Cabin display preview refreshed');
        // Add real logic here (e.g., fetch data)
    };

    const handleFullscreen = () => {
        if (previewRef.current) {
            previewRef.current.requestFullscreen()
                .then(() => showToast('Preview in fullscreen mode'))
                .catch(err => showToast('Could not enter fullscreen'));
        }
    };

    const handleReset = () => {
        setNowServing(defaultNowServing);
        setUpcomingTokens(defaultUpcoming);
        setIsMessageVisible(false);
        setShowFullNames(true);
        setShowTokens(true);
        setShowUpcoming(true);
        setCabinStatus('normal');
        showToast('Cabin display reset to default');
    };

    // --- Render Logic ---
    const getPatientName = (fullName) => {
        return showFullNames ? fullName : anonymizeName(fullName);
    };

    return (
        <>
         
           

            {/* Main Content */}
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
                    {/* Cabin Preview */}
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
                                <div className="cabin-doctor-name">Dr. Rajesh Kumar</div>
                                <div className="cabin-doctor-specialty">Senior Cardiologist</div>
                            </div>
                            
                            <div className="cabin-status">
                                <div className="now-serving-label">NOW SERVING</div>
                                {showTokens && <div className="now-serving-token">{nowServing.token}</div>}
                                <div className="now-serving-patient">{getPatientName(nowServing.patient)}</div>
                            </div>
                            
                            {/* Conditional Message */}
                            <div className={`cabin-message ${isMessageVisible ? 'show' : ''}`}>
                                {message}
                            </div>
                            
                            {/* Conditional Upcoming Tokens */}
                            {showUpcoming && (
                                <div className="cabin-upcoming">
                                    <div className="upcoming-label">COMING UP NEXT</div>
                                    <div className="upcoming-tokens">
                                        {upcomingTokens.map(t => (
                                            <div className="upcoming-token" key={t.token}>
                                                {showTokens && <div className="token-number">{t.token}</div>}
                                                <div className="token-patient">{getPatientName(t.patient)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controls Panel */}
                    <div className="controls-panel">
                        {/* Quick Messages */}
                        <div className="control-card">
                            <div className="card-header">
                                <h3 className="card-title">Quick Messages</h3>
                            </div>
                            <div className="quick-messages">
                                {quickMessages.map(msg => (
                                    <button 
                                        key={msg.text} 
                                        className="message-btn" 
                                        data-message={msg.message}
                                        onClick={() => handleQuickMessage(msg.message)}
                                    >
                                        <i className={msg.icon}></i> {msg.text}
                                    </button>
                                ))}
                            </div>
                            <div className="custom-message">
                                <input 
                                    type="text" 
                                    className="message-input" 
                                    placeholder="Type custom message..."
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                />
                                <div className="message-actions">
                                    <button className="btn btn-primary btn-sm" onClick={handleSendCustomMessage}>
                                        <i className="fas fa-paper-plane"></i> Send
                                    </button>
                                    <button className="btn btn-outline btn-sm" onClick={handleClearMessage}>
                                        <i className="fas fa-times"></i> Clear
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Token Override */}
                        <div className="control-card">
                            <div className="card-header">
                                <h3 className="card-title">Override Now Serving</h3>
                            </div>
                            <div className="token-override">
                                <div className="override-info">
                                    <i className="fas fa-exclamation-triangle"></i>
                                    <span>This will skip current token and notify the selected patient</span>
                                </div>
                                <div className="token-select">
                                    {upcomingTokens.map(t => (
                                        <div className="token-option" key={t.token}>
                                            <div className="token-details">
                                                <div className="token-id">Token {t.token}</div>
                                                <div className="token-patient-name">{t.patient} • {t.reason}</div>
                                            </div>
                                            <button 
                                                className="btn btn-primary btn-sm call-token-btn"
                                                onClick={() => handleCallToken(t.token, t.patient)}
                                            >
                                                <i className="fas fa-bullhorn"></i> Call
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Privacy Controls */}
                        <div className="control-card">
                            <div className="card-header">
                                <h3 className="card-title">Privacy Controls</h3>
                            </div>
                            <div className="privacy-controls">
                                <div className="privacy-option">
                                    <div className="privacy-label">Show Patient Full Names</div>
                                    <label className="toggle-switch">
                                        <input 
                                            type="checkbox" 
                                            checked={showFullNames}
                                            onChange={handleToggleFullNames}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="privacy-option">
                                    <div className="privacy-label">Show Token Numbers</div>
                                    <label className="toggle-switch">
                                        <input 
                                            type="checkbox" 
                                            checked={showTokens}
                                            onChange={handleToggleTokens}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="privacy-option">
                                    <div className="privacy-label">Show Upcoming Tokens</div>
                                    <label className="toggle-switch">
                                        <input 
                                            type="checkbox" 
                                            checked={showUpcoming}
                                            onChange={handleToggleUpcoming}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Status Controls */}
                        <div className="control-card">
                            <div className="card-header">
                                <h3 className="card-title">Cabin Status</h3>
                            </div>
                            <div className="status-controls">
                                <div className="status-options">
                                    <button 
                                        className={`status-btn ${cabinStatus === 'normal' ? 'active' : ''}`}
                                        onClick={() => handleSetStatus('normal', 'Normal', 'Normal operation resumed')}
                                    >
                                        <i className="fas fa-check status-icon"></i>
                                        <span className="status-label">Normal</span>
                                    </button>
                                    <button 
                                        className={`status-btn ${cabinStatus === 'paused' ? 'active' : ''}`}
                                        onClick={() => handleSetStatus('paused', 'Paused', 'Consultation paused')}
                                    >
                                        <i className="fas fa-pause status-icon"></i>
                                        <span className="status-label">Paused</span>
                                    </button>
                                    <button 
                                        className={`status-btn ${cabinStatus === 'break' ? 'active' : ''}`}
                                        onClick={() => handleSetStatus('break', 'On Break', 'Doctor on break')}
                                    >
                                        <i className="fas fa-coffee status-icon"></i>
                                        <span className="status-label">On Break</span>
                                    </button>
                                </div>
                                <div className="message-actions">
                                    <button className="btn btn-secondary btn-sm" onClick={handleStartConsultation}>
                                        <i className="fas fa-play"></i> Start Consultation
                                    </button>
                                    <button className="btn btn-outline btn-sm" onClick={handleCompleteConsultation}>
                                        <i className="fas fa-check"></i> Complete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Toast */}
            <div className={`toast ${toast.visible ? 'show' : ''}`}>
                <i className="fas fa-check-circle"></i>
                <span>{toast.message}</span>
            </div>
        </>
    );
};

export default CabinDisplay;