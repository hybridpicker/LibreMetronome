from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MetronomeSettingsViewSet

router = DefaultRouter()
router.register(r'metronomesettings', MetronomeSettingsViewSet, basename='metronome-settings')

urlpatterns = [
    path('', include(router.urls)),
]
