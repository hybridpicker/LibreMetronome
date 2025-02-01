from rest_framework import serializers
from .models import MetronomeSettings

class MetronomeSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetronomeSettings
        fields = ['id', 'tempo', 'volume', 'swing', 'subdivisions']
