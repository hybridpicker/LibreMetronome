from django.contrib import admin
from django.utils.html import format_html_join

from .models import MetronomeSoundSet

SOUND_PREVIEW_FIELDS = (
    ("first_beat_sound", "First Beat"),
    ("accent_sound", "Accent"),
    ("normal_beat_sound", "Normal Beat"),
)


@admin.register(MetronomeSoundSet)
class MetronomeSoundSetAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at", "sound_preview")
    list_editable = ("is_active",)
    search_fields = ("name", "description")
    readonly_fields = ("created_at", "updated_at")
    list_filter = ("is_active", "created_at")

    @admin.display(description="Sound Previews")
    def sound_preview(self, obj):
        players = [
            (label, getattr(obj, field_name).url)
            for field_name, label in SOUND_PREVIEW_FIELDS
            if getattr(obj, field_name)
        ]
        return format_html_join(
            "",
            '<div style="margin: 5px 0;"><strong>{}</strong>: '
            '<audio controls style="height: 30px"><source src="{}" type="audio/mpeg">'
            "Your browser does not support the audio element.</audio></div>",
            players,
        )
