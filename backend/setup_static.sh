#!/bin/bash

# Create necessary directories
mkdir -p staticfiles
mkdir -p metronome_api/static

# Collect static files
python manage.py collectstatic --noinput

echo "Static files have been collected successfully."
echo "Make sure your web server is configured to serve files from the 'staticfiles' directory."
