// src/components/Header.jsx
import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function DoctorHeader() {
  const [isMobileNavActive, setIsMobileNavActive] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const mobileNav = document.querySelector('.mobile-nav');
      const mobileMenu = document.querySelector('.mobile-menu');
      
      if (mobileNav && mobileMenu && !mobileNav.contains(event.target) && !mobileMenu.contains(event.target)) {
        setIsMobileNavActive(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleMobileNav = () => {
    setIsMobileNavActive(!isMobileNavActive);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsMobileNavActive(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <>
      <div className="top-bar">
        <div className="top-bar-content">
          <div className="top-bar-contact">
            <i className="fas fa-phone-alt"></i> National Helpline: 1075 | <i className="fas fa-envelope"></i> support@nationalhealth.gov
          </div>
          <div className="top-bar-links">
            <a href="#"><i className="fas fa-globe"></i> English</a>
            <a href="#"><i className="fas fa-question-circle"></i> Help</a>
          </div>
        </div>
      </div>

      <header>
        <div className="container">
          <nav className="navbar">
            <Link to="/doctor/dashboard" className="logo">
              <div className="emblem">
                <i className="fas fa-plus-circle"></i>
              </div>
              <div className="logo-text">
                <div className="logo-main">National Health Services</div>
                <div className="logo-sub">Government of India</div>
              </div>
            </Link>
            
            <ul className="nav-links">
              <li><NavLink to="doctor/queue" className={({ isActive }) => isActive ? 'active' : ''}>Queue Management</NavLink></li>
              <li><NavLink to="doctor/session" className={({ isActive }) => isActive ? 'active' : ''}>Live Session</NavLink></li>
              <li><NavLink to="doctor/profile" className={({ isActive }) => isActive ? 'active' : ''}>Profile</NavLink></li>
              <li><NavLink to="doctor/cabinet" className={({ isActive }) => isActive ? 'active' : ''}>Cabin Display</NavLink></li>
            </ul>
            
            <div className="auth-buttons">
              {isAuthenticated ? (
                <>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span>{user?.full_name || 'User'}</span>
                  </div>
                  <button className="btn btn-outline" onClick={handleLogout}>Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <button className="btn btn-outline">Login</button>
                  </Link>
                  <Link to="/signup">
                    <button className="btn btn-primary">Register</button>
                  </Link>
                </>
              )}
            </div>
            
            <div className="mobile-menu" onClick={toggleMobileNav}>
              <i className="fas fa-bars"></i>
            </div>
          </nav>
        </div>
        
       
      </header>
    </>
  );
}

export default DoctorHeader;