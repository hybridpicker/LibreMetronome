from django.views.generic import TemplateView
from django.views.decorators.cache import never_cache
from django.http import Http404

# Serve React App
class ReactAppView(TemplateView):
    """
    View for serving the React frontend application.
    Handles all frontend routes by serving index.html.
    """
    template_name = 'index.html'

    def get(self, request, *args, **kwargs):
        try:
            return super().get(request, *args, **kwargs)
        except Http404:
            # Always serve index.html for frontend routes
            return self.render_to_response({})

# Create a single instance of the view
index_view = never_cache(ReactAppView.as_view())

def serve_react(request, path=None):
    """
    View function to serve the React frontend application.
    This function serves the index.html template for all frontend routes.
    """
    return index_view(request)

# Add this view to serve sound files
def serve_sound_file(request, filename):
    from django.http import FileResponse, Http404
    from django.conf import settings
    import os
    import mimetypes
    
    # Construct the path to the sound file
    filepath = os.path.join(settings.MEDIA_ROOT, filename)
    
    # Debug information for troubleshooting
    print(f"Requested sound file: {filename}")
    print(f"Looking for file at: {filepath}")
    print(f"File exists: {os.path.exists(filepath)}")
    
    # Check if the file exists
    if not os.path.exists(filepath):
        # Try alternative locations
        alt_filepath = os.path.join(settings.MEDIA_ROOT, 'metronome_sounds', filename)
        if os.path.exists(alt_filepath):
            filepath = alt_filepath
            print(f"Found file at alternative location: {filepath}")
        else:
            print("File not found at either location")
            raise Http404(f"Sound file {filename} not found")
    
    # Determine the correct content type
    content_type, encoding = mimetypes.guess_type(filepath)
    
    # For audio files, we need to set the specific MIME type
    if filename.endswith('.mp3'):
        content_type = 'audio/mpeg'
    elif filename.endswith('.wav'):
        content_type = 'audio/wav'
    elif filename.endswith('.ogg'):
        content_type = 'audio/ogg'
    
    print(f"Serving file with content-type: {content_type}")
    
    # Return the file as a response with the correct content type
    response = FileResponse(open(filepath, 'rb'))
    if content_type:
        response['Content-Type'] = content_type
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    return response

# API endpoints for sound sets
from django.http import JsonResponse
from .models import MetronomeSoundSet

def sound_set_to_dict(sound_set):
    """Convert a MetronomeSoundSet instance to a dictionary for JSON serialization."""
    if not sound_set:
        return None
    
    return {
        'id': sound_set.id,
        'name': sound_set.name,
        'description': sound_set.description,
        'is_active': sound_set.is_active,
        'first_beat_sound_url': sound_set.first_beat_sound.url if sound_set.first_beat_sound else None,
        'accent_sound_url': sound_set.accent_sound.url if sound_set.accent_sound else None,
        'normal_beat_sound_url': sound_set.normal_beat_sound.url if sound_set.normal_beat_sound else None,
        'created_at': sound_set.created_at.isoformat() if sound_set.created_at else None,
        'updated_at': sound_set.updated_at.isoformat() if sound_set.updated_at else None,
    }

def active_sound_set(request):
    """Get the active sound set."""
    try:
        # Get the sound set marked as active
        sound_set = MetronomeSoundSet.objects.filter(is_active=True).first()
        if not sound_set:
            # If no active sound set, get the first one
            sound_set = MetronomeSoundSet.objects.first()
        
        if sound_set:
            return JsonResponse(sound_set_to_dict(sound_set))
        return JsonResponse({'error': 'No sound sets found'}, status=404)
    except Exception as e:
        print(f"Error getting active sound set: {e}")
        return JsonResponse({'error': str(e)}, status=500)

def default_sound_set(request):
    """Get the default sound set (same as active for now)."""
    try:
        sound_set = MetronomeSoundSet.objects.filter(is_active=True).first()
        if sound_set:
            return JsonResponse(sound_set_to_dict(sound_set))
        return JsonResponse({'error': 'No default sound set found'}, status=404)
    except Exception as e:
        print(f"Error getting default sound set: {e}")
        return JsonResponse({'error': str(e)}, status=500)

def all_sound_sets(request):
    """Get all sound sets."""
    try:
        sound_sets = MetronomeSoundSet.objects.all()
        return JsonResponse([sound_set_to_dict(s) for s in sound_sets], safe=False)
    except Exception as e:
        print(f"Error getting all sound sets: {e}")
        return JsonResponse({'error': str(e)}, status=500)

def sound_set_detail(request, id):
    """Get a specific sound set by ID."""
    try:
        sound_set = MetronomeSoundSet.objects.get(id=id)
        return JsonResponse(sound_set_to_dict(sound_set))
    except MetronomeSoundSet.DoesNotExist:
        return JsonResponse({'error': f'Sound set with ID {id} not found'}, status=404)
    except Exception as e:
        print(f"Error getting sound set {id}: {e}")
        return JsonResponse({'error': str(e)}, status=500)
