from django.conf import settings
from django.http import HttpResponseRedirect, Http404

def dev_redirect(request):
    """
    Redirects to the React development server only if DEBUG is True.
    
    In production (DEBUG=False), this endpoint is disabled and returns a 404 response.
    """
    if settings.DEBUG:
        # In development, redirect to the React dev server.
        return HttpResponseRedirect("http://localhost:3000")
    else:
        # In production, the dev redirect is not available.
        raise Http404("This endpoint is not available in production.")
