from .auth_views import admin_login, admin_logout, check_admin_auth
from .soundset_views import SoundSetViewSet

__all__ = ['admin_login', 'admin_logout', 'check_admin_auth', 'SoundSetViewSet']

# Import all the existing views from the original views.py
from django.views.generic import TemplateView
from django.views.decorators.cache import never_cache
from django.http import Http404, JsonResponse, FileResponse
from django.views.decorators.http import require_POST
from django.conf import settings
from ..models import MetronomeSoundSet
import os
import mimetypes

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
    
    # Add CORS headers to allow cross-origin requests
    response['Access-Control-Allow-Origin'] = '*'  # Allow from any origin
    response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'X-Requested-With, Content-Type'
    
    return response

def get_support_info(request):
    """Return Stripe payment information from settings"""
    payment_link = getattr(settings, 'STRIPE_PAYMENT_LINK', '')
    
    # Add CORS headers to allow cross-origin requests
    response = JsonResponse({'paymentLink': payment_link})
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'X-Requested-With, Content-Type'
    
    # Log to help with debugging
    print(f"Support info requested. Returning payment link: {payment_link}")
    
    return response

def sound_set_to_dict(sound_set):
    """Convert a MetronomeSoundSet instance to a dictionary for JSON serialization.
    Always includes an ID but doesn't rely on is_active for the frontend.
    """
    if not sound_set:
        return None
    
    return {
        'id': sound_set.id,
        'name': sound_set.name,
        'description': sound_set.description,
        # Always include is_active for backwards compatibility, but it's not used
        'is_active': False,  # Default to false since frontend will use cookies now
        'first_beat_sound_url': sound_set.first_beat_sound.url if sound_set.first_beat_sound else None,
        'accent_sound_url': sound_set.accent_sound.url if sound_set.accent_sound else None,
        'normal_beat_sound_url': sound_set.normal_beat_sound.url if sound_set.normal_beat_sound else None,
        'created_at': sound_set.created_at.isoformat() if sound_set.created_at else None,
        'updated_at': sound_set.updated_at.isoformat() if sound_set.updated_at else None,
    }

@require_POST
def set_active_sound_set_view(request, id):
    try:
        # This endpoint no longer updates the is_active flag in the database
        # Instead, it just validates that the requested sound set exists
        # and returns it. Selection is handled by cookies in the frontend.
        sound_set = MetronomeSoundSet.objects.get(id=id)
        
        # Just return the requested sound set without modifying is_active
        response = JsonResponse(sound_set_to_dict(sound_set))
        
        # Add CORS headers to allow cross-origin requests if needed
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'X-Requested-With, Content-Type'
        
        return response
    except MetronomeSoundSet.DoesNotExist:
        return JsonResponse({'error': f'Sound set with ID {id} not found'}, status=404)
    except Exception as e:
        print(f"Error handling sound set request: {e}")
        return JsonResponse({'error': str(e)}, status=500)

def active_sound_set(request):
    """
    Get a default sound set, not relying on is_active flag.
    This endpoint now just returns the first sound set in the database.
    """
    try:
        # Simply get the first sound set
        sound_set = MetronomeSoundSet.objects.first()
        
        if sound_set:
            response = JsonResponse(sound_set_to_dict(sound_set))
            # Add CORS headers
            response['Access-Control-Allow-Origin'] = '*'
            response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'X-Requested-With, Content-Type'
            return response
        
        return JsonResponse({'error': 'No sound sets found'}, status=404)
    except Exception as e:
        print(f"Error getting sound set: {e}")
        return JsonResponse({'error': str(e)}, status=500)

def default_sound_set(request):
    """Get the default sound set (first one in the database)."""
    try:
        # Simply get the first sound set, no longer using is_active
        sound_set = MetronomeSoundSet.objects.first()
        
        if sound_set:
            response = JsonResponse(sound_set_to_dict(sound_set))
            # Add CORS headers
            response['Access-Control-Allow-Origin'] = '*'
            response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'X-Requested-With, Content-Type'
            return response
            
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
