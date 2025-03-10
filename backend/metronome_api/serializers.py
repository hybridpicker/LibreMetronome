from rest_framework import serializers
from .models import MetronomeSoundSet

class MetronomeSoundSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetronomeSoundSet
        fields = ['id', 'name', 'description', 'is_active', 'created_at', 'updated_at',
                  'first_beat_sound', 'accent_sound', 'normal_beat_sound']
