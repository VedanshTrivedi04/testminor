# Healthcare System - Frontend-Backend Integration

This document describes the complete integration between the React frontend and Django backend for the healthcare management system.

## 🚀 Quick Start

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend/healthcare_backend
   ```

2. Activate virtual environment:
   ```bash
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. Create sample data:
   ```bash
   python create_sample_data.py
   ```

6. Start the backend server:
   ```bash
   python manage.py runserver
   ```
   The backend will be available at `http://localhost:8000`

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend/healthcare_app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`

## 🔧 Integration Features

### Authentication System
- **JWT Token-based Authentication**: Secure login/logout with token refresh
- **Role-based Access**: Patient, Doctor, Admin roles
- **Protected Routes**: Authentication required for appointment booking and profile access

### API Integration
- **RESTful API Service**: Complete API service layer with error handling
- **Automatic Token Refresh**: Seamless token management
- **Request/Response Interceptors**: Centralized error handling

### Patient Features
1. **User Registration & Login**
   - Multi-step registration process
   - Email/password authentication
   - Profile management

2. **Appointment Booking**
   - Department-based or doctor-based booking
   - Date and time selection
   - Real-time availability checking
   - Token generation

3. **Profile Management**
   - View and edit personal information
   - Appointment history
   - Medical records
   - Family member management

4. **Dashboard**
   - Upcoming appointments
   - Recent medical records
   - Quick statistics

### Data Management
- **Context-based State Management**: React Context for global state
- **Real-time Data Fetching**: Automatic data updates
- **Error Handling**: User-friendly error messages

## 📁 File Structure

### Frontend Integration Files
```
frontend/healthcare_app/src/
├── services/
│   └── api.js                 # API service layer
├── contexts/
│   ├── AuthContext.jsx        # Authentication context
│   └── DataContext.jsx        # Data management context
├── patientcomponent/
│   ├── pages/
│   │   ├── HomePage.jsx       # Integrated with departments/doctors
│   │   ├── LoginPage.jsx      # Connected to auth system
│   │   ├── SignUpPage.jsx     # Connected to registration
│   │   ├── AppointmentPage.jsx # Full booking integration
│   │   └── MyProfilePage.jsx  # Profile management
│   └── components/
│       └── Header.jsx         # Auth-aware navigation
└── App.jsx                    # Context providers setup
```

### Backend API Endpoints
```
/api/
├── auth/
│   ├── register/              # Patient registration
│   └── login/                 # User login
├── patient/
│   ├── dashboard/             # Patient dashboard data
│   ├── profile/               # Get/update profile
│   └── update_profile/        # Profile updates
├── departments/               # List departments
├── doctor/                    # List doctors
├── appointments/              # CRUD operations
├── medical-records/           # Medical history
├── family-members/            # Family management
└── queue-status/              # Live queue updates
```

## 🔐 Authentication Flow

1. **Registration**: User fills multi-step form → API call → JWT tokens stored
2. **Login**: Credentials → API validation → JWT tokens → User context updated
3. **Protected Routes**: Token validation → Access granted/denied
4. **Token Refresh**: Automatic refresh on API calls
5. **Logout**: Token blacklisting → Context cleared

## 📊 Data Flow

### HomePage
- Fetches departments and doctors on load
- Displays real-time data from backend
- Loading states and error handling

### Appointment Booking
1. User selects patient (self/family)
2. Chooses booking method (department/doctor)
3. Selects department and doctor
4. Picks date and time
5. Provides reason for visit
6. Reviews and confirms
7. Receives token number

### Profile Management
- Fetches user data, appointments, medical records
- Real-time updates on profile changes
- Appointment history with status tracking

## 🛠️ Technical Implementation

### API Service Layer
- Centralized HTTP client with JWT handling
- Automatic token refresh mechanism
- Error handling and user feedback
- Request/response interceptors

### State Management
- React Context for global state
- Local state for component-specific data
- Optimistic updates for better UX

### Error Handling
- Network error handling
- Authentication error handling
- User-friendly error messages
- Loading states throughout the app

## 🧪 Testing the Integration

### Sample Data
The `create_sample_data.py` script creates:
- 6 medical departments
- 4 sample doctors with different specialties
- 2 sample patients
- Doctor availability schedules
- Sample appointments

### Test Credentials
- **Admin**: admin@healthcare.gov / admin123
- **Patient**: patient1@example.com / patient123
- **Doctor**: dr.singh@healthcare.gov / doctor123

## 🚨 Important Notes

1. **CORS Configuration**: Backend allows all origins for development
2. **Database**: Uses MySQL with proper migrations
3. **JWT Tokens**: 60-minute access, 7-day refresh tokens
4. **Real-time Updates**: WebSocket support for queue status
5. **Security**: Password validation, token blacklisting

## 🔄 Development Workflow

1. Backend changes require server restart
2. Frontend changes hot-reload automatically
3. Database changes require migrations
4. New features should follow the established patterns

## 📝 Next Steps

1. Add more comprehensive error handling
2. Implement real-time queue updates
3. Add file upload for medical documents
4. Implement email notifications
5. Add more robust testing coverage
6. Implement caching for better performance

The integration is now complete and fully functional! 🎉

