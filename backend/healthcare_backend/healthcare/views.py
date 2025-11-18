from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.db.models import Q, Count
from datetime import datetime, timedelta, date, time

from channels.layers import get_channel_layer
from datetime import time

from asgiref.sync import async_to_sync
from .models import (
    User, Doctor, Department, Appointment, MedicalRecord,
    FamilyMember, DoctorAvailability, Admin, QueueStatus
)
from .serializers import *
from .permissions import IsPatient, IsDoctor, IsAdmin, IsDoctorOrAdmin


# ==================== Authentication Views ====================
class AuthViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def register(self, request):
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
        serializer = LoginSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
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
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def get_queryset(self):
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        user = request.user
        today = timezone.now().date()

        upcoming = Appointment.objects.filter(
            patient=user,
            appointment_date__gte=today,
            status__in=['scheduled', 'confirmed']
        ).order_by('appointment_date', 'time_slot')[:5]

        recent_records = MedicalRecord.objects.filter(
            patient=user
        ).order_by('-visit_date')[:3]

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
        return Response(UserProfileSerializer(request.user).data)

    @action(detail=False, methods=['patch', 'put'])
    def update_profile(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==================== Doctor Views ====================
class DoctorViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'doctor':
            return Doctor.objects.filter(user=user)
        elif user.role == 'admin':
            return Doctor.objects.all()
        return Doctor.objects.filter(is_verified=True, is_available=True)

    @action(detail=False, methods=['get'], permission_classes=[IsDoctor])
    def dashboard(self, request):
        try:
            doctor = request.user.doctor_profile
        except Doctor.DoesNotExist:
            return Response({"error": "Doctor profile not found."}, status=404)

        today = timezone.now().date()

        today_appointments = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=today
        ).order_by('queue_position')

        total_patients = Appointment.objects.filter(
            doctor=doctor
        ).values('patient').distinct().count()

        completed_today = today_appointments.filter(status='completed').count()

        queue_status = QueueStatus.objects.filter(
            doctor=doctor,
            appointment_date=today
        ).first()

        return Response({
            'profile': DoctorSerializer(doctor).data,
            'today_appointments': AppointmentSerializer(today_appointments, many=True).data,
            'total_patients': total_patients,
            'completed_today': completed_today,
            'current_queue': QueueStatusSerializer(queue_status).data if queue_status else None,
        })

    @action(detail=False, methods=['get'], permission_classes=[IsDoctor])
    def appointments(self, request):
        doctor = request.user.doctor_profile
        date_param = request.query_params.get('date', timezone.now().date())

        appointments = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=date_param
        ).order_by('queue_position')

        return Response(AppointmentSerializer(appointments, many=True).data)

    # availability unchanged
    @action(detail=False, methods=['get', 'post'], permission_classes=[IsDoctor])
    def availability(self, request):
        doctor = request.user.doctor_profile

        if request.method == 'GET':
            availabilities = DoctorAvailability.objects.filter(doctor=doctor)
            return Response(DoctorAvailabilitySerializer(availabilities, many=True).data)

        data = request.data
        data['doctor'] = doctor.id
        slot = DoctorAvailability.objects.filter(
            doctor=doctor,
            day_of_week=data.get('day_of_week')
        ).first()

        serializer = DoctorAvailabilitySerializer(slot, data=data) if slot else DoctorAvailabilitySerializer(data=data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    # helper functions
    def _update_queue_status(self, doctor, appointment_date):
        queue_status, created = QueueStatus.objects.get_or_create(
            doctor=doctor,
            appointment_date=appointment_date
        )

        completed = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=appointment_date,
            status='completed'
        ).count()

        current = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=appointment_date,
            status='in_progress'
        ).first()

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
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'queue_{doctor_id}',
            {
                'type': 'queue_update',
                'data': {'status': 'updated', 'message': 'Queue updated'}
            }
        )


# ==================== Admin Views ====================
class AdminViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
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
        serializer = DoctorRegistrationSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            doctor = serializer.save()
            return Response(DoctorSerializer(doctor).data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=True, methods=['post'])
    def verify_doctor(self, request, pk=None):
        try:
            doctor = Doctor.objects.get(pk=pk)
            doctor.is_verified = True
            doctor.save()
            return Response({'message': 'Doctor verified successfully'})
        except Doctor.DoesNotExist:
            return Response({'error': 'Doctor not found'}, status=404)

    @action(detail=False, methods=['get'])
    def users(self, request):
        return Response(UserProfileSerializer(User.objects.all().order_by('-created_at'), many=True).data)

    @action(detail=False, methods=['get'])
    def reports(self, request):
        report_type = request.query_params.get('type', 'appointments')

        if report_type == 'appointments':
            total = Appointment.objects.count()
            by_status = list(Appointment.objects.values('status').annotate(count=Count('id')))
            by_department = list(Appointment.objects.values('department__name').annotate(count=Count('id')))
            return Response({
                'total_appointments': total,
                'by_status': by_status,
                'by_department': by_department
            })

        elif report_type == 'doctors':
            doctors = Doctor.objects.annotate(
                appointment_count=Count('doctor_appointments')
            ).values(
                'id', 'user__full_name', 'specialty', 'rating', 'appointment_count'
            )
            return Response({'doctors': list(doctors)})

        return Response({'error': 'Invalid report type'}, status=400)


# ==================== Appointment Views ====================
class AppointmentViewSet(viewsets.ModelViewSet):
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
        return AppointmentCreateSerializer if self.action == 'create' else AppointmentSerializer

    def perform_create(self, serializer):
        appointment = serializer.save(patient=self.request.user)
        self._update_queue_status(appointment.doctor, appointment.appointment_date)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        if appointment.patient != request.user and request.user.role != 'admin':
            return Response({'error': 'Not authorized'}, status=403)

        appointment.status = 'cancelled'
        appointment.save()
        self._update_queue_status(appointment.doctor, appointment.appointment_date)
        return Response({'message': 'Appointment cancelled successfully'})

    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        appointment = self.get_object()
        if appointment.patient != request.user:
            return Response({'error': 'Not authorized'}, status=403)

        new_date = request.data.get('appointment_date')
        new_time = request.data.get('time_slot')

        if new_date and new_time:
            appointment.appointment_date = new_date
            appointment.time_slot = new_time
            appointment.status = 'scheduled'
            appointment.save()
            return Response(AppointmentSerializer(appointment).data)

        return Response({'error': 'Invalid date or time'}, status=400)
@action(detail=False, methods=['get'], url_path='queue_status')
def queue_status(self, request):
    user = request.user
    doctor_id = request.query_params.get("doctor_id")

    # Get today's appointments for that doctor
    today = datetime.date.today()
    appointments = Appointment.objects.filter(
        doctor_id=doctor_id,
        appointment_date=today
    ).order_by("token_number")

    # Current token
    current_token = appointments.filter(status="in-progress").first()
    current_number = current_token.token_number if current_token else None

    # Get patient's own token
    patient_appointment = appointments.filter(patient=user).first()
    patient_token = patient_appointment.token_number if patient_appointment else None

    # Pending list (waiting + arrived)
    pending = appointments.filter(status__in=["waiting", "arrived"]).values(
        "token_number", "patient_name"
    )

    return Response({
        "current_token": current_number,
        "pending_tokens": pending,
        "patient_token": patient_token
    })

    # ⭐ MOVED HERE — FIXED ⭐
    @action(detail=True, methods=['post'], permission_classes=[IsDoctor])
    def start_consultation(self, request, pk=None):
        appointment = self.get_object()

        if appointment.doctor.user != request.user:
            return Response({'error': 'Not authorized'}, status=403)

        appointment.status = 'in_progress'
        appointment.consultation_started_at = timezone.now()
        appointment.save()

        return Response(AppointmentSerializer(appointment).data)

    # ⭐ MOVED HERE — FIXED ⭐
    @action(detail=True, methods=['post'], permission_classes=[IsDoctor])
    def end_consultation(self, request, pk=None):
        appointment = self.get_object()

        if appointment.doctor.user != request.user:
            return Response({'error': 'Not authorized'}, status=403)

        appointment.status = 'completed'
        appointment.consultation_ended_at = timezone.now()
        appointment.notes = request.data.get('notes', '')
        appointment.prescription = request.data.get('prescription', '')
        appointment.save()

        # Create medical record if included
        medical_data = request.data.get('medical_record')
        if medical_data:
            medical_data['patient'] = appointment.patient.id
            medical_data['doctor'] = appointment.doctor.id
            medical_data['appointment'] = appointment.id
            serializer = MedicalRecordSerializer(data=medical_data)
            if serializer.is_valid():
                serializer.save()

        self._update_queue_status(appointment.doctor, appointment.appointment_date)
        return Response(AppointmentSerializer(appointment).data)

    # AVAILABLE SLOTS unchanged
    @action(detail=False, methods=['get'], url_path='available_slots')
    def available_slots(self, request):
        doctor_id = request.query_params.get('doctor_id')
        appointment_date_str = request.query_params.get('date')

        if not doctor_id or not appointment_date_str:
            return Response({'error': 'doctor_id and date are required'}, status=400)

        try:
            doctor = Doctor.objects.get(pk=doctor_id)
        except Doctor.DoesNotExist:
            return Response({'error': 'Doctor not found'}, status=404)

        try:
            appointment_date = date.fromisoformat(appointment_date_str)
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=400)

        day_name = appointment_date.strftime('%A').lower()
        availability = DoctorAvailability.objects.filter(
            doctor=doctor,
            day_of_week=day_name,
            is_available=True
        ).first()

        if not availability:
            start_t = time(9, 0)
            end_t = time(17, 0)
        else:
            start_t = availability.start_time
            end_t = availability.end_time
            if end_t == time(0, 0):
                end_t = time(23, 59)

        start_dt = datetime.combine(appointment_date, start_t)
        end_dt = datetime.combine(appointment_date, end_t)

        booked = set(
            t.strftime("%H:%M")
            for t in Appointment.objects.filter(
                doctor=doctor,
                appointment_date=appointment_date,
                status__in=['scheduled', 'confirmed', 'in_progress']
            ).values_list('time_slot', flat=True)
        )

        available = []
        current = start_dt
        while current < end_dt:
            sv = current.strftime("%H:%M")
            if sv not in booked:
                available.append({
                    "value": sv,
                    "display": current.strftime("%I:%M %p"),
                    "duration": "10 minutes"
                })
            current += timedelta(minutes=10)

        return Response({
            "doctor_id": doctor_id,
            "date": appointment_date_str,
            "available_slots": available,
            "total_available": len(available)
        })

    def _update_queue_status(self, doctor, appointment_date):
        queue_status, created = QueueStatus.objects.get_or_create(
            doctor=doctor, appointment_date=appointment_date
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
    queryset = Department.objects.filter(is_active=True)
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.AllowAny]


# ==================== Medical Record Views ====================
class MedicalRecordViewSet(viewsets.ModelViewSet):
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
        if self.request.user.role == 'doctor':
            serializer.save(doctor=self.request.user.doctor_profile)
        else:
            serializer.save()


# ==================== Family Member Views ====================
class FamilyMemberViewSet(viewsets.ModelViewSet):
    serializer_class = FamilyMemberSerializer
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def get_queryset(self):
        return FamilyMember.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ==================== Queue Status Views ====================
class QueueStatusViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = QueueStatusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        doctor_id = self.request.query_params.get('doctor')
        appointment_date = self.request.query_params.get('date', timezone.now().date())

        queryset = QueueStatus.objects.filter(appointment_date=appointment_date)
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        return queryset
