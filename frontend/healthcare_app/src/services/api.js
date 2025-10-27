// src/services/api.js

const API_BASE_URL = 'http://127.0.0.1:8000/api'; // ✅ use 127.0.0.1 for stability

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('access_token');
  }

  // ======================
  // 🔐 TOKEN MANAGEMENT
  // ======================
  setToken(token) {
    this.token = token;
    localStorage.setItem('access_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // ======================
  // 🧾 HEADERS
  // ======================
  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return headers;
  }

  // ======================
  // 🌐 GENERIC REQUEST HANDLER
  // ======================
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // --- Unauthorized Handling ---
      if (response.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          config.headers['Authorization'] = `Bearer ${this.token}`;
          const retryResponse = await fetch(url, config);
          if (!retryResponse.ok) throw new Error(`HTTP ${retryResponse.status}`);
          return await retryResponse.json();
        } else {
          this.clearToken();
          throw new Error('Unauthorized');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
        const error = new Error(errorData.detail || `HTTP ${response.status}`);
        error.response = { data: errorData, status: response.status };
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // ======================
  // 🧩 SAFE REQUEST (AUTO TOKEN CHECK)
  // ======================
  async safeRequest(endpoint, options = {}) {
    if (!this.token) {
      const refreshed = await this.refreshToken();
      if (!refreshed) throw new Error('Not authenticated');
    }
    return this.request(endpoint, options);
  }

  // ======================
  // 🔁 TOKEN REFRESH
  // ======================
  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setToken(data.access);
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
        return true;
      } else {
        this.clearToken();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearToken();
      return false;
    }
  }

  // ======================
  // 👤 AUTH ENDPOINTS
  // ======================
  async register(userData) {
    return this.request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    const response = await this.request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (response.access) {
      this.setToken(response.access);
      localStorage.setItem('refresh_token', response.refresh);
    }
    return response;
  }

  async logout() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await fetch(`${this.baseURL}/token/blacklist/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    this.clearToken();
  }

  // ======================
  // 🧍 PATIENT ENDPOINTS
  // ======================
  async getPatientProfile() {
    return this.safeRequest('/patient/profile/');
  }

  async updatePatientProfile(data) {
    return this.safeRequest('/patient/update_profile/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getPatientDashboard() {
    return this.safeRequest('/patient/dashboard/');
  }

  async getMedicalHistory() {
    return this.safeRequest('/patient/medical_history/');
  }

  async getPatientAppointments() {
    return this.safeRequest('/patient/appointments/');
  }

  // ======================
  // 🏥 DEPARTMENT ENDPOINTS
  // ======================
  async getDepartments() {
    return this.request('/departments/');
  }

  // ======================
  // 🩺 DOCTOR ENDPOINTS
  // ======================
  async getDoctors() {
    return this.safeRequest('/doctor/');
  }

  async getDoctorsByDepartment(departmentId) {
    return this.safeRequest(`/doctor/?department=${departmentId}`);
  }

  async getDoctorDetail(doctorId) {
    return this.safeRequest(`/doctor/${doctorId}/`);
  }

  async getDoctorAppointments() {
    return this.safeRequest('/doctor/appointments/');
  }

  async getDoctorQueue() {
    return this.safeRequest('/doctor/queue/');
  }

  // ======================
  // 📅 APPOINTMENT ENDPOINTS
  // ======================
  async getAppointments() {
    return this.safeRequest('/appointments/');
  }

  async createAppointment(data) {
    return this.safeRequest('/appointments/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAppointment(appointmentId) {
    return this.safeRequest(`/appointments/${appointmentId}/`);
  }

  async cancelAppointment(appointmentId) {
    return this.safeRequest(`/appointments/${appointmentId}/cancel/`, {
      method: 'POST',
    });
  }

  async completeAppointment(appointmentId) {
    return this.safeRequest(`/appointments/${appointmentId}/complete/`, {
      method: 'POST',
    });
  }

  async updateAppointmentStatus(appointmentId, status) {
    return this.safeRequest(`/appointments/${appointmentId}/status/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getAvailableSlots(doctorId, date) {
    return this.request(`/appointments/available_slots/?doctor_id=${doctorId}&date=${date}`);
  }

  // ======================
  // 📚 MEDICAL RECORDS
  // ======================
  async getMedicalRecords() {
    return this.safeRequest('/medical-records/');
  }

  async getMedicalRecord(recordId) {
    return this.safeRequest(`/medical-records/${recordId}/`);
  }

  // ======================
  // 👨‍👩‍👧 FAMILY MEMBERS
  // ======================
  async getFamilyMembers() {
    return this.safeRequest('/family-members/');
  }

  // ======================
  // 🕒 QUEUE MANAGEMENT (DOCTOR SIDE)
  // ======================
  async getQueue() {
    return this.safeRequest('/queue/');
  }

  async startConsultation(appointmentId) {
    return this.safeRequest(`/queue/start/${appointmentId}/`, {
      method: 'POST',
    });
  }

  async finishConsultation(appointmentId) {
    return this.safeRequest(`/queue/finish/${appointmentId}/`, {
      method: 'POST',
    });
  }

  async skipConsultation(appointmentId) {
    return this.safeRequest(`/queue/skip/${appointmentId}/`, {
      method: 'POST',
    });
  }

  // ======================
  // ⚙️ (OPTIONAL) ADMIN ENDPOINTS
  // ======================
  async getAllPatients() {
    return this.safeRequest('/admin/patients/');
  }

  async getAllAppointments() {
    return this.safeRequest('/admin/appointments/');
  }

  async getAllDoctors() {
    return this.safeRequest('/admin/doctors/');
  }
}

const apiService = new ApiService();
export default apiService;
