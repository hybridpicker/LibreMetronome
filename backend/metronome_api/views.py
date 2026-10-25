import logging
import mimetypes
from functools import wraps
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_POST
from django.views.generic import TemplateView

from .models import MetronomeSoundSet

logger = logging.getLogger(__name__)

CORS_ALLOWED_HEADERS = "X-Requested-With, Content-Type"
AUDIO_MIME_TYPES = {".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg"}
SOUND_SUBDIRECTORY = "metronome_sounds"


def with_cors(response, methods):
    """Allow any origin to call the endpoint with the given HTTP methods."""
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = methods
    response["Access-Control-Allow-Headers"] = CORS_ALLOWED_HEADERS
    return response


def json_errors_as_500(view):
    """Turn unexpected exceptions into a JSON 500 instead of an HTML error page.

    The exception details are logged server-side and deliberately not sent to the client.
    """

    @wraps(view)
    def wrapper(request, *args, **kwargs):
        try:
            return view(request, *args, **kwargs)
        except Exception:
            logger.exception("Unhandled error in %s", view.__name__)
            return JsonResponse({"error": "Internal server error"}, status=500)

    return wrapper


class ReactAppView(TemplateView):
    """Serves the React frontend's index.html for every frontend route."""

    template_name = "index.html"


# Create a single instance of the view
index_view = never_cache(ReactAppView.as_view())


def serve_react(request, path=None):
    """
    View function to serve the React frontend application.
    This function serves the index.html template for all frontend routes.
    """
    return index_view(request)


def find_sound_file(filename):
    """Locate a sound file in MEDIA_ROOT, falling back to its `metronome_sounds` subdirectory."""
    if Path(filename).name != filename or filename == "..":
        return None
    media_root = Path(settings.MEDIA_ROOT)
    for directory in (media_root, media_root / SOUND_SUBDIRECTORY):
        candidate = directory / filename
        if candidate.is_file():
            return candidate
    return None


def sound_content_type(filepath):
    """Explicit MIME type for the supported audio formats, otherwise the `mimetypes` guess."""
    explicit = AUDIO_MIME_TYPES.get(filepath.suffix)
    return explicit or mimetypes.guess_type(filepath)[0]


def serve_sound_file(request, filename):
    """Serve a metronome sound from MEDIA_ROOT."""
    filepath = find_sound_file(filename)
    if filepath is None:
        logger.info("Sound file not found: %s", filename)
        raise Http404(f"Sound file {filename} not found")

    response = FileResponse(filepath.open("rb"))
    content_type = sound_content_type(filepath)
    if content_type:
        response["Content-Type"] = content_type
    return with_cors(response, "GET, OPTIONS")


def get_support_info(request):
    """Return Stripe payment information from settings"""
    payment_link = getattr(settings, "STRIPE_PAYMENT_LINK", "")
    return with_cors(JsonResponse({"paymentLink": payment_link}), "GET, OPTIONS")


def sound_set_to_dict(sound_set):
    """Convert a MetronomeSoundSet instance to a dictionary for JSON serialization.
    Always includes an ID but doesn't rely on is_active for the frontend.
    """
    if not sound_set:
        return None

    return {
        "id": sound_set.id,
        "name": sound_set.name,
        "description": sound_set.description,
        # Always include is_active for backwards compatibility, but it's not used
        "is_active": False,  # Default to false since frontend will use cookies now
        "first_beat_sound_url": sound_set.first_beat_sound.url if sound_set.first_beat_sound else None,
        "accent_sound_url": sound_set.accent_sound.url if sound_set.accent_sound else None,
        "normal_beat_sound_url": sound_set.normal_beat_sound.url if sound_set.normal_beat_sound else None,
        "created_at": sound_set.created_at.isoformat() if sound_set.created_at else None,
        "updated_at": sound_set.updated_at.isoformat() if sound_set.updated_at else None,
    }


def _not_found(id):
    return JsonResponse({"error": f"Sound set with ID {id} not found"}, status=404)


def _first_sound_set_response(missing_message):
    """Response for the first sound set in the database (selection itself is cookie-based)."""
    sound_set = MetronomeSoundSet.objects.first()
    if sound_set is None:
        return JsonResponse({"error": missing_message}, status=404)
    return with_cors(JsonResponse(sound_set_to_dict(sound_set)), "GET, OPTIONS")


@require_POST
@json_errors_as_500
def set_active_sound_set_view(request, id):
    """Validate that the sound set exists and return it.

    The endpoint no longer updates the is_active flag in the database; selection is
    handled by cookies in the frontend.
    """
    try:
        sound_set = MetronomeSoundSet.objects.get(id=id)
    except MetronomeSoundSet.DoesNotExist:
        return _not_found(id)
    return with_cors(JsonResponse(sound_set_to_dict(sound_set)), "POST, OPTIONS")


@json_errors_as_500
def active_sound_set(request):
    """
    Get a default sound set, not relying on is_active flag.
    This endpoint now just returns the first sound set in the database.
    """
    return _first_sound_set_response("No sound sets found")


@json_errors_as_500
def default_sound_set(request):
    """Get the default sound set (first one in the database)."""
    return _first_sound_set_response("No default sound set found")


@json_errors_as_500
def all_sound_sets(request):
    """Get all sound sets."""
    return JsonResponse([sound_set_to_dict(s) for s in MetronomeSoundSet.objects.all()], safe=False)


@json_errors_as_500
def sound_set_detail(request, id):
    """Get a specific sound set by ID."""
    try:
        sound_set = MetronomeSoundSet.objects.get(id=id)
    except MetronomeSoundSet.DoesNotExist:
        return _not_found(id)
    return JsonResponse(sound_set_to_dict(sound_set))
