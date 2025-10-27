// src/pages/SignUpPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './login_signup.css';

const SignUpPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    aadhaar_number: '',
    blood_group: '',
    address: '',
    password: '',
    password2: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  // OTP timer
  useEffect(() => {
    let timer;
    if (otpSent && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    } else if (countdown === 0) {
      setIsResendDisabled(false);
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [otpSent, countdown]);

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSendOtp = () => {
    if (!formData.phone) {
      setAlert({ type: 'error', message: 'Please enter mobile number first' });
      return;
    }
    setOtpSent(true);
    setIsResendDisabled(true);
    setCountdown(120);
    setAlert({ type: 'success', message: 'OTP sent to your mobile number' });
    // TODO: Integrate real backend OTP API
  };

  const handleVerifyOtp = () => {
    // TODO: Integrate real OTP verification backend API
    setStep(2);
    setAlert({ type: 'success', message: 'OTP verified successfully' });
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.password2) {
      setAlert({ type: 'error', message: "Passwords don't match" });
      return;
    }

    // Payload exactly matches serializer and backend response format
    const payload = {
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone,
      gender: formData.gender,
      date_of_birth: formData.date_of_birth || null,
      aadhaar_number: formData.aadhaar_number || '',
      blood_group: formData.blood_group || '',
      address: formData.address || '',
      password: formData.password,
      password2: formData.password2,
    };

    try {
      setLoading(true);
      const response = await fetch(
        'http://127.0.0.1:8000/api/auth/register/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();

      if (response.ok) {
        setAlert({
          type: 'success',
          message:
            'Account created successfully! Redirecting to login...',
        });
        setTimeout(() => navigate('/login'), 1500);
      } else {
        let errorMessage = data?.detail || '';
        if (!errorMessage && typeof data === 'object') {
          errorMessage = Object.values(data)
            .flat()
            .join(' ');
        }
        setAlert({ type: 'error', message: errorMessage || 'Registration failed' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Network error. Please try again.' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="signup-section">
      <div className="signup-container">
        <div className="signup-header">
          <h1>Create Patient Account</h1>
          <p>Register to access healthcare services</p>
        </div>

        {alert.message && (
          <div
            className={`alert ${
              alert.type === 'success' ? 'alert-success' : 'alert-error'
            }`}
          >
            {alert.message}
          </div>
        )}

        <div className="progress-steps">
          <div className={`step ${step === 1 ? 'active' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Contact Verification</div>
          </div>
          <div className={`step ${step === 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Account Creation</div>
          </div>
        </div>

        <form onSubmit={handleCreateAccount}>
          {/* Step 1: Contact Verification */}
          {step === 1 && (
            <div id="step1Form">
              <div className="form-group">
                <label htmlFor="full_name">Full Name *</label>
                <input
                  type="text"
                  name="full_name"
                  className="form-control"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="gender">Gender *</label>
                <select
                  name="gender"
                  className="select-control"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="phone">Mobile Number *</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-control"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-row">
                <button
                  type="button"
                  className="btn btn-primary btn-otp"
                  onClick={handleSendOtp}
                  disabled={isResendDisabled}
                >
                  {isResendDisabled
                    ? `Resend in ${formatTime(countdown)}`
                    : 'Send OTP'}
                </button>
              </div>

              {otpSent && (
                <div className="otp-section">
                  <div className="form-group">
                    <label htmlFor="otp">Enter OTP *</label>
                    <input
                      type="text"
                      name="otp"
                      className="form-control"
                      maxLength="6"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleVerifyOtp}
                  >
                    Verify OTP
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Account Creation */}
          {step === 2 && (
            <div id="step2Form">
              <div className="form-group">
                <label htmlFor="date_of_birth">Date of Birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  className="form-control"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="aadhaar_number">Aadhaar Number</label>
                <input
                  type="text"
                  name="aadhaar_number"
                  className="form-control"
                  value={formData.aadhaar_number}
                  onChange={handleChange}
                  maxLength="12"
                />
              </div>

              <div className="form-group">
                <label htmlFor="blood_group">Blood Group</label>
                <input
                  type="text"
                  name="blood_group"
                  className="form-control"
                  value={formData.blood_group}
                  onChange={handleChange}
                  maxLength="3"
                  placeholder="e.g., A+"
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">Address</label>
                <textarea
                  name="address"
                  className="form-control"
                  value={formData.address}
                  onChange={handleChange}
                  rows="2"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <div className="password-toggle">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="form-control"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password2">Confirm Password *</label>
                <div className="password-toggle">
                  <input
                    type={showPassword2 ? 'text' : 'password'}
                    name="password2"
                    className="form-control"
                    value={formData.password2}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword2(!showPassword2)}
                  />
                </div>
              </div>

              <div className="checkbox-group">
                <input type="checkbox" id="terms" required />
                <label htmlFor="terms">
                  I agree to the <a href="#">Terms of Service</a> and{' '}
                  <a href="#">Privacy Policy</a>
                </label>
              </div>

              <div className="form-row">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="login-link">
          Already have an account? <Link to="/login">Log in here</Link>
        </div>
      </div>
    </section>
  );
};

export default SignUpPage;
