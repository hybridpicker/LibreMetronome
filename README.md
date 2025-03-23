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

- **Circle Mode** - Interactive circular beat visualization with customizable accents
- **Analog Mode** - Classic metronome with realistic pendulum animation
- **Grid Mode** - Visual grid pattern layout for complex rhythms and beat patterns
- **Multi Circle Mode** - Advanced polyrhythm practice with multiple independent circles and synchronized beat line visualization

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

### Backend
- Django
- Django REST Framework
- Python
- SQLite database

## Installation & Setup

### Prerequisites

- Node.js (v14+) and npm
- Python 3.8+ with pip and venv
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

#### Backend Setup

```bash
# Navigate to backend directory from project root
cd backend

# Create and activate virtual environment
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Load default sound sets
python manage.py check_sounds

# Start the Django development server
python manage.py runserver
```

The backend will run at http://localhost:8000

#### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/active-sound-set/` | Get currently active sound set |
| `/api/sound-sets/` | List all available sound sets |
| `/api/sound-sets/<id>/` | Get specific sound set details |
| `/api/sound-sets/<id>/set-active/` | Set sound set as active |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Start/Pause |
| T | Tap tempo |
| 1-9 | Set beats per measure |
| ← / → | Decrease/increase tempo by 5 BPM |
| P | Switch to Pendulum |
| C | Switch to Circle |
| G | Switch to Grid |
| M | Switch to Multi Circle |
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

For developers: A comprehensive style guide reference is available at `frontend/src/docs/style-guide-reference.html`. This document contains the color palette, typography, component styles, and CSS variables used throughout the application. The style guide is for developer reference only and is not displayed in the user interface.

## Contributing

Contributions to Libre Metronome are welcome! Please feel free to:

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
- Mobile app versions
- Advanced polyrhythm training features
- Integration with recording capabilities
- MIDI/hardware metronome sync options

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details or visit [https://www.gnu.org/licenses/gpl-3.0.html](https://www.gnu.org/licenses/gpl-3.0.html).

---

© 2025 Libre Metronome | GPL v3 License
