import React, { useState, useRef, useEffect, useCallback } from 'react';

// Dithering algorithms
const algorithms = {
  'Floyd-Steinberg': [
    [0, 0, 7/16],
    [3/16, 5/16, 1/16]
  ],
  'Atkinson': [
    [0, 0, 1/8, 1/8],
    [1/8, 1/8, 1/8, 0],
    [0, 1/8, 0, 0]
  ],
  'Jarvis-Judice-Ninke': [
    [0, 0, 0, 7/48, 5/48],
    [3/48, 5/48, 7/48, 5/48, 3/48],
    [1/48, 3/48, 5/48, 3/48, 1/48]
  ],
  'Sierra': [
    [0, 0, 0, 5/32, 3/32],
    [2/32, 4/32, 5/32, 4/32, 2/32],
    [0, 2/32, 3/32, 2/32, 0]
  ],
  'Stucki': [
    [0, 0, 0, 8/42, 4/42],
    [2/42, 4/42, 8/42, 4/42, 2/42],
    [1/42, 2/42, 4/42, 2/42, 1/42]
  ]
};

// Color palettes
const palettes = [
  { ink: '#000000', bg: '#ffffff', name: 'B/W' },
  { ink: '#1e3a8a', bg: '#fbbf24', name: 'Blue/Gold' },
  { ink: '#991b1b', bg: '#fef3c7', name: 'Red/Cream' },
  { ink: '#6b21a8', bg: '#fce7f3', name: 'Purple/Pink' },
  { ink: '#166534', bg: '#dcfce7', name: 'Green/Mint' },
  { ink: '#1e40af', bg: '#dbeafe', name: 'Blue/Sky' },
  { ink: '#9a3412', bg: '#fed7aa', name: 'Rust/Peach' },
  { ink: '#0f172a', bg: '#f1f5f9', name: 'Slate/Light' }
];

export default function EfectoClone() {
  const [image, setImage] = useState(null);
  const [effectType, setEffectType] = useState('Dither');
  const [algorithm, setAlgorithm] = useState('Floyd-Steinberg');
  const [pointSize, setPointSize] = useState(3);
  const [inkColor, setInkColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [brightness, setBrightness] = useState(1.2);
  const [contrast, setContrast] = useState(1.2);
  const [detail, setDetail] = useState(0.9);
  const [isDragging, setIsDragging] = useState(false);
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const originalImageRef = useRef(null);

  // Apply dithering effect
  const applyDither = useCallback(() => {
    if (!originalImageRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = originalImageRef.current;
    
    // Calculate dimensions based on point size
    const scale = Math.max(1, pointSize);
    const width = Math.floor(img.width / scale);
    const height = Math.floor(img.height / scale);
    
    // Create temp canvas for processing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Draw scaled image
    tempCtx.drawImage(img, 0, 0, width, height);
    const imageData = tempCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Apply brightness and contrast
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let val = data[i + c];
        val = ((val / 255 - 0.5) * contrast + 0.5) * 255;
        val = val * brightness;
        data[i + c] = Math.max(0, Math.min(255, val));
      }
    }
    
    // Convert to grayscale with detail adjustment
    const gray = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const idx = i / 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      gray[idx] = (0.299 * r + 0.587 * g + 0.114 * b) * detail + (1 - detail) * 128;
    }
    
    // Apply error diffusion dithering
    const matrix = algorithms[algorithm];
    const offset = algorithm === 'Floyd-Steinberg' ? 1 : 2;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldPixel = gray[idx];
        const newPixel = oldPixel < 128 ? 0 : 255;
        gray[idx] = newPixel;
        const error = oldPixel - newPixel;
        
        // Distribute error
        for (let dy = 0; dy < matrix.length; dy++) {
          for (let dx = 0; dx < matrix[dy].length; dx++) {
            const nx = x + dx - offset;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny < height && matrix[dy][dx] > 0) {
              gray[ny * width + nx] += error * matrix[dy][dx];
            }
          }
        }
      }
    }
    
    // Parse colors
    const ink = hexToRgb(inkColor);
    const bg = hexToRgb(bgColor);
    
    // Apply colors to output
    for (let i = 0; i < gray.length; i++) {
      const pixelIdx = i * 4;
      const isInk = gray[i] < 128;
      data[pixelIdx] = isInk ? ink.r : bg.r;
      data[pixelIdx + 1] = isInk ? ink.g : bg.g;
      data[pixelIdx + 2] = isInk ? ink.b : bg.b;
      data[pixelIdx + 3] = 255;
    }
    
    tempCtx.putImageData(imageData, 0, 0);
    
    // Scale up to display canvas
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
  }, [algorithm, pointSize, inkColor, bgColor, brightness, contrast, detail]);

  // Load and process image
  const loadImage = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        originalImageRef.current = img;
        setImage(e.target.result);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Handle file drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadImage(file);
    }
  };

  // Handle file input
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) loadImage(file);
  };

  // Apply effect when parameters change
  useEffect(() => {
    if (image) applyDither();
  }, [image, applyDither]);

  // Select palette
  const selectPalette = (palette) => {
    setInkColor(palette.ink);
    setBgColor(palette.bg);
  };

  // Download image
  const downloadImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'efecto-dither.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-blue-500 to-fuchsia-500 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">efecto</h1>
          <div className="flex gap-2">
            <button
              onClick={downloadImage}
              disabled={!image}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium backdrop-blur-sm transition-all"
            >
              Capture
            </button>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Canvas Area */}
          <div
            className={`flex-1 bg-black/20 backdrop-blur-xl rounded-2xl overflow-hidden flex items-center justify-center min-h-[400px] lg:min-h-[600px] transition-all ${isDragging ? 'ring-4 ring-white/50' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !image && fileInputRef.current?.click()}
          >
            {!image ? (
              <div className="text-center text-white/70 p-8 cursor-pointer">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-lg font-medium mb-1">Drop an image here</p>
                <p className="text-sm opacity-70">or click to browse</p>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[600px] object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Controls Panel */}
          <div className="w-full lg:w-80 bg-gray-900/95 backdrop-blur-xl rounded-2xl p-5 text-white">
            {/* Effect Type Tabs */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-400 mb-3">Effects</h2>
              <div className="flex gap-2">
                {['ASCII', 'Dither', 'Halftone'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setEffectType(type)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      effectType === type
                        ? 'bg-white/20 text-white'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Dithering Settings */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-400 mb-3">Dithering Settings</h2>
              
              {/* Algorithm */}
              <div className="mb-4">
                <label className="text-xs text-gray-500 mb-1 block">Algorithm</label>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.keys(algorithms).map((alg) => (
                    <option key={alg} value={alg}>{alg}</option>
                  ))}
                </select>
              </div>

              {/* Point Size */}
              <Slider
                label="Point Size"
                value={pointSize}
                onChange={setPointSize}
                min={1}
                max={10}
                step={1}
              />
            </div>

            {/* Color Palette */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-400 mb-3">Color Palette</h2>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {palettes.map((palette, i) => (
                  <button
                    key={i}
                    onClick={() => selectPalette(palette)}
                    className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      inkColor === palette.ink && bgColor === palette.bg
                        ? 'border-white scale-105'
                        : 'border-transparent hover:border-white/50'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${palette.bg} 50%, ${palette.ink} 50%)`
                    }}
                    title={palette.name}
                  />
                ))}
              </div>
              
              {/* Custom Colors */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Ink</label>
                  <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
                    <input
                      type="color"
                      value={inkColor}
                      onChange={(e) => setInkColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={inkColor}
                      onChange={(e) => setInkColor(e.target.value)}
                      className="flex-1 bg-transparent text-xs font-mono focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">BG</label>
                  <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1 bg-transparent text-xs font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Image Adjustments */}
            <div>
              <h2 className="text-sm font-semibold text-gray-400 mb-3">Image Adjustments</h2>
              <Slider
                label="Brightness"
                value={brightness}
                onChange={setBrightness}
                min={0.5}
                max={2}
                step={0.01}
              />
              <Slider
                label="Contrast"
                value={contrast}
                onChange={setContrast}
                min={0.5}
                max={2}
                step={0.01}
              />
              <Slider
                label="Detail"
                value={detail}
                onChange={setDetail}
                min={0.5}
                max={1}
                step={0.01}
              />
            </div>

            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full mt-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-xl text-sm font-semibold transition-all"
            >
              Upload Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Slider Component
function Slider({ label, value, onChange, min, max, step }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-400 font-mono">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}

// Helper: hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}
