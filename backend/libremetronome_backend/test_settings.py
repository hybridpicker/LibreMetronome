"""Settings overrides for local and CI test runs."""

from .settings import *  # noqa: F403


SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
