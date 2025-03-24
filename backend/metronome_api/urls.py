from django.urls import path, re_path, include
from . import views

# API endpoints for sound sets
api_urlpatterns = [
    path('active-sound-set/', views.active_sound_set, name='active_sound_set'),
    path('default-sound-set/', views.default_sound_set, name='default_sound_set'),
    path('sound-sets/', views.all_sound_sets, name='all_sound_sets'),
    path('sound-sets/<int:id>/', views.sound_set_detail, name='sound_set_detail'),
    path('sound-sets/<int:id>/set-active/', views.set_active_sound_set_view, name='set_active_sound_set'),
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
