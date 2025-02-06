from django.contrib import admin
from django.urls import path, include
from .views import serve_react  # Import the React serving function

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', serve_react),  # Root URL serves React
]
