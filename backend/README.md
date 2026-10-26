# LibreMetronome Backend

This is the Django backend server for the LibreMetronome application.

## Development Setup

1. **Create and activate the virtual environment** (from the repository root):
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements-dev.txt
   ```

2. **Provide a secret key** (settings refuse to start without it). Either export it or put it in a
   `.env` file in the repository root (never commit that file):
   ```bash
   export SECRET_KEY="<any random string for local development>"
   ```

3. **Use development settings** (optional): create `libremetronome_backend/local_settings.py` with
   ```python
   from .dev_settings import *
   ```

4. **Run migrations**: `python manage.py migrate`
5. **Create a superuser** (optional, for the admin): `python manage.py createsuperuser`
6. **Run the development server**: `python manage.py runserver`

## Checks

```bash
ruff check . && ruff format --check .
mypy .
bandit -c pyproject.toml -r .
coverage run manage.py test --settings=libremetronome_backend.test_settings && coverage report
pip-audit -r ../requirements.txt
mutmut run          # optional mutation testing of views.py and models.py (needs pytest, see requirements-dev.txt)
```

`../run_tests.sh backend` runs the same checks.

## Sound Sets

The MetronomeSoundSet model supports different sound configurations for the metronome:

- First beat sound: Used for the first beat of the measure (State 3)
- Accent sound: Used for accented beats (State 2)
- Normal beat sound: Used for regular beats (State 1)

Several sound sets can exist at the same time. The legacy `is_active` flag is kept for compatibility but
is no longer used: the frontend stores the selected sound set id in a cookie. Files must be `.wav`,
`.mp3` or `.ogg`; a set saved without files falls back to the bundled default sounds.

### Creating a Sound Set

1. Navigate to the admin panel (http://localhost:8000/admin/)
2. Log in with the superuser credentials
3. Select "Metronome Sound Sets" from the sidebar
4. Click "Add Metronome Sound Set"
5. Fill in the required information and upload audio files (the list view offers audio previews)

### API Endpoints

- `GET /api/sound-sets/`: List all sound sets
- `GET /api/sound-sets/<id>/`: One sound set
- `GET /api/active-sound-set/` and `GET /api/default-sound-set/`: The first sound set in the database
- `POST /api/sound-sets/<id>/set-active/`: Validate that a sound set exists and return it (does not change the database)
- `GET /api/support-info/`: Payment link for the support page (`STRIPE_PAYMENT_LINK` setting)
- `GET /metronome_sounds/<file>` and `GET /assets/audio/<file>`: Sound files from `MEDIA_ROOT`

Unexpected errors in the JSON endpoints return `{"error": "Internal server error"}` with status 500.
