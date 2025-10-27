from django.urls import re_path
from . import consumer

websocket_urlpatterns = [
    # Regex for doctor-specific queue
    re_path(r'ws/queue/(?P<doctor_id>\w+)/$', consumer.QueueConsumer.as_asgi()),
    # Regex for user-specific appointment updates
    re_path(r'ws/appointments/(?P<user_id>\w+)/$', consumer.AppointmentConsumer.as_asgi()),
]