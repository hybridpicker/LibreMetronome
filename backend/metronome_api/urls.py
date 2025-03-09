from django.urls import path, re_path, include
from . import views

# API endpoints specifically for the /api/ prefix
api_urlpatterns = [
    path('active-sound-set/', views.active_sound_set, name='active_sound_set'),
    path('default-sound-set/', views.default_sound_set, name='default_sound_set'),
    path('sound-sets/', views.all_sound_sets, name='all_sound_sets'),
    path('sound-sets/<int:id>/', views.sound_set_detail, name='sound_set_detail'),
]

# Non-API URLs for the base path
urlpatterns = [
    # Sound file serving
    path('metronome_sounds/<str:filename>', views.serve_sound_file, name='serve_sound_file'),
    # Additional route for frontend sound files
    path('assets/audio/<str:filename>', views.serve_sound_file, name='serve_frontend_sound_file'),
    
    # Catch all URLs to serve React frontend - must be LAST
    re_path(r'^(?P<path>.*)$', views.serve_react, name='serve_react'),
]
