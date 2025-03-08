from django.urls import path, include
from django.contrib import admin
from django.views.generic import RedirectView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('metronome_api.urls')),
    path('', include('metronome_api.urls')),  # Let metronome_api handle serving React
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
