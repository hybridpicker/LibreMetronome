from django.contrib import admin
from django.utils.html import format_html
from .models import MetronomeSettings, MetronomeSoundSet

# Register your models here.

@admin.register(MetronomeSettings)
class MetronomeSettingsAdmin(admin.ModelAdmin):
    list_display = ('tempo', 'volume', 'swing', 'subdivisions')

@admin.register(MetronomeSoundSet)
class MetronomeSoundSetAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_default', 'created_at', 'sound_preview')
    list_editable = ('is_default',)
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    list_filter = ('is_default', 'created_at')
    
    def sound_preview(self, obj):
        preview_html = ''
        for field_name, label in [
            ('first_beat_sound', 'First Beat'),
            ('accent_sound', 'Accent'),
            ('normal_beat_sound', 'Normal Beat')
        ]:
            sound_file = getattr(obj, field_name)
            if sound_file:
                preview_html += format_html(
                    '<div style="margin: 5px 0;"><strong>{}</strong>: '
                    '<audio controls style="height: 30px"><source src="{}" type="audio/mpeg">'
                    'Your browser does not support the audio element.</audio></div>',
                    label, sound_file.url
                )
        return format_html(preview_html)
    
    sound_preview.short_description = 'Sound Previews'
