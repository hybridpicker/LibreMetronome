from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import MetronomeSettings
from .serializers import MetronomeSettingsSerializer

class MetronomeSettingsViewSet(viewsets.ModelViewSet):
    queryset = MetronomeSettings.objects.all()
    serializer_class = MetronomeSettingsSerializer

    def create(self, request, *args, **kwargs):
        # Beispiel: Speichert neue Settings oder validiert das POST-Request
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
