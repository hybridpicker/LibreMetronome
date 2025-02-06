from django.http import HttpResponseRedirect

def dev_redirect(request):
    """Redirect to the React development server."""
    return HttpResponseRedirect("http://localhost:3000")
