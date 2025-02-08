# Libre Metronome

## Overview

Libre Metronome is a modern, minimalist, and intuitive digital metronome application that merges classic musical functionality with a contemporary user interface. The application integrates analog elements (such as a circular display and an oscillating pointer) with modern technologies to provide musicians and educators with a powerful and flexible tool. The frontend is built in React, while the backend is based on Django, with a REST API for future enhancements like user management and preset functionality.

## Demonstration
https://github.com/user-attachments/assets/8fdc1b92-e328-4826-86a5-07a5d48fba0d

## Website
https://libremetronome.com/

## Version 0.1.0 | Beta Release
### Features

- **Circular Display:**  
  A circular interface reminiscent of an analog clock or rotary dial. Subdivisions are displayed as markers, with the first beat always accentuated and visually distinguished.

- **Dynamic Pointer:**  
  An animated pointer that shows the progression of beats in real-time. The pointer features a dynamic line width and a subtle glow effect to enhance the visual rhythm.

- **Interactive Controls:**  
  Easily adjustable parameters such as tempo, swing, and volume. The swing and volume values are displayed as percentages (0–100%), while the tempo is displayed in BPM.

- **Keyboard Interaction:**  
  In addition to mouse or touch controls, the application supports keyboard shortcuts (e.g., Space to start/pause, numeric keys to adjust subdivisions, and "T" for tap tempo).

- **Web Audio Integration:**  
  Uses the Web Audio API to ensure precise beat timing, with customizable accents and volume levels per beat.

- **REST API Backend:**  
  The Django-based backend includes a REST API for managing metronome settings, presets, and future user authentication.

## Technologies

- **Frontend:**  
  - React, JavaScript, HTML, CSS  
    (Modern frontend technologies for a responsive and user-friendly interface.)

- **Backend:**  
  - Django, Django REST Framework, Python  
    (A robust and scalable backend architecture, with RESTful endpoints for future enhancements.)

## Installation & Local Development

### Prerequisites

- Node.js (and npm)
- Python 3 (with pip and venv)

### Local Development

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/hybridpicker/LibreMetronome.git
   cd LibreMetronome
   ```

2. **Install and Start the Frontend:**
   ```bash
   cd frontend
   npm install
   npm start
   ```
   The frontend will be accessible at http://localhost:3000.

3. **Install and Start the Backend:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver
   ```
   The backend will run at http://127.0.0.1:8000.

## Contributing

Contributions to the development of Libre Metronome are welcome. Please open a pull request or create an issue with your suggestions, improvements, or bug reports. Ensure that new features are accompanied by appropriate tests.

## License

This project is licensed under the MIT License.

## Acknowledgements

Libre Metronome bridges traditional musical pedagogy with modern technology, providing a solid foundation for further artistic and educational initiatives.

