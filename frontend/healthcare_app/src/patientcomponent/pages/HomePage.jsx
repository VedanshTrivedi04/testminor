// src/pages/HomePage.jsx
import React, { useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const { user, isAuthenticated } = useAuth();
  const { departments, doctors, fetchDepartments, fetchDoctors, isLoading, error } = useData();
  const navigate = useNavigate();

  // Redirect only once if user has dashboard
  useEffect(() => {
    if (isAuthenticated && user?.dashboard_url) {
      navigate(user.dashboard_url, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch departments and doctors once after authentication
  useEffect(() => {
    if (isAuthenticated) {
      fetchDepartments();
      fetchDoctors();
    }
  }, [isAuthenticated, fetchDepartments, fetchDoctors]);

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="container hero-content">
          <div className="hero-text">
            <h1>Welcome to Our Hospital</h1>
            <p>Book appointments, consult doctors, and manage your health easily.</p>
            <div className="hero-buttons">
              <button className="hero-btn btn-primary" onClick={() => navigate('/appointment')}>Book Appointment</button>
              <button className="hero-btn btn-outline" onClick={() => navigate('/login')}>Login</button>
            </div>
          </div>
          <div className="hero-image">
            <div className="hero-img-placeholder">🏥</div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="section">
        <div className="container">
          <div className="section-title">
            <h2>Our Services</h2>
            <p>We provide a wide range of medical services for all your health needs.</p>
          </div>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">🩺</div>
              <h3>General Consultation</h3>
              <p>Consult with top specialists for all your general health concerns.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">💉</div>
              <h3>Vaccination</h3>
              <p>Stay protected with a wide range of vaccines for all age groups.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">🏥</div>
              <h3>Emergency Care</h3>
              <p>24/7 emergency services available for urgent medical needs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Announcements */}
      <section className="announcements">
        <div className="container announcement-container">
          <span className="announcement-label">Notice</span>
          <div className="announcement-text">
            <marquee>COVID-19 vaccination drive ongoing. Book your slot now!</marquee>
          </div>
        </div>
      </section>

      {/* Doctors Section */}
      <section className="doctors-section section">
        <div className="container">
          <div className="section-title">
            <h2>Our Doctors</h2>
            <p>Meet our experienced medical professionals.</p>
          </div>

          {isLoading ? (
            <div className="loading">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading doctors...</p>
            </div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : doctors.length > 0 ? (
            <div className="doctors-slider">
              {doctors.map((doc) => {
                // If API returns doctor.user.full_name, adjust here
                const name = doc.full_name || doc.user?.full_name || 'Doctor Name';
                const department = doc.department_name || doc.department?.name || 'General';

                return (
                  <div className="doctor-card" key={doc.id}>
                    <div className="doctor-img">👨‍⚕️</div>
                    <div className="doctor-info">
                      <h3>{name}</h3>
                      <div className="doctor-specialty">{department}</div>
                      <div className="doctor-rating">⭐ 4.5</div>
                      <div className="doctor-availability">
                        <span>Mon-Fri</span>
                        <span>10am - 6pm</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>No doctors found.</p>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="section">
        <div className="container">
          <div className="section-title">
            <h2>How It Works</h2>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Register</h3>
              <p>Create an account to access all our services.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Book Appointment</h3>
              <p>Choose your doctor and schedule an appointment easily.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Consult</h3>
              <p>Meet the doctor online or in-person and get the treatment.</p>
            </div>
          </div>
        </div>
      </section>

     
    </>
  );
};

export default HomePage;
