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
