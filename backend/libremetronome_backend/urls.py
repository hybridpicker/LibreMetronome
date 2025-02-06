from django.urls import path
from libremetronome_backend.views import dev_redirect

urlpatterns = [
    path('', dev_redirect),  # Redirect root to React Dev Server
]
