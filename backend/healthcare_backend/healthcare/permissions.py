from rest_framework.permissions import BasePermission

class IsPatient(BasePermission):
    """Allow access only to patients"""
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'patient'
        )

class IsDoctor(BasePermission):
    """Allow access only to doctors"""
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'doctor'
        )

class IsAdmin(BasePermission):
    """Allow access only to admins"""
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'admin'
        )

class IsOwnerOrReadOnly(BasePermission):
    """Object-level permission to only allow owners to edit"""
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        
        # Write permissions are only allowed to the owner
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'patient'):
            return obj.patient == request.user
        return False

class IsDoctorOrAdmin(BasePermission):
    """Allow access to doctors and admins"""
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['doctor', 'admin']
        )