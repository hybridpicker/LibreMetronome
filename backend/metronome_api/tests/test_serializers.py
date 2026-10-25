from django.test import TestCase

from metronome_api.models import MetronomeSoundSet
from metronome_api.serializers import MetronomeSoundSetSerializer


class MetronomeSoundSetSerializerTests(TestCase):
    def test_serializes_expected_fields(self):
        sound_set = MetronomeSoundSet.objects.create(
            name="Wood",
            description="Dry",
            first_beat_sound="f.wav",
            accent_sound="a.wav",
            normal_beat_sound="n.wav",
        )

        data = MetronomeSoundSetSerializer(sound_set).data

        self.assertEqual(
            set(data),
            {
                "id",
                "name",
                "description",
                "is_active",
                "created_at",
                "updated_at",
                "first_beat_sound",
                "accent_sound",
                "normal_beat_sound",
            },
        )
        self.assertEqual(data["name"], "Wood")
        self.assertEqual(data["description"], "Dry")

    def test_requires_name_and_sound_files(self):
        serializer = MetronomeSoundSetSerializer(data={})

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            set(serializer.errors),
            {"name", "first_beat_sound", "accent_sound", "normal_beat_sound"},
        )
