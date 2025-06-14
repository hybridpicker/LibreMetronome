from django.urls import path, re_path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import admin_login, admin_logout, check_admin_auth, SoundSetViewSet

# Create router for ViewSets
router = DefaultRouter()
router.register(r'sound-sets', SoundSetViewSet, basename='soundset')

# API endpoints for sound sets
api_urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Legacy endpoints (keep for backward compatibility)
    path('active-sound-set/', views.active_sound_set, name='active_sound_set'),
    path('default-sound-set/', views.default_sound_set, name='default_sound_set'),
    
    # Admin auth endpoints
    path('admin/login/', admin_login, name='admin_login'),
    path('admin/logout/', admin_logout, name='admin_logout'),
    path('admin/check-auth/', check_admin_auth, name='check_admin_auth'),
    
    # Support info
    path('support-info/', views.get_support_info, name='support_info'),
]

urlpatterns = [
    # Serve sound files
    path('metronome_sounds/<str:filename>', views.serve_sound_file, name='serve_sound_file'),
    path('assets/audio/<str:filename>', views.serve_sound_file, name='serve_frontend_sound_file'),
    
    # Include API endpoints under the "/api/" prefix
    path('api/', include(api_urlpatterns)),

    # Catch-all route for the React frontend - must be the last route
    re_path(r'^(?P<path>.*)$', views.serve_react, name='serve_react'),
]
