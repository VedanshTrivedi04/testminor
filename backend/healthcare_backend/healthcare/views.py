from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.db.models import Q, Count
from datetime import date, timedelta
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import (
    User, Doctor, Department, Appointment, MedicalRecord,
    FamilyMember, DoctorAvailability, Admin, QueueStatus
)
from .serializers import *
from .permissions import IsPatient, IsDoctor, IsAdmin, IsDoctorOrAdmin

# ==================== Authentication Views ====================
class AuthViewSet(viewsets.ViewSet):
    """Authentication endpoints"""
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def register(self, request):
        """Patient registration"""
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserProfileSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Registration successful'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def login(self, request):
        """User login with role-based response"""
        serializer = LoginSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            
            # Get role-specific dashboard URL
            dashboard_urls = {
                'patient': '/patient/dashboard',
                'doctor': '/doctor/dashboard',
                'admin': '/admin/dashboard'
            }
            return Response({
                'user': UserProfileSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'role': user.role,
                'dashboard_url': dashboard_urls.get(user.role),
                'message': f'Welcome {user.full_name}!'
            })
        return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)


# ==================== Patient Views ====================
class PatientViewSet(viewsets.GenericViewSet):
    """Patient-specific endpoints (not a full ModelViewSet)"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def get_queryset(self):
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Patient dashboard with overview"""
        user = request.user
        today = timezone.now().date()
        
        # Upcoming appointments
        upcoming = Appointment.objects.filter(
            patient=user,
            appointment_date__gte=today,
            status__in=['scheduled', 'confirmed']
        ).order_by('appointment_date', 'time_slot')[:5]
        
        # Recent medical records
        recent_records = MedicalRecord.objects.filter(
            patient=user
        ).order_by('-visit_date')[:3]
        
        # Statistics
        total_appointments = Appointment.objects.filter(patient=user).count()
        pending_appointments = upcoming.count()
        
        data = {
            'profile': UserProfileSerializer(user).data,
            'upcoming_appointments': AppointmentSerializer(upcoming, many=True).data,
            'recent_records': MedicalRecordSerializer(recent_records, many=True).data,
            'total_appointments': total_appointments,
            'pending_appointments': pending_appointments,
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Get patient profile"""
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['put', 'patch'])
    def update_profile(self, request):
        """Update patient profile"""
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==================== Doctor Views ====================
class DoctorViewSet(viewsets.ModelViewSet):
    """Doctor-specific endpoints"""
    serializer_class = DoctorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'doctor':
            # Doctor sees their own profile
            return Doctor.objects.filter(user=user)
        elif user.role == 'admin':
            # Admin sees all doctors
            return Doctor.objects.all()
        
        # Patients see only verified and available doctors
        return Doctor.objects.filter(is_verified=True, is_available=True)

    @action(detail=False, methods=['get'], permission_classes=[IsDoctor])
    def dashboard(self, request):
        """Doctor dashboard"""
        try:
            doctor = request.user.doctor_profile
        except Doctor.DoesNotExist:
             return Response({"error": "Doctor profile not found."}, status=status.HTTP_404_NOT_FOUND)

        today = timezone.now().date()
        
        # Today's appointments
        today_appointments = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=today
        ).order_by('queue_position')
        
        # Statistics
        total_patients = Appointment.objects.filter(
            doctor=doctor
        ).values('patient').distinct().count()
        completed_today = today_appointments.filter(status='completed').count()
        
        # Current queue status
        queue_status = QueueStatus.objects.filter(
            doctor=doctor,
            appointment_date=today
        ).first()
        
        data = {
            'profile': DoctorSerializer(doctor).data,
            'today_appointments': AppointmentSerializer(today_appointments, many=True).data,
            'total_patients': total_patients,
            'completed_today': completed_today,
            'current_queue': QueueStatusSerializer(queue_status).data if queue_status else None,
        }
        return Response(data)

    @action(detail=False, methods=['get'], permission_classes=[IsDoctor])
    def appointments(self, request):
        """Get doctor's appointments for a specific date"""
        doctor = request.user.doctor_profile
        appointment_date_str = request.query_params.get('date', timezone.now().date())
        
        appointments = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=appointment_date_str
        ).order_by('queue_position')
        
        serializer = AppointmentSerializer(appointments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsDoctor])
    def start_consultation(self, request, pk=None):
        """Start consultation for an appointment"""
        try:
            appointment = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)

        if appointment.doctor.user != request.user:
            return Response(
                {'error': 'Not authorized for this appointment'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        appointment.status = 'in_progress'
        appointment.consultation_started_at = timezone.now()
        appointment.save()
        
        # Update doctor's current token
        doctor = appointment.doctor
        doctor.current_token = appointment.token_number
        doctor.queue_status = 'busy'
        doctor.save()
        
        # Update queue status
        self._update_queue_status(doctor, appointment.appointment_date)
        
        # Broadcast update via WebSocket
        self._broadcast_queue_update(doctor.id)
        
        return Response(AppointmentSerializer(appointment).data)

    @action(detail=True, methods=['post'], permission_classes=[IsDoctor])
    def end_consultation(self, request, pk=None):
        """End consultation and optionally create medical record"""
        appointment = Appointment.objects.get(pk=pk)
        
        if appointment.doctor.user != request.user:
            return Response(
                {'error': 'Not authorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        appointment.status = 'completed'
        appointment.consultation_ended_at = timezone.now()
        appointment.prescription = request.data.get('prescription', '')
        appointment.notes = request.data.get('notes', '')
        appointment.save()
        
        # Create medical record if provided
        medical_data = request.data.get('medical_record')
        if medical_data:
            medical_data['patient'] = appointment.patient.id
            medical_data['doctor'] = appointment.doctor.id
            medical_data['appointment'] = appointment.id
            record_serializer = MedicalRecordSerializer(data=medical_data)
            if record_serializer.is_valid():
                record_serializer.save()
            else:
                # Log error but don't fail the consultation end
                print(f"Failed to create medical record: {record_serializer.errors}")
        
        # Update queue status
        self._update_queue_status(appointment.doctor, appointment.appointment_date)
        self._broadcast_queue_update(appointment.doctor.id)
        
        return Response(AppointmentSerializer(appointment).data)

    @action(detail=False, methods=['get', 'post'], permission_classes=[IsDoctor])
    def availability(self, request):
        """Get or update doctor availability"""
        doctor = request.user.doctor_profile
        
        if request.method == 'GET':
            availabilities = DoctorAvailability.objects.filter(doctor=doctor)
            serializer = DoctorAvailabilitySerializer(availabilities, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # This logic assumes updating/creating one slot at a time
            data = request.data
            data['doctor'] = doctor.id
            
            # Check if it exists
            slot = DoctorAvailability.objects.filter(doctor=doctor, day_of_week=data.get('day_of_week')).first()
            
            if slot:
                serializer = DoctorAvailabilitySerializer(slot, data=data)
            else:
                serializer = DoctorAvailabilitySerializer(data=data)
                
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _update_queue_status(self, doctor, appointment_date):
        """Internal helper to update queue status for a doctor"""
        queue_status, created = QueueStatus.objects.get_or_create(
            doctor=doctor,
            appointment_date=appointment_date
        )
        
        # Count completed appointments
        completed = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=appointment_date,
            status='completed'
        ).count()
        
        # Get current appointment
        current = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=appointment_date,
            status='in_progress'
        ).first()
        
        # Total appointments for the day
        total = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=appointment_date,
            status__in=['scheduled', 'confirmed', 'in_progress', 'completed']
        ).count()
        
        queue_status.current_token = current.token_number if current else ""
        queue_status.total_tokens = total
        queue_status.completed_tokens = completed
        queue_status.save()

    def _broadcast_queue_update(self, doctor_id):
        """Internal helper to broadcast queue update via WebSocket"""
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'queue_{doctor_id}',
            {
                'type': 'queue_update',
                'data': {'status': 'updated', 'message': 'Queue has been updated.'}
            }
        )


# ==================== Admin Views ====================
class AdminViewSet(viewsets.ViewSet):
    """Admin-specific endpoints"""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Admin dashboard with system statistics"""
        today = timezone.now().date()
        stats = {
            'total_users': User.objects.count(),
            'total_patients': User.objects.filter(role='patient').count(),
            'total_doctors': Doctor.objects.count(),
            'total_departments': Department.objects.filter(is_active=True).count(),
            'total_appointments': Appointment.objects.count(),
            'today_appointments': Appointment.objects.filter(appointment_date=today).count(),
            'pending_verifications': Doctor.objects.filter(is_verified=False).count(),
            'recent_registrations': UserProfileSerializer(
                User.objects.order_by('-created_at')[:5],
                many=True
            ).data,
        }
        return Response(stats)

    @action(detail=False, methods=['post'])
    def register_doctor(self, request):
        """Register a new doctor (Admin only)"""
        serializer = DoctorRegistrationSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            doctor = serializer.save()
            return Response(
                DoctorSerializer(doctor).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def verify_doctor(self, request, pk=None):
        """Verify a doctor"""
        try:
            doctor = Doctor.objects.get(pk=pk)
            doctor.is_verified = True
            doctor.save()
            return Response({'message': 'Doctor verified successfully'})
        except Doctor.DoesNotExist:
            return Response(
                {'error': 'Doctor not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def users(self, request):
        """List all users"""
        users = User.objects.all().order_by('-created_at')
        serializer = UserProfileSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def reports(self, request):
        """Generate system reports"""
        report_type = request.query_params.get('type', 'appointments')
        
        if report_type == 'appointments':
            # Appointment statistics
            total = Appointment.objects.count()
            by_status = Appointment.objects.values('status').annotate(count=Count('id'))
            by_department = Appointment.objects.values('department__name').annotate(count=Count('id'))
            return Response({
                'total_appointments': total,
                'by_status': list(by_status),
                'by_department': list(by_department)
            })
        elif report_type == 'doctors':
            # Doctor statistics
            doctors = Doctor.objects.annotate(
                appointment_count=Count('doctor_appointments')
            ).values('id', 'user__full_name', 'specialty', 'rating', 'appointment_count')
            return Response({'doctors': list(doctors)})
        
        return Response({'error': 'Invalid report type'}, status=status.HTTP_400_BAD_REQUEST)


# ==================== Appointment Views ====================
class AppointmentViewSet(viewsets.ModelViewSet):
    """Appointment management endpoints"""
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return Appointment.objects.filter(patient=user)
        elif user.role == 'doctor':
            return Appointment.objects.filter(doctor=user.doctor_profile)
        elif user.role == 'admin':
            return Appointment.objects.all()
        return Appointment.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return AppointmentCreateSerializer
        return AppointmentSerializer

    def perform_create(self, serializer):
        # Assign the patient from the request user
        appointment = serializer.save(patient=self.request.user)
        # Update queue status after saving
        self._update_queue_status(appointment.doctor, appointment.appointment_date)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an appointment"""
        appointment = self.get_object()
        if appointment.patient != request.user and request.user.role != 'admin':
            return Response(
                {'error': 'Not authorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        appointment.status = 'cancelled'
        appointment.save()
        
        # Update queue status
        self._update_queue_status(appointment.doctor, appointment.appointment_date)
        
        return Response({'message': 'Appointment cancelled successfully'})

    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        """Reschedule an appointment"""
        appointment = self.get_object()
        if appointment.patient != request.user:
            return Response(
                {'error': 'Not authorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        new_date = request.data.get('appointment_date')
        new_time = request.data.get('time_slot')
        
        if new_date and new_time:
            # TODO: Add validation here similar to AppointmentCreateSerializer
            appointment.appointment_date = new_date
            appointment.time_slot = new_time
            appointment.status = 'scheduled'
            appointment.save()
            return Response(AppointmentSerializer(appointment).data)
        
        return Response(
            {'error': 'Invalid date or time'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=['get'])
    def available_slots(self, request):
        """Get available time slots for a doctor on a specific date"""
        doctor_id = request.query_params.get('doctor_id')
        appointment_date_str = request.query_params.get('date')
        
        if not doctor_id or not appointment_date_str:
            return Response(
                {'error': 'doctor_id and date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            doctor = Doctor.objects.get(pk=doctor_id)
        except Doctor.DoesNotExist:
            return Response(
                {'error': 'Doctor not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            appointment_date = date.fromisoformat(appointment_date_str)
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get doctor's availability for the day of week
        day_name = appointment_date.strftime('%A').lower()
        availability = DoctorAvailability.objects.filter(
            doctor=doctor,
            day_of_week=day_name,
            is_available=True
        ).first()
        
        # If no availability configured, provide default times (9 AM - 5 PM)
        if not availability:
            start_time = timedelta(hours=9)
            end_time = timedelta(hours=17)
        else:
            start_time = timedelta(
                hours=availability.start_time.hour,
                minutes=availability.start_time.minute
            )
            end_time = timedelta(
                hours=availability.end_time.hour,
                minutes=availability.end_time.minute
            )
        
        # Get already booked appointments
        booked_slots = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=appointment_date,
            status__in=['scheduled', 'confirmed', 'in_progress']
        ).values_list('time_slot', flat=True)
        
        booked_times = set(
            timedelta(hours=t.hour, minutes=t.minute) 
            for t in booked_slots
        )
        
        # Generate available time slots (every 10 minutes for more flexibility)
        available_slots = []
        current = start_time
        
        while current < end_time:
            if current not in booked_times:
                hours = int(current.total_seconds() // 3600)
                minutes = int((current.total_seconds() % 3600) // 60)
                time_str = f"{hours:02d}:{minutes:02d}"
                
                # Convert to 12-hour format for display
                period = 'AM' if hours < 12 else 'PM'
                display_hours = hours if hours <= 12 else hours - 12
                if display_hours == 0:
                    display_hours = 12
                
                available_slots.append({
                    'value': time_str,  # 24-hour format for backend
                    'display': f"{display_hours}:{minutes:02d} {period}",  # 12-hour for display
                    'time': time_str,
                    'duration': '10 minutes'  # Each slot is 10 minutes
                })
            
            # Increment by 10 minutes for each slot
            current += timedelta(minutes=10)
        
        # Limit to max appointments
        if availability and availability.max_appointments:
            available_slots = available_slots[:availability.max_appointments]
        
        return Response({
            'doctor_id': doctor_id,
            'date': appointment_date_str,
            'available_slots': available_slots,
            'total_available': len(available_slots)
        })

    def _update_queue_status(self, doctor, appointment_date):
        """Helper to update queue status"""
        queue_status, created = QueueStatus.objects.get_or_create(
            doctor=doctor,
            appointment_date=appointment_date
        )
        total = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=appointment_date,
            status__in=['scheduled', 'confirmed', 'in_progress']
        ).count()
        queue_status.total_tokens = total
        queue_status.save()


# ==================== Department Views ====================
class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    """Department listing (Public)"""
    queryset = Department.objects.filter(is_active=True)
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.AllowAny]


# ==================== Medical Record Views ====================
class MedicalRecordViewSet(viewsets.ModelViewSet):
    """Medical record management"""
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return MedicalRecord.objects.filter(patient=user)
        elif user.role == 'doctor':
            return MedicalRecord.objects.filter(doctor=user.doctor_profile)
        elif user.role == 'admin':
            return MedicalRecord.objects.all()
        return MedicalRecord.objects.none()
    
    def perform_create(self, serializer):
        # This is typically done by a doctor
        if self.request.user.role == 'doctor':
             serializer.save(doctor=self.request.user.doctor_profile)
        else:
            # Handle case where patient or admin tries to create
            # This logic might need refinement based on requirements
             serializer.save()


# ==================== Family Member Views ====================
class FamilyMemberViewSet(viewsets.ModelViewSet):
    """Family member management"""
    serializer_class = FamilyMemberSerializer
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def get_queryset(self):
        return FamilyMember.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ==================== Queue Status Views ====================
class QueueStatusViewSet(viewsets.ReadOnlyModelViewSet):
    """Queue status for live updates"""
    serializer_class = QueueStatusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        doctor_id = self.request.query_params.get('doctor')
        appointment_date = self.request.query_params.get('date', timezone.now().date())
        
        queryset = QueueStatus.objects.filter(appointment_date=appointment_date)
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        return queryset