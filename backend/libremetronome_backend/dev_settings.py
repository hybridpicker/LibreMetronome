"""
Development settings for LibreMetronome backend
"""

# Override production settings for development
DEBUG = True

# Allow all hosts in development
ALLOWED_HOSTS = ['*', 'localhost', '127.0.0.1']

# CORS settings for development
CORS_ALLOW_ALL_ORIGINS = True  # This enables CORS for all origins in development

# More permissive CORS settings for development
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
CORS_EXPOSE_HEADERS = ['content-disposition']

# Disable security settings for local development
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
