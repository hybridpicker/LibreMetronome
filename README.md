![Logo](https://github.com/user-attachments/assets/ee0a4ccc-fc09-4024-a4e3-1b95b333ae59)
---
![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)

Libre Metronome is a modern, minimalist, and intuitive digital metronome application that merges classic musical functionality with a contemporary user interface. The application integrates analog elements (such as a circular display and an oscillating pointer) with modern technologies to provide musicians and educators with a powerful and flexible tool. The frontend is built in React, while the backend is based on Django, with a REST API for future enhancements like user management and preset functionality.

## Demonstration
https://github.com/user-attachments/assets/d255a73b-2f0c-4033-a95f-5425acbc932e

## Website
[Libre Metronome](https://libremetronome.com/)

## Features

- **Multiple Modes:**  
  Users can choose between different visual representations to suit their preferences and workflow. The **Advanced Circle Mode** offers a refined circular display with dynamic elements, the **Analog Mode** mimics a classic metronome with an oscillating pointer, and the **Grid Mode** provides a structured visual approach with beat subdivisions.

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
   The backend will run at http://localhost:8000.

## Contributing

Contributions to the development of Libre Metronome are welcome. Please open a pull request or create an issue with your suggestions, improvements, or bug reports. Ensure that new features are accompanied by appropriate tests.

## License
This project is licensed under the **GNU General Public License v3.0**.  
You can find the full license text in the `LICENSE` file or at  
[https://www.gnu.org/licenses/gpl-3.0.html](https://www.gnu.org/licenses/gpl-3.0.html).

## Acknowledgements

Libre Metronome bridges traditional musical pedagogy with modern technology, providing a solid foundation for further artistic and educational initiatives.

