import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Doctor, Appointment, QueueStatus
from django.utils import timezone
from .models import User # Make sure User is imported if you plan to auth

class QueueConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for live queue updates"""

    async def connect(self):
        self.doctor_id = self.scope['url_route']['kwargs']['doctor_id']
        self.room_group_name = f'queue_{self.doctor_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # Send initial queue status
        queue_data = await self.get_queue_status()
        await self.send(text_data=json.dumps(queue_data))

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Handle incoming messages (e.g., manual refresh request)"""
        queue_data = await self.get_queue_status()
        await self.send(text_data=json.dumps(queue_data))

    async def queue_update(self, event):
        """Send message to WebSocket when a queue_update is received"""
        await self.send(text_data=json.dumps(event['data']))

    @database_sync_to_async
    def get_queue_status(self):
        """Fetches the current queue status from the database"""
        try:
            doctor = Doctor.objects.get(id=self.doctor_id)
            today = timezone.now().date()

            # Get today's appointments that are in the queue
            appointments = Appointment.objects.filter(
                doctor=doctor,
                appointment_date=today,
                status__in=['scheduled', 'confirmed', 'in_progress']
            ).order_by('queue_position')

            # Get the single QueueStatus object for the day
            queue_status = QueueStatus.objects.filter(
                doctor=doctor,
                appointment_date=today
            ).first()

            return {
                'type': 'queue_status',
                'doctor_id': doctor.id,
                'doctor_name': doctor.full_name,
                'current_token': queue_status.current_token if queue_status else None,
                'total_tokens': queue_status.total_tokens if queue_status else 0,
                'completed_tokens': queue_status.completed_tokens if queue_status else 0,
                'queue': [
                    {
                        'token_number': apt.token_number,
                        'patient_name': apt.patient.full_name,
                        'status': apt.status,
                        'queue_position': apt.queue_position,
                        'estimated_time': str(apt.estimated_time) if apt.estimated_time else None,
                    }
                    for apt in appointments
                ]
            }
        except Doctor.DoesNotExist:
            return {'type': 'error', 'message': 'Doctor not found'}


class AppointmentConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for patient-specific appointment updates"""

    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.room_group_name = f'appointments_{self.user_id}'

        # Note: In a real app, you'd check `self.scope['user']` here
        # to ensure the user is authenticated and matches `user_id`.

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def appointment_update(self, event):
        """Send message to WebSocket when an appointment_update is received"""
        await self.send(text_data=json.dumps(event['data']))
