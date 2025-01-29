# Libre Metronome

Libre Metronome is a full-stack metronome application utilizing **Django (Python)** for the backend and **React** for the frontend. It offers highly customizable tempo control, subdivisions, swing adjustments, volume management, and visual beat indicators, all powered by precise Web Audio scheduling.

## Features
- **Adjustable Tempo (BPM)**: Set the speed between 30–240 BPM.
- **Subdivisions**: Customize rhythmic subdivisions (1–9) via the UI or keyboard shortcuts.
- **Swing Control**: Adjust swing feel for jazz and related styles (0–0.5 range).
- **Volume Control**: Modify playback level in real-time.
- **Tap Tempo**: Use the `T` key to set BPM by tapping.
- **Visual Beat Indicators**: A circle-based visualization featuring an orange pointer and accent toggles for each subdivision.
- **Keyboard Shortcuts**:
  - `Spacebar`: Start/Stop the metronome
  - `1–9`: Set subdivisions
  - `T`: Tap tempo

## Demo
https://github.com/user-attachments/assets/9805c71c-a256-4e4d-af7a-14b9f1c5f99d

## Installation & Setup
Follow the steps below to install and run both the Django backend and the React frontend.

### 1. Clone the Repository
```bash
git clone https://github.com/hybridpicker/LibreMetronome.git
cd LibreMetronome
```

### 2. Set Up the Django Backend
```bash
cd backend

python -m venv env_name
source env_name/bin/activate   # On Windows: env_name\Scripts\activate

pip install -r requirements.txt

python manage.py migrate
python manage.py runserver
```
By default, Django runs on **http://localhost:8000**.

### 3. Set Up the React Frontend
```bash
cd ../frontend
npm install
npm start
```
This launches the React app in development mode on **http://localhost:3000**.

### 4. Ensure Backend-Frontend Communication
If necessary, configure CORS or set up a proxy to enable smooth interaction between the frontend and backend. By default, the React UI runs on port 3000, while the Django API is hosted on port 8000.

### 5. Audio Files
Place the following audio files in **frontend/public/assets/audio/**:
- `click_new.mp3` (standard click sound)
- `click_new_accent.mp3` (accented click sound)
- `click_new_first.mp3` (first beat click sound)

## Usage
1. Open **http://localhost:3000** in a browser to access the React frontend.
2. Start/stop the metronome using the **Spacebar** or the **Play/Pause** button.
3. Adjust **Tempo, Swing, and Volume** using the UI sliders.
4. Use the **T** key to tap a new tempo.
5. Press **1–9** to change subdivisions on the fly.
6. Click on the subdivision circles to toggle accent marks.

## Keyboard Shortcuts Overview
| Shortcut | Function |
|----------|----------|
| `Spacebar` | Start/Stop metronome |
| `T` | Tap tempo |
| `1–9` | Set rhythmic subdivisions |

## Contributing
We welcome contributions! If you encounter issues or have feature suggestions, feel free to open an issue or submit a pull request. Originally a **Pygame** prototype, Libre Metronome has evolved into a **Django + React** application for improved scalability and UX.

## License
This project is licensed under the **MIT License**. See the `LICENSE` file for details.

