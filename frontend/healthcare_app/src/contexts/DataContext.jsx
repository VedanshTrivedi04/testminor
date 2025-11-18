// src/contexts/DataContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  // ✅ Fetch Departments (works for all users)
  const fetchDepartments = useCallback(async () => {
    try {
      setIsLoading(true);
      let data = await apiService.getDepartments();

      console.log('Raw departments API response:', data);

      // Normalize response if backend wraps in 'results'
      if (data && data.results) {
        data = data.results;
      }

      if (!Array.isArray(data)) {
        console.warn('Departments API did not return an array:', data);
        data = [];
      }

      setDepartments(data);
      setError(null);
      return data;
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      setError('Failed to load departments');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ✅ Fetch Doctors (public if unauthenticated)
  const fetchDoctors = useCallback(async (departmentId = null) => {
    try {
      setIsLoading(true);
      let data;

      if (departmentId) {
        data = await apiService.getDoctorsByDepartment(departmentId);
      } else {
        // ✅ If not authenticated, use a public endpoint
        if (isAuthenticated) {
          data = await apiService.getDoctors();
        } else {
          data = await apiService.request('/doctor/'); // public GET
        }
      }

      console.log('Raw doctors API response:', data);

      if (data && data.results) {
        data = data.results;
      }

      if (!Array.isArray(data)) {
        console.warn('Doctors API did not return an array:', data);
        data = [];
      }

      setDoctors(data);
      setError(null);
      return data;
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
      setError('Failed to load doctors');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  return (
    <DataContext.Provider
      value={{
        departments,
        doctors,
        isLoading,
        error,
        fetchDepartments,
        fetchDoctors,
        setError,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
