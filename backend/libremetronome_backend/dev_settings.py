# Development settings override
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'devel.libremetronome.com']

# CORS settings for development
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8000",
    "https://devel.libremetronome.com",
]

# Disable CSRF for API endpoints in development
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
}
