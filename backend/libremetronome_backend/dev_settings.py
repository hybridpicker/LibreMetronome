"""
Development settings for LibreMetronome backend
"""

# Override production settings for development
DEBUG = True

# Allow all hosts in development
ALLOWED_HOSTS = ['*', 'localhost', '127.0.0.1']

# Add development-specific CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# Allow all CORS in development for easier testing
CORS_ALLOW_ALL_ORIGINS = True

# Disable security settings for local development
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
