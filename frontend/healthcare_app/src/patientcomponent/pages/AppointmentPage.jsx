// src/components/Appointment.jsx
import React, { useState, useEffect, useMemo } from 'react';
import './Appointment.css';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const AppointmentPage = () => {
    const { doctors, departments, fetchDoctors, fetchDepartments, isLoading } = useData();
    const { user, isAuthenticated } = useAuth();

    // --- Auth State ---
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // --- Appointment State ---
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedPatient, setSelectedPatient] = useState('yourself'); // 'yourself' or 'someoneElse'
    const [selectedMethod, setSelectedMethod] = useState('disease'); // 'disease' or 'doctor'
    const [selectedDisease, setSelectedDisease] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [selectedDoctor, setSelectedDoctor] = useState(null); 
    const [selectedDate, setSelectedDate] = useState(null);
    const [assignedTime, setAssignedTime] = useState(null);
    const [token, setToken] = useState(null);
    const [showPopup, setShowPopup] = useState(false);
    const [isBooking, setIsBooking] = useState(false);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Form state for 'someoneElse'
    const [patientName, setPatientName] = useState('');
    const [patientAge, setPatientAge] = useState('');
    const [patientGender, setPatientGender] = useState('');
    const [patientAadhaar, setPatientAadhaar] = useState('');
    const [patientRelation, setPatientRelation] = useState('');

    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    // --- Fetch departments & doctors from backend on mount ---
    useEffect(() => {
        if (isAuthenticated && user) {
            setIsLoggedIn(true);
            setCurrentUser({
                id: user.id,
                name: user.full_name,
                email: user.email,
                phone: user.phone,
                aadhaar: user.aadhaar_number
            });
        }

        fetchDepartments();
        fetchDoctors();
    }, [isAuthenticated, user, fetchDepartments, fetchDoctors]);

    // --- Event handlers ---
    const handleSelectPatient = (patientType) => setSelectedPatient(patientType);

    const handleSelectBookingMethod = async (method) => {
        setSelectedMethod(method);
        setSelectedDisease(null);
        setSelectedDepartment(null);
        setSelectedDoctor(null);
        
        // If selecting "doctor" method, fetch all doctors
        if (method === 'doctor') {
            await fetchDoctors(); // Fetch all doctors without department filter
        }
    };

    const handleSelectDepartment = async (departmentId) => {
        setSelectedDepartment(departmentId);
        // Filter doctors by department
        const fetchedDoctors = await fetchDoctors(departmentId);
        // Auto-select first doctor for "disease" booking
        if (fetchedDoctors.length > 0) {
            setSelectedDoctor(fetchedDoctors[0]);
        }
    };

    const handleSelectDoctor = (doctorId) => {
        const doctor = doctors.find(d => d.id === doctorId);
        setSelectedDoctor(doctor);
    };

    // --- Authentication check ---
    if (!isAuthenticated) {
        return (
            <div className="appointment-section active">
                <div className="login-required active">
                <div className="login-icon">🔒</div>
                    <h2>Login Required</h2>
                    <p>Please login to book an appointment.</p>
                    <div className="login-actions">
                        <a href="/login" className="btn btn-primary">Go to Login</a>
                    </div>
                </div>
            </div>
        );
    }

    // Fetch available time slots from backend
    const fetchAvailableSlots = async (doctorId, date) => {
        if (!doctorId || !date) {
            setAvailableSlots([]);
            return;
        }

        setLoadingSlots(true);
        try {
            const dateStr = date.toISOString().split('T')[0];
            const response = await apiService.getAvailableSlots(doctorId, dateStr);
            setAvailableSlots(response.available_slots || []);
        } catch (error) {
            console.error('Failed to fetch available slots:', error);
            setAvailableSlots([]);
            alert('Unable to load available time slots. Please try again.');
        } finally {
            setLoadingSlots(false);
        }
    };

    const handleSelectDate = async (date) => {
        setSelectedDate(date);
        // Fetch available slots when date is selected
        if (selectedDoctor && selectedDoctor.id) {
            await fetchAvailableSlots(selectedDoctor.id, date);
        }
    };

    const handlePrevMonth = () => {
        const today = new Date();
        if (currentYear === today.getFullYear() && currentMonth === today.getMonth()) return;
        setCurrentMonth(prev => prev === 0 ? (setCurrentYear(y => y - 1), 11) : prev - 1);
    };

    const handleNextMonth = () => {
        setCurrentMonth(prev => prev === 11 ? (setCurrentYear(y => y + 1), 0) : prev + 1);
    };

    // --- Booking Steps ---
    const nextToStep2 = () => {
        if (selectedPatient === 'someoneElse') {
            if (!patientName || !patientAge || !patientGender || !patientAadhaar) {
                alert('Please fill all required patient details');
                return;
            }
            if (patientAadhaar.length !== 12 || !/^\d+$/.test(patientAadhaar)) {
                alert('Please enter a valid 12-digit Aadhaar number');
                return;
            }
        }
        setCurrentStep(2);
    };

    const nextToStep3 = () => {
        // Validation happens when leaving step 3, not entering it
        setCurrentStep(3);
    };

    const nextToStep4 = () => {
        // Validate that we have a doctor selected before moving to date selection
        if (!selectedDoctor) {
            alert('Please select a doctor or department');
            return;
        }
        // Date selection will happen in step 4, so no need to check here
        setCurrentStep(4);
    };

    // --- Confirm booking API ---
    const confirmBooking = async () => {
        if (!selectedDoctor || !selectedDate) {
            alert('Please complete all required fields');
            return;
        }

        // Get department from doctor or selected department
        let departmentId;
        // Try to get department from doctor first
        if (selectedDoctor.department) {
            // Check if it's an object with an id property, or if it's just the ID number
            departmentId = typeof selectedDoctor.department === 'object' ? selectedDoctor.department.id : selectedDoctor.department;
        }
        // If not found in doctor, use selected department
        if (!departmentId) {
            departmentId = selectedDepartment;
        }
        
        if (!departmentId) {
            alert('Department information is missing. Please ensure a department is selected.');
            return;
        }
        
        console.log('Department ID for booking:', departmentId);

        // Time slot is already in HH:MM format from backend, just add :00 for seconds
        const timeSlot = assignedTime ? `${assignedTime}:00` : null;

        const bookingData = {
            doctor: selectedDoctor.id,
            department: departmentId,
            appointment_date: selectedDate.toISOString().split('T')[0],
            time_slot: timeSlot,
            reason: 'Consultation', // You can make this editable if needed
            booking_type: selectedMethod, // 'disease' or 'doctor'
            is_for_self: selectedPatient === 'yourself',
            patient_relation: selectedPatient === 'someoneElse' ? patientRelation : '',
        };

        console.log('Booking data being sent:', bookingData);

        setIsBooking(true);
        try {
            const response = await apiService.createAppointment(bookingData);
            console.log('Booking response:', response);
            
            // Extract token number and appointment details from response
            const tokenNumber = response.token_number || response.token;
            const appointmentTime = response.time_slot || assignedTime;
            
            setToken(tokenNumber || `A-${Math.floor(1000 + Math.random() * 9000)}`);
            
            // Update assigned time with actual response time if available
            if (appointmentTime && appointmentTime !== assignedTime) {
                setAssignedTime(appointmentTime);
            }
            
            setShowPopup(true);
        } catch (error) {
            console.error('Failed to create appointment:', error);
            let errorMessage = 'Failed to create appointment. Please try again.';
            
            // Handle different error formats
            if (error.response) {
                const data = error.response.data;
                if (data.detail) {
                    errorMessage = data.detail;
                } else if (data.error) {
                    errorMessage = data.error;
                } else if (typeof data === 'string') {
                    errorMessage = data;
                } else if (Array.isArray(data)) {
                    errorMessage = data[0];
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            alert(errorMessage);
        } finally {
            setIsBooking(false);
        }
    };


    const closePopup = () => {
        setShowPopup(false);
        // Reset all state
        setCurrentStep(1);
        setSelectedPatient('yourself');
        setSelectedMethod('disease');
        setSelectedDisease(null);
        setSelectedDepartment(null);
        setSelectedDoctor(null);
        setSelectedDate(null);
        setAssignedTime(null);
        setAvailableSlots([]);
        setToken(null);
        setPatientName('');
        setPatientAge('');
        setPatientGender('');
        setPatientAadhaar('');
        setPatientRelation('');
        setCurrentMonth(new Date().getMonth());
        setCurrentYear(new Date().getFullYear());
    };

    // --- Calendar generation ---
    const calendarGrid = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const today = new Date(); today.setHours(0,0,0,0);

        const grid = [];
        ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(day => {
            grid.push(<div key={day} className="calendar-day">{day}</div>);
        });

        for (let i = 0; i < firstDay; i++) grid.push(<div key={`empty-${i}`} className="calendar-date"></div>);

        for (let i = 1; i <= daysInMonth; i++) {
            const cellDate = new Date(currentYear, currentMonth, i);
            const isPast = cellDate < today;
            const isActive = selectedDate?.toDateString() === cellDate.toDateString();

            grid.push(
                <div 
                    key={`date-${i}`} 
                    className={`calendar-date ${isPast ? 'disabled' : ''} ${isActive ? 'active' : ''}`}
                    onClick={() => !isPast && handleSelectDate(cellDate)}
                >
                    {i}
                </div>
            );
        }
        return grid;
    }, [currentMonth, currentYear, selectedDate]);

    // Summary variables with useMemo for optimization
    const summaryPatientName = useMemo(() => 
        selectedPatient === 'yourself' ? currentUser?.name : patientName, 
        [selectedPatient, currentUser, patientName]
    );
    
    const summaryDateTime = useMemo(() => {
        if (selectedDate && assignedTime) {
            const slot = availableSlots.find(s => s.value === assignedTime);
            return `${selectedDate.toDateString()} at ${slot?.display || assignedTime}`;
        }
        return '';
    }, [selectedDate, assignedTime, availableSlots]);
    
    const summaryDoctorName = useMemo(() => 
        selectedDoctor ? (selectedDoctor.full_name || selectedDoctor.user?.full_name || 'Dr. Unknown') : '',
        [selectedDoctor]
    );

    return (
        <div className="appointment-section active">
            {/* Step 1: Patient Selection */}
            <div className={`step-container ${currentStep === 1 ? 'active' : ''}`}>
                <h2 className="step-title">Select Patient</h2>
                <div className="patient-options">
                    <div className={`patient-option ${selectedPatient === 'yourself' ? 'active' : ''}`} onClick={() => handleSelectPatient('yourself')}>
                        <div className="patient-icon">👤</div>
                        <h3>Yourself</h3>
                        <p>Book an appointment for yourself</p>
                    </div>
                    <div className={`patient-option ${selectedPatient === 'someoneElse' ? 'active' : ''}`} onClick={() => handleSelectPatient('someoneElse')}>
                        <div className="patient-icon">🧑‍🤝‍🧑</div>
                        <h3>Someone Else</h3>
                        <p>Book for a family member or friend</p>
                    </div>
                </div>

                {selectedPatient === 'someoneElse' && (
                    <div className={`patient-details-form active`}>
                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <input className="form-control" value={patientName} onChange={e => setPatientName(e.target.value)} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Age</label>
                                <input className="form-control" value={patientAge} onChange={e => setPatientAge(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Gender</label>
                                <select className="select-control" value={patientGender} onChange={e => setPatientGender(e.target.value)}>
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Aadhaar Number</label>
                            <input className="form-control" value={patientAadhaar} onChange={e => setPatientAadhaar(e.target.value)} />
                        </div>
                    </div>
                )}

                <button className="btn btn-primary" onClick={nextToStep2}>Next</button>
            </div>

            {/* Step 2: Booking Method */}
            <div className={`step-container ${currentStep === 2 ? 'active' : ''}`}>
                <h2 className="step-title">Select Booking Method</h2>
                <div className="booking-methods">
                    <div className={`booking-method ${selectedMethod === 'disease' ? 'active' : ''}`} onClick={() => handleSelectBookingMethod('disease')}>
                        <div className="method-icon">💊</div>
                        <h3>By Disease</h3>
                        <p>Select the disease and get an auto-assigned doctor</p>
                    </div>
                    <div className={`booking-method ${selectedMethod === 'doctor' ? 'active' : ''}`} onClick={() => handleSelectBookingMethod('doctor')}>
                        <div className="method-icon">👨‍⚕️</div>
                        <h3>By Doctor</h3>
                        <p>Choose the doctor directly</p>
                    </div>
                </div>

                <button className="btn btn-primary" onClick={nextToStep3}>Next</button>
            </div>

            {/* Step 3: Select Department/Doctor */}
            <div className={`step-container ${currentStep === 3 ? 'active' : ''}`}>
                <h2 className="step-title">
                    {selectedMethod === 'disease' ? 'Select Department' : 'Select Doctor'}
                </h2>
                {isLoading ? <p>Loading...</p> : (
                    <>
                        {selectedMethod === 'disease' ? (
                            // Department selection
                            <div className="doctor-list">
                                {departments.map(dept => (
                                    <div 
                                        key={dept.id} 
                                        className={`doctor-list-item ${selectedDepartment === dept.id ? 'active' : ''}`} 
                                        onClick={() => handleSelectDepartment(dept.id)}
                                    >
                                        <div className="doctor-preview-img">🏥</div>
                                        <div className="doctor-preview-info">
                                            <div className="doctor-preview-name">{dept.name}</div>
                                            <div className="doctor-preview-specialty">{dept.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Doctor selection
                            <div className="doctor-list">
                                {doctors.map(doctor => (
                                    <div 
                                        key={doctor.id} 
                                        className={`doctor-list-item ${selectedDoctor?.id === doctor.id ? 'active' : ''}`} 
                                        onClick={() => handleSelectDoctor(doctor.id)}
                                    >
                                        <div className="doctor-preview-img">👨‍⚕️</div>
                                        <div className="doctor-preview-info">
                                            <div className="doctor-preview-name">{doctor.full_name || doctor.user?.full_name}</div>
                                            <div className="doctor-preview-specialty">{doctor.specialty}</div>
                                            <div className="doctor-preview-experience">{doctor.experience}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
                
                {/* Auto-assign doctor if department selected */}
                {selectedMethod === 'disease' && selectedDepartment && doctors.length > 0 && (
                    <div className="auto-assigned-doctor">
                        <p>Auto-assigned Doctor: {doctors[0].full_name || doctors[0].user?.full_name}</p>
                    </div>
                )}
                
                <button className="btn btn-primary" onClick={nextToStep4}>Next</button>
            </div>

            {/* Step 4: Select Date */}
            <div className={`step-container ${currentStep === 4 ? 'active' : ''}`}>
                <h2 className="step-title">Select Date</h2>
                
                {selectedDoctor && (
                    <div className="selected-doctor-info">
                        <p><strong>Doctor:</strong> {selectedDoctor.full_name || selectedDoctor.user?.full_name}</p>
                        <p><strong>Specialty:</strong> {selectedDoctor.specialty}</p>
                    </div>
                )}
                
                <div className="calendar">
                    <div className="calendar-header">
                        <button className="calendar-nav-btn" onClick={handlePrevMonth}>‹</button>
                        <div className="calendar-month">{monthNames[currentMonth]} {currentYear}</div>
                        <button className="calendar-nav-btn" onClick={handleNextMonth}>›</button>
                    </div>
                    <div className="calendar-grid">{calendarGrid}</div>
                </div>
                
                {selectedDate && (
                    <div className="selected-date-info">
                        <p><strong>Selected Date:</strong> {selectedDate.toDateString()}</p>
                    </div>
                )}

                {loadingSlots && (
                    <div className="loading-message">
                        <p>Loading available time slots...</p>
                    </div>
                )}

                {!loadingSlots && availableSlots.length > 0 && (
                    <div className="available-slots-container">
                        <h3>Select Time Slot (10 minutes each):</h3>
                        <div className="slot-info">
                            <p className="slot-info-text">
                                <i className="fas fa-info-circle"></i>
                                Only one appointment per time slot. Each slot is 10 minutes.
                            </p>
                        </div>
                        <div className="time-slots-grid">
                            {availableSlots.map((slot, index) => (
                                <div 
                                    key={index}
                                    className={`time-slot-option ${assignedTime === slot.value ? 'selected' : ''}`}
                                    onClick={() => setAssignedTime(slot.value)}
                                    title="10 minute consultation slot"
                                >
                                    {slot.display}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!loadingSlots && availableSlots.length === 0 && selectedDate && (
                    <div className="no-slots-message">
                        <p>No available time slots for this date. Please select another date.</p>
                    </div>
                )}
                
                <button className="btn btn-primary" onClick={confirmBooking} disabled={isBooking || !selectedDate || !assignedTime}>
                    {isBooking ? 'Booking...' : 'Confirm Booking'}
                </button>
            </div>

            {/* Confirmation Popup */}
            {showPopup && (
                <div className={`confirmation-popup active`}>
                    <div className="confirmation-content">
                        <div className="confirmation-icon">✔️</div>
                        <div className="confirmation-title">Appointment Confirmed!</div>
                        <div className="confirmation-details">
                            <div className="confirmation-item">
                                <div className="confirmation-label">Patient:</div>
                                <div className="confirmation-value">{summaryPatientName}</div>
                            </div>
                            <div className="confirmation-item">
                                <div className="confirmation-label">Doctor:</div>
                                <div className="confirmation-value">{summaryDoctorName}</div>
                            </div>
                            <div className="confirmation-item">
                                <div className="confirmation-label">Date & Time:</div>
                                <div className="confirmation-value">{summaryDateTime}</div>
                            </div>
                            <div className="token-number">{token}</div>
                        </div>
                        <div className="confirmation-actions">
                            <button className="btn btn-primary" onClick={closePopup}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default AppointmentPage;