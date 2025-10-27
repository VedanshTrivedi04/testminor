#!/usr/bin/env python
"""
Script to create sample data for the healthcare system
Run this after migrations to populate the database with test data
"""

import os
import sys
import django
from datetime import date, time, timedelta

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'healthcare_backend.settings')
django.setup()

from healthcare.models import User, Department, Doctor, DoctorAvailability, Appointment

def create_sample_data():
    print("Creating sample data...")
    
    # Create departments
    departments_data = [
        {
            'name': 'Cardiology',
            'code': 'CARD',
            'description': 'Heart and cardiovascular system care',
            'icon': 'fas fa-heartbeat',
        },
        {
            'name': 'Neurology',
            'code': 'NEURO',
            'description': 'Brain and nervous system disorders',
            'icon': 'fas fa-brain',
        },
        {
            'name': 'Orthopedics',
            'code': 'ORTHO',
            'description': 'Bone, joint, and muscle care',
            'icon': 'fas fa-bone',
        },
        {
            'name': 'Pediatrics',
            'code': 'PED',
            'description': 'Children\'s healthcare',
            'icon': 'fas fa-child',
        },
        {
            'name': 'Dermatology',
            'code': 'DERM',
            'description': 'Skin, hair, and nail care',
            'icon': 'fas fa-hand-paper',
        },
        {
            'name': 'General Medicine',
            'code': 'GEN',
            'description': 'General health and wellness',
            'icon': 'fas fa-stethoscope',
        },
    ]
    
    departments = []
    for dept_data in departments_data:
        dept, created = Department.objects.get_or_create(
            code=dept_data['code'],
            defaults=dept_data
        )
        departments.append(dept)
        print(f"Created department: {dept.name}")
    
    # Create admin user
    admin_user, created = User.objects.get_or_create(
        email='admin@healthcare.gov',
        defaults={
            'full_name': 'System Administrator',
            'phone': '+91-9876543210',
            'role': 'admin',
            'is_staff': True,
            'is_superuser': True,
            'is_verified': True,
        }
    )
    if created:
        admin_user.set_password('admin123')
        admin_user.save()
        print("Created admin user")
    
    # Create sample patients
    patients_data = [
        {
            'email': 'patient1@example.com',
            'full_name': 'Rahul Sharma',
            'phone': '+91-9876543211',
            'date_of_birth': date(1990, 5, 15),
            'gender': 'male',
            'address': '123 Main Street, New Delhi',
            'aadhaar_number': '123456789012',
            'blood_group': 'O+',
        },
        {
            'email': 'patient2@example.com',
            'full_name': 'Priya Patel',
            'phone': '+91-9876543212',
            'date_of_birth': date(1985, 8, 22),
            'gender': 'female',
            'address': '456 Park Avenue, Mumbai',
            'aadhaar_number': '123456789013',
            'blood_group': 'A+',
        },
    ]
    
    for patient_data in patients_data:
        user, created = User.objects.get_or_create(
            email=patient_data['email'],
            defaults=patient_data
        )
        if created:
            user.set_password('patient123')
            user.save()
            print(f"Created patient: {user.full_name}")
    
    # Create sample doctors
    doctors_data = [
        {
            'email': 'dr.singh@healthcare.gov',
            'full_name': 'Dr. Rajesh Singh',
            'phone': '+91-9876543213',
            'date_of_birth': date(1975, 3, 10),
            'gender': 'male',
            'address': '789 Doctor Lane, Delhi',
            'aadhaar_number': '123456789014',
            'specialty': 'Cardiologist',
            'department': departments[0],  # Cardiology
            'qualification': 'MBBS, MD Cardiology',
            'experience': '15 years',
            'license_number': 'CARD001',
            'consultation_fee': 500.00,
            'bio': 'Experienced cardiologist with expertise in heart diseases.',
        },
        {
            'email': 'dr.gupta@healthcare.gov',
            'full_name': 'Dr. Anjali Gupta',
            'phone': '+91-9876543214',
            'date_of_birth': date(1980, 7, 18),
            'gender': 'female',
            'address': '321 Medical Center, Mumbai',
            'aadhaar_number': '123456789015',
            'specialty': 'Neurologist',
            'department': departments[1],  # Neurology
            'qualification': 'MBBS, MD Neurology',
            'experience': '12 years',
            'license_number': 'NEURO001',
            'consultation_fee': 600.00,
            'bio': 'Specialist in neurological disorders and brain conditions.',
        },
        {
            'email': 'dr.kumar@healthcare.gov',
            'full_name': 'Dr. Vikram Kumar',
            'phone': '+91-9876543215',
            'date_of_birth': date(1978, 11, 25),
            'gender': 'male',
            'address': '654 Ortho Street, Bangalore',
            'aadhaar_number': '123456789016',
            'specialty': 'Orthopedic Surgeon',
            'department': departments[2],  # Orthopedics
            'qualification': 'MBBS, MS Orthopedics',
            'experience': '18 years',
            'license_number': 'ORTHO001',
            'consultation_fee': 700.00,
            'bio': 'Expert in bone and joint surgeries.',
        },
        {
            'email': 'dr.sharma@healthcare.gov',
            'full_name': 'Dr. Sunita Sharma',
            'phone': '+91-9876543216',
            'date_of_birth': date(1982, 4, 12),
            'gender': 'female',
            'address': '987 Children Hospital, Chennai',
            'aadhaar_number': '123456789017',
            'specialty': 'Pediatrician',
            'department': departments[3],  # Pediatrics
            'qualification': 'MBBS, MD Pediatrics',
            'experience': '10 years',
            'license_number': 'PED001',
            'consultation_fee': 400.00,
            'bio': 'Caring pediatrician with expertise in child health.',
        },
    ]
    
    for doctor_data in doctors_data:
        # Create user first
        user_data = {k: v for k, v in doctor_data.items() if k not in ['specialty', 'department', 'qualification', 'experience', 'license_number', 'consultation_fee', 'bio']}
        user_data['role'] = 'doctor'
        
        user, created = User.objects.get_or_create(
            email=doctor_data['email'],
            defaults=user_data
        )
        if created:
            user.set_password('doctor123')
            user.save()
        
        # Create doctor profile
        doctor, created = Doctor.objects.get_or_create(
            user=user,
            defaults={
                'specialty': doctor_data['specialty'],
                'department': doctor_data['department'],
                'qualification': doctor_data['qualification'],
                'experience': doctor_data['experience'],
                'license_number': doctor_data['license_number'],
                'consultation_fee': doctor_data['consultation_fee'],
                'bio': doctor_data['bio'],
                'is_verified': True,
                'is_available': True,
                'registered_by': admin_user,
            }
        )
        if created:
            print(f"Created doctor: {doctor.full_name}")
    
    # Create doctor availability
    doctors = Doctor.objects.all()
    for doctor in doctors:
        # Create availability for weekdays
        for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']:
            availability, created = DoctorAvailability.objects.get_or_create(
                doctor=doctor,
                day_of_week=day,
                defaults={
                    'start_time': time(9, 0),
                    'end_time': time(17, 0),
                    'max_appointments': 20,
                    'is_available': True,
                }
            )
            if created:
                print(f"Created availability for {doctor.full_name} on {day}")
    
    # Create sample appointments
    patients = User.objects.filter(role='patient')
    if patients.exists() and doctors.exists():
        tomorrow = date.today() + timedelta(days=1)
        
        appointment_data = {
            'patient': patients.first(),
            'doctor': doctors.first(),
            'department': doctors.first().department,
            'appointment_date': tomorrow,
            'time_slot': time(10, 0),
            'reason': 'Regular checkup',
            'booking_type': 'doctor',
            'is_for_self': True,
            'status': 'scheduled',
        }
        
        appointment, created = Appointment.objects.get_or_create(
            patient=appointment_data['patient'],
            doctor=appointment_data['doctor'],
            appointment_date=appointment_data['appointment_date'],
            time_slot=appointment_data['time_slot'],
            defaults=appointment_data
        )
        if created:
            print(f"Created appointment: {appointment.token_number}")
    
    print("Sample data creation completed!")

if __name__ == '__main__':
    create_sample_data()

