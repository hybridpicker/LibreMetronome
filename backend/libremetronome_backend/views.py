from django.conf import settings
from django.http import Http404, HttpResponseRedirect

"""
LibreMetronome - Open Source Metronome

This file is part of LibreMetronome.

LibreMetronome is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

LibreMetronome is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
"""


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
