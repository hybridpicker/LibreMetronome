from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from ..models import MetronomeSoundSet
from ..serializers import MetronomeSoundSetSerializer

class IsStaffOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow staff members to edit objects.
    """
    def has_permission(self, request, view):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        # Write permissions are only allowed to staff
        return request.user and request.user.is_staff

class SoundSetViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing sound sets.
    Staff can create/update/delete, everyone can read.
    """
    queryset = MetronomeSoundSet.objects.all()
    serializer_class = MetronomeSoundSetSerializer
    permission_classes = [IsStaffOrReadOnly]
    parser_classes = (MultiPartParser, FormParser)
    
    def create(self, request, *args, **kwargs):
        """Create a new sound set with file uploads"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=201)
    
    def update(self, request, *args, **kwargs):
        """Update sound set, optionally with new files"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set a sound set as default"""
        if not request.user.is_staff:
            return Response({'error': 'Permission denied'}, status=403)
            
        sound_set = self.get_object()
        # Remove default from all others
        MetronomeSoundSet.objects.update(is_active=False)
        # Set this one as default
        sound_set.is_active = True
        sound_set.save()
        return Response({'success': True})
