# Efecto Clone

A powerful retro image processing tool built with React. This application allows you to apply various artistic effects like Dithering, ASCII art, and Halftone patterns to images, webcam feeds, and generated 3D scenes in real-time.

## Features

### Input Sources
- **Image Upload**: Upload any image from your device.
- **Webcam**: Live video feed processing.
- **3D Cube**: A rotating 3D cube demo.
- **Shader**: An animated mesh gradient generator.

### Effects
- **Dithering**:
  - Algorithms: Floyd-Steinberg, Atkinson, Jarvis-Judice-Ninke, Sierra, Stucki.
  - Customizable point size and color palettes.
- **ASCII Art**: Converts images into text characters.
- **Halftone**: Creates a classic newspaper-style dot pattern.

### Adjustments
- **Source**: Brightness, Contrast, Saturation.
- **Effect**: Brightness, Contrast, Detail level.
- **Colors**: Custom Ink and Paper colors with preset themes.

### Interaction
- **Mouse Parallax**: 3D-like depth effect on the canvas based on mouse movement.

## Technologies
- React
- HTML5 Canvas API

## Getting Started

This project is a single-file React component (`efecto-final.jsx`). To run it, you can drop it into an existing React project or set up a simple Vite/CRA environment.

### Prerequisites
- Node.js
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/SkylarKitchen/efecto-clone.git
   ```
2. Install dependencies (if setting up a new project):
   ```bash
   npm install react react-dom
   ```

## License
MIT
