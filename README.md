![Logo_LibreMetronome](https://github.com/user-attachments/assets/9fed9e7c-6824-42e5-8b98-53be459d16ca)

![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)

# Libre Metronome

A modern, open-source metronome application that merges classic musical functionality with a contemporary user interface. Libre Metronome integrates analog elements (circular display, oscillating pointer) with modern web technologies to provide musicians and educators with a powerful and flexible practice tool.

## Live Demo

[www.libremetronome.com](https://libremetronome.com/)

![LibreMetronome_Smartphone](https://github.com/user-attachments/assets/267a1257-96b0-4d99-b22b-c08a790860a0)
![LibreMetronom_Laptop](https://github.com/user-attachments/assets/d1116cb1-53a4-4351-a6f2-3a81abe5f5e0)

## Key Features

### Multiple Visualization Modes

- **Beat Mode** - Interactive circular beat visualization with customizable accents
- **Analog Mode** - Classic metronome with realistic pendulum animation
- **Grid Mode** - Visual grid pattern layout for complex rhythms and beat patterns
- **Sequence Mode** - Repeat multiple bars in order, each with its own beat count, note value, and accents
- **Polyrhythm Mode** - Simultaneous inner and outer beat patterns with a unified timing view

### Beat Customization

- **Adjustable Time Signatures** - Support for 1 to 9 beats per measure
- **Flexible Accent Patterns** - Customize emphasis on any beat with four different states:
  - First Beat (strong accent)
  - Accent (medium emphasis)
  - Normal Beat (regular click)
  - Muted (no sound)
- **Quarter/Eighth Note Toggle** - Switch between quarter and eighth note subdivisions

### Training Features

- **Macro-Timing Practice**
  - Fixed Silence Intervals - Play for set number of measures, then mute for specified duration
  - Random Silence - Randomly muted beats based on probability setting
- **Speed Training**
  - Auto Increase - Automatically increase tempo after specified number of measures
  - Manual Increase - Control tempo increases with an "Accelerate" button

### User Experience

- **Dynamic Visualization** - Animated pointer shows beat progression with synchronized visual feedback
- **Beat Sync Line** - Moving line that synchronizes with the beats in polyrhythmic mode for clear visual tempo representation
- **Keyboard Shortcuts** - Spacebar for play/pause, number keys for subdivisions, 'T' for tap tempo
- **Tap Tempo** - Set tempo by tapping at desired speed
- **Swing Control** - Add rhythmic swing feel from 0-50%
- **Volume Control** - Adjustable volume for all sound types

### Sound Customization

- **Multiple Sound Sets** - Choose between different metronome sound profiles
- **Custom Sound API** - Backend support for user-defined sound sets
- **Customizable Accents** - Different sounds for first beat, accented beats, and normal beats

## Technical Stack

### Frontend
- React 
- JavaScript/ES6+
- HTML5/CSS3
- Web Audio API
- Capacitor 8 for native iOS and Android apps

### Backend
- Django
- Django REST Framework
- Python
- SQLite database

## Installation & Setup

### Prerequisites

- Node.js 22+ and npm (the web app alone builds on older versions; the Capacitor CLI needs 22)
- Python 3.10+ with pip and venv (Django 5.2 requires it)
- Git

### Local Development

#### Clone the Repository

```bash
git clone https://github.com/hybridpicker/LibreMetronome.git
cd LibreMetronome
```

#### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend will be accessible at http://localhost:3000

#### Mobile Setup

The iOS and Android apps share the React and Web Audio implementation in
`frontend/`. Build the web bundle and sync both native projects with:

```bash
cd frontend
npm install
npm run mobile:sync
```

For iOS, use Xcode 26 or later:

```bash
npm run ios:open
```

Select your Apple development team and a connected iPhone or iPad, then run the
`App` scheme. The native app configures a playback audio session and a low
latency I/O buffer for metronome use.

For Android, use JDK 21 and Android Studio or Gradle:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
cd android
./gradlew assembleDebug
```

The debug APK is generated at
`frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

#### macOS App

A native Dock app for macOS 14+ wraps the same web bundle and adds a Dock
badge and menu, menu bar commands, media keys, a global shortcut and
background playback:

```bash
macos/build.sh --install --dock
```

See [`macos/README.md`](macos/README.md) for features and build options.

See [`docs/mobile-deployment.md`](docs/mobile-deployment.md) for native build,
signing and device installation. See [`docs/design-system.md`](docs/design-system.md)
for shared interface rules and [`docs/release-plan.md`](docs/release-plan.md)
for the AlmaLinux web deployment and App Store preparation.

As of September 5, 2026, the updated development app is installed on the test
iPad. The matching web build is prepared but has not been deployed to the live
site. App Store and TestFlight distribution are pending Apple Developer Program
enrollment; a free public app is being considered.

#### Backend Setup

```bash
# From the project root: create the virtual environment and install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements-dev.txt   # runtime + test/lint tools

cd backend
export SECRET_KEY="<any random string for local development>"   # settings refuse to start without it

# Run migrations
python manage.py migrate

# Check the sound sets (copies missing default sounds if the frontend assets are present)
python manage.py check_sounds

# Start the Django development server
python manage.py runserver
```

The backend will run at http://localhost:8000. The `SECRET_KEY` can also live in a `.env` file in the
project root (never commit it).

#### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/active-sound-set/` | Get currently active sound set |
| `/api/sound-sets/` | List all available sound sets |
| `/api/sound-sets/<id>/` | Get specific sound set details |
| `/api/sound-sets/<id>/set-active/` | Validate a sound set (POST); the selection itself is stored in a cookie by the frontend |
| `/api/default-sound-set/` | First sound set in the database |
| `/api/support-info/` | Payment link used by the support page |

## Tests, Lint and Coverage

One command runs everything (ruff, mypy, bandit, Django tests, ESLint, Jest):

```bash
./run_tests.sh              # backend + frontend
./run_tests.sh backend      # backend only
./run_tests.sh frontend     # frontend only
./run_tests.sh coverage     # with coverage reports and coverage gates
```

The individual tools, if you want them one by one:

```bash
# backend (from backend/, with the .venv active and SECRET_KEY set)
ruff check . && ruff format --check .
mypy .
bandit -c pyproject.toml -r .
python manage.py test                   # or: coverage run manage.py test && coverage report
pip-audit -r ../requirements.txt        # dependency audit

# frontend (from frontend/)
npm run lint                            # ESLint, zero warnings allowed
npm run test:ci                         # Jest once, no watch mode
npm run coverage                        # Jest with coverage (frontend/coverage/)
npm audit --omit=dev                    # dependency audit of shipped code
```

Quality numbers, decisions and open items are tracked in [`docs/quality-report.md`](docs/quality-report.md);
the module overview is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); see
[`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Start/Pause |
| T | Tap tempo |
| 1-9 | Set beats per measure |
| ← / → | Decrease/increase tempo by 5 BPM |
| P | Switch to Analog |
| C | Switch to Beat |
| G | Switch to Grid |
| M | Switch to Sequence |
| I | Toggle Info Overlay |
| R | Toggle Training Mode Settings |
| S | Toggle Settings Panel |
| Esc | Close any open overlay |
| U | Manual tempo increase (when in Manual Speed Training mode) |

## Design Philosophy

Libre Metronome bridges traditional musical pedagogy with modern technology, combining classic metronome functionality with interactive visualizations and advanced training features. The application is designed to be:

- **Intuitive** - Clear visual feedback and simple controls
- **Flexible** - Adaptable to different musical styles and practice needs
- **Educational** - Training modes to develop internal rhythm and technique
- **Open** - Free and open-source with customization options

### Style Guide

The binding product design tokens, responsive rules, interaction states, and
audio boundary are documented in [`docs/design-system.md`](docs/design-system.md).
The earlier visual reference remains available at
`frontend/src/docs/style-guide-reference.html` for historical comparison.

## Contributing

Contributions to Libre Metronome are welcome! The workflow, quality gates and review checklist are in
[`CONTRIBUTING.md`](CONTRIBUTING.md). In short:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas for Contribution

- Additional visualization modes
- New training features
- UI/UX improvements
- Performance optimizations
- Documentation and tutorials
- Translations

## Roadmap

- User accounts for saving metronome presets
- Add repeatable external loopback latency measurements for supported audio routes
- Prepare Android device installation and validation
- Advanced polyrhythm training features
- Integration with recording capabilities
- MIDI/hardware metronome sync options

## Status

Quality gates (lint, types, tests, coverage, audits) run in CI for every pull request; see [`docs/quality-report.md`](docs/quality-report.md). Version 0.8.0 ("Score" design: white interface, one blue accent, notation-style beat display) is built for web, Android, iPad, macOS and Linux desktop. The web deployment, the Google Play upload and the App Store release are pending. See `docs/app-release.md`, section 17, for what is verified and what is not.

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details or visit [https://www.gnu.org/licenses/gpl-3.0.html](https://www.gnu.org/licenses/gpl-3.0.html).

## Support Feature

Libre Metronome includes a "Support Me" feature that allows users to contribute financially to the project while keeping the app completely free, ad-free, and without premium features. This is implemented using Stripe payment links.

---

© 2025 Libre Metronome | GPL v3 License
