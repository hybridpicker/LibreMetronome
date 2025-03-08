from django.urls import path, re_path
from django.views.generic import TemplateView
from . import views

# API endpoints will be added here as needed
urlpatterns = [
    # API endpoints go here
    
    # Catch all URLs to serve React frontend
    re_path(r'^(?P<path>.*)$', views.serve_react, name='serve_react'),
]
