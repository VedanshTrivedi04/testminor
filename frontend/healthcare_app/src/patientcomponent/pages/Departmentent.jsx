import React, { useState, useEffect } from 'react';

import "./main.css"
import "./dasboard.css"
import { useData } from '../../contexts/DataContext';

const Departmentent = () => {
  const {
    doctors,
    departments,
    fetchDoctors,
    fetchDepartments,
    isLoading,
    error,
  } = useData();

  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [queue, setQueue] = useState(null);
const [highlightToken, setHighlightToken] = useState(null);

useEffect(() => {
  const loadQueue = async () => {
    try {
      const doctorId = 1; // or dynamically load from patient appointment
      const result = await apiService.getQueueStatus(doctorId);

      setQueue(result);
      setHighlightToken(result.patient_token);
    } catch (err) {
      console.log("Queue fetch failed", err);
    }
  };

  loadQueue();
  const interval = setInterval(loadQueue, 3000);
  return () => clearInterval(interval);
}, []);


  // ✅ Fetch all departments and doctors once when component mounts
  useEffect(() => {
    fetchDepartments();
    fetchDoctors();
  }, [fetchDepartments, fetchDoctors]);

  // ✅ Handle department click
  const handleSelectDepartment = async (deptId) => {
    setSelectedDepartment(deptId);
    await fetchDoctors(deptId); // Fetch doctors by department
  };

  // ✅ Filter doctors for selected department
  useEffect(() => {
    if (selectedDepartment && doctors.length > 0) {
      const filtered = doctors.filter(
        (doc) =>
          doc.department === selectedDepartment ||
          doc.department?.id === selectedDepartment
      );
      setFilteredDoctors(filtered);
    } else {
      setFilteredDoctors(doctors);
    }
  }, [selectedDepartment, doctors]);

  return (
    <div className="department-section">
      <h2 className="section-heading">Departments</h2>

      {/* --- Department List --- */}
      {isLoading ? (
        <p className="loading-text">Loading departments...</p>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : (
        <div className="doctor-list">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className={`doctor-list-item ${
                selectedDepartment === dept.id ? 'active' : ''
              }`}
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
      )}

      {/* --- Doctor List for Selected Department --- */}
      {selectedDepartment && (
        <div className="doctor-section">
          <h3 className="section-subheading">Available Doctors</h3>

          {filteredDoctors.length === 0 ? (
            <p className="no-doctor-text">No doctors found in this department.</p>
          ) : (
            <div className="doctor-grid">
              {filteredDoctors.map((doc) => (
                <div className="doctor-card" key={doc.id}>
                  <div className="doctor-avatar">👨‍⚕️</div>
                  <div className="doctor-details">
                    <h4>{doc.full_name || doc.user?.full_name || 'Doctor'}</h4>
                    <p className="doctor-dept">
                      {doc.department_name || doc.department?.name || 'General'}
                    </p>
                    <p className="doctor-availability">Mon–Fri | 10am–6pm</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Departmentent;
