"""
ASGI config for healthcare_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""
"""
ASGI config for WebSocket support (Live Queue)
"""
import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from healthcare.routing import websocket_urlpatterns

# Try to dynamically import AuthMiddlewareStack; if channels isn't installed or the
# module is unavailable, provide a simple passthrough fallback so the file can still run.
try:
    auth_mod = importlib.import_module("channels.auth")
    AuthMiddlewareStack = getattr(auth_mod, "AuthMiddlewareStack")
except Exception:
    # Fallback no-op AuthMiddlewareStack so websocket routing still works
    def AuthMiddlewareStack(inner):
        return inner

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'healthcare_backend.settings')
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})