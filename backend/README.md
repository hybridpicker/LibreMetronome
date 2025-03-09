# LibreMetronome Backend

This is the Django backend server for the LibreMetronome application.

## Development Setup

1. **Activate the conda environment**:
   ```bash
   conda activate libremetronome
   ```

2. **Use development settings**:
   Create a `local_settings.py` file in the `libremetronome_backend` directory with the following content:
   ```python
   # Import development settings
   from .dev_settings import *
   ```

3. **Run migrations**:
   ```bash
   python manage.py migrate
   ```

4. **Create a superuser** (optional, for admin access):
   ```bash
   python manage.py createsuperuser
   ```

5. **Run the development server**:
   ```bash
   python manage.py runserver
   ```

## Sound Sets

The MetronomeSoundSet model supports different sound configurations for the metronome:

- First beat sound: Used for the first beat of the measure (State 3)
- Accent sound: Used for accented beats (State 2)
- Normal beat sound: Used for regular beats (State 1)

Only one sound set can be active at a time. The active sound set will be used by the metronome in the frontend application.

### Creating a Sound Set

1. Navigate to the admin panel (http://localhost:8000/admin/)
2. Log in with the superuser credentials
3. Select "Metronome Sound Sets" from the sidebar
4. Click "Add Metronome Sound Set"
5. Fill in the required information and upload audio files
6. Check "Is Active" to make this the current sound set for the metronome

### API Endpoints

- `GET /api/sound-sets/`: List all sound sets
- `GET /api/active-sound-set/`: Get the currently active sound set
- `GET /api/default-sound-set/`: Get the default sound set
- `POST /api/set-active-sound-set/<id>/`: Set a specific sound set as active

The frontend automatically syncs with these endpoints to use the correct sounds for each metronome beat state.
