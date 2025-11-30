import React, { useState, useRef, useEffect, useCallback } from 'react';

// ==================== CONSTANTS ====================
const algorithms = {
  'Floyd-Steinberg': { matrix: [[0, 0, 7], [3, 5, 1]], divisor: 16, offset: 1 },
  'Atkinson': { matrix: [[0, 0, 1, 1], [1, 1, 1, 0], [0, 1, 0, 0]], divisor: 8, offset: 1 },
  'Jarvis-Judice-Ninke': { matrix: [[0, 0, 0, 7, 5], [3, 5, 7, 5, 3], [1, 3, 5, 3, 1]], divisor: 48, offset: 2 },
  'Sierra': { matrix: [[0, 0, 0, 5, 3], [2, 4, 5, 4, 2], [0, 2, 3, 2, 0]], divisor: 32, offset: 2 },
  'Stucki': { matrix: [[0, 0, 0, 8, 4], [2, 4, 8, 4, 2], [1, 2, 4, 2, 1]], divisor: 42, offset: 2 }
};

const palettes = [
  { ink: '#000000', bg: '#ffffff' },
  { ink: '#dc2626', bg: '#fef3c7' },
  { ink: '#7c3aed', bg: '#fce7f3' },
  { ink: '#059669', bg: '#d1fae5' },
  { ink: '#2563eb', bg: '#dbeafe' },
  { ink: '#ea580c', bg: '#ffedd5' }
];

const sampleGradients = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7']
];

const ASCII_CHARS = '@%#*+=-:. ';

// ==================== HELPER FUNCTIONS ====================
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
};

// ==================== MAIN COMPONENT ====================
export default function EfectoFinal() {
  // Input state
  const [inputMode, setInputMode] = useState('image');
  const [image, setImage] = useState(null);
  const [webcamActive, setWebcamActive] = useState(false);
  
  // Source adjustments (LEFT panel)
  const [srcBrightness, setSrcBrightness] = useState(1);
  const [srcContrast, setSrcContrast] = useState(1);
  const [srcSaturation, setSrcSaturation] = useState(1);
  
  // Interaction
  const [mouseParallax, setMouseParallax] = useState(false);
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
  
  // Effects state
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [effectType, setEffectType] = useState('Dither');
  const [algorithm, setAlgorithm] = useState('Floyd-Steinberg');
  const [pointSize, setPointSize] = useState(3);
  const [inkColor, setInkColor] = useState('#000000');
  const [paperColor, setPaperColor] = useState('#ffffff');
  
  // Effect adjustments (RIGHT panel)
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1.2);
  const [detail, setDetail] = useState(1);
  
  // 3D state
  const [rotation3D, setRotation3D] = useState({ x: 0, y: 0 });
  
  // Shader state
  const [shaderTime, setShaderTime] = useState(0);
  
  // UI state
  const [sectionsOpen, setSectionsOpen] = useState({
    adjustments: true, interaction: true, dithering: true, palette: true, imageAdj: true
  });
  
  // Refs
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const originalImageRef = useRef(null);
  const videoRef = useRef(null);
  const webcamLoopRef = useRef(null);
  const containerRef = useRef(null);

  const toggleSection = (key) => setSectionsOpen(prev => ({ ...prev, [key]: !prev[key] }));

  // ==================== SOURCE IMAGE PROCESSING ====================
  const processSourceImage = useCallback(() => {
    if (!originalImageRef.current) return null;
    
    const img = originalImageRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i], g = data[i + 1], b = data[i + 2];
      
      // Brightness
      r *= srcBrightness; g *= srcBrightness; b *= srcBrightness;
      
      // Contrast
      r = ((r / 255 - 0.5) * srcContrast + 0.5) * 255;
      g = ((g / 255 - 0.5) * srcContrast + 0.5) * 255;
      b = ((b / 255 - 0.5) * srcContrast + 0.5) * 255;
      
      // Saturation
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * srcSaturation;
      g = gray + (g - gray) * srcSaturation;
      b = gray + (b - gray) * srcSaturation;
      
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }, [srcBrightness, srcContrast, srcSaturation]);

  // ==================== DITHER EFFECT ====================
  const applyDither = useCallback((sourceCanvas) => {
    if (!sourceCanvas || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const scale = Math.max(1, Math.round(pointSize));
    const width = Math.floor(sourceCanvas.width / scale);
    const height = Math.floor(sourceCanvas.height / scale);
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.drawImage(sourceCanvas, 0, 0, width, height);
    const imageData = tempCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Apply adjustments
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let val = data[i + c];
        val = ((val / 255 - 0.5) * contrast + 0.5) * 255 * brightness;
        data[i + c] = Math.max(0, Math.min(255, val));
      }
    }
    
    // Grayscale
    const gray = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) * detail + (1 - detail) * 128;
    }
    
    // Error diffusion
    const { matrix, divisor, offset } = algorithms[algorithm];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldPixel = gray[idx];
        const newPixel = oldPixel < 128 ? 0 : 255;
        gray[idx] = newPixel;
        const error = oldPixel - newPixel;
        
        for (let dy = 0; dy < matrix.length; dy++) {
          for (let dx = 0; dx < matrix[dy].length; dx++) {
            const weight = matrix[dy][dx];
            if (weight === 0) continue;
            const nx = x + dx - offset, ny = y + dy;
            if (nx >= 0 && nx < width && ny < height) {
              gray[ny * width + nx] += (error * weight) / divisor;
            }
          }
        }
      }
    }
    
    // Apply colors
    const ink = hexToRgb(inkColor), paper = hexToRgb(paperColor);
    for (let i = 0; i < gray.length; i++) {
      const isInk = gray[i] < 128;
      data[i * 4] = isInk ? ink.r : paper.r;
      data[i * 4 + 1] = isInk ? ink.g : paper.g;
      data[i * 4 + 2] = isInk ? ink.b : paper.b;
      data[i * 4 + 3] = 255;
    }
    
    tempCtx.putImageData(imageData, 0, 0);
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
  }, [algorithm, pointSize, inkColor, paperColor, brightness, contrast, detail]);

  // ==================== ASCII EFFECT ====================
  const applyASCII = useCallback((sourceCanvas) => {
    if (!sourceCanvas || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const charW = 6, charH = 10;
    const cols = Math.floor(sourceCanvas.width / (charW * pointSize));
    const rows = Math.floor(sourceCanvas.height / (charH * pointSize));
    
    canvas.width = cols * charW * pointSize;
    canvas.height = rows * charH * pointSize;
    
    const paper = hexToRgb(paperColor);
    ctx.fillStyle = `rgb(${paper.r},${paper.g},${paper.b})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const temp = document.createElement('canvas');
    temp.width = cols; temp.height = rows;
    const tCtx = temp.getContext('2d');
    tCtx.drawImage(sourceCanvas, 0, 0, cols, rows);
    const data = tCtx.getImageData(0, 0, cols, rows).data;
    
    const ink = hexToRgb(inkColor);
    ctx.fillStyle = `rgb(${ink.r},${ink.g},${ink.b})`;
    ctx.font = `${10 * pointSize}px monospace`;
    ctx.textBaseline = 'top';
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = (y * cols + x) * 4;
        let g = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
        g = Math.max(0, Math.min(255, ((g / 255 - 0.5) * contrast + 0.5) * 255 * brightness));
        ctx.fillText(ASCII_CHARS[Math.floor((g / 255) * (ASCII_CHARS.length - 1))], x * charW * pointSize, y * charH * pointSize);
      }
    }
  }, [pointSize, inkColor, paperColor, brightness, contrast]);

  // ==================== HALFTONE EFFECT ====================
  const applyHalftone = useCallback((sourceCanvas) => {
    if (!sourceCanvas || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const spacing = pointSize * 4;
    const maxR = spacing / 2;
    
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    
    const paper = hexToRgb(paperColor);
    ctx.fillStyle = `rgb(${paper.r},${paper.g},${paper.b})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const cols = Math.ceil(canvas.width / spacing);
    const rows = Math.ceil(canvas.height / spacing);
    const temp = document.createElement('canvas');
    temp.width = cols; temp.height = rows;
    const tCtx = temp.getContext('2d');
    tCtx.drawImage(sourceCanvas, 0, 0, cols, rows);
    const data = tCtx.getImageData(0, 0, cols, rows).data;
    
    const ink = hexToRgb(inkColor);
    ctx.fillStyle = `rgb(${ink.r},${ink.g},${ink.b})`;
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = (y * cols + x) * 4;
        let g = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
        g = Math.max(0, Math.min(255, ((g / 255 - 0.5) * contrast + 0.5) * 255 * brightness));
        const r = ((255 - g) / 255) * maxR * detail;
        if (r > 0.5) {
          ctx.beginPath();
          ctx.arc(x * spacing + spacing / 2, y * spacing + spacing / 2, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [pointSize, inkColor, paperColor, brightness, contrast, detail]);

  // ==================== EFFECT DISPATCHER ====================
  const applyEffect = useCallback(() => {
    if (!effectsEnabled) {
      const src = processSourceImage();
      if (src && canvasRef.current) {
        canvasRef.current.width = src.width;
        canvasRef.current.height = src.height;
        canvasRef.current.getContext('2d').drawImage(src, 0, 0);
      }
      return;
    }
    
    const src = processSourceImage();
    if (!src) return;
    
    if (effectType === 'ASCII') applyASCII(src);
    else if (effectType === 'Halftone') applyHalftone(src);
    else applyDither(src);
  }, [effectsEnabled, effectType, processSourceImage, applyDither, applyASCII, applyHalftone]);

  // ==================== 3D CUBE RENDERER ====================
  const render3D = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    // Background
    const grad = ctx.createLinearGradient(0, 0, 400, 400);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#16213e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 400);
    
    const cx = 200, cy = 200, size = 120;
    const ax = rotation3D.x * Math.PI / 180;
    const ay = rotation3D.y * Math.PI / 180;
    
    const verts = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
    const proj = verts.map(([x, y, z]) => {
      const x1 = x * Math.cos(ay) - z * Math.sin(ay);
      const z1 = x * Math.sin(ay) + z * Math.cos(ay);
      const y1 = y * Math.cos(ax) - z1 * Math.sin(ax);
      const z2 = y * Math.sin(ax) + z1 * Math.cos(ax);
      const s = 200 / (z2 + 4);
      return [cx + x1 * size * s / 100, cy + y1 * size * s / 100, z2];
    });
    
    const faces = [[0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[0,3,7,4],[1,2,6,5]];
    const colors = ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#7c3aed','#5b21b6'];
    
    faces.map((f, i) => ({ f, c: colors[i], z: f.reduce((s, v) => s + proj[v][2], 0) / 4 }))
      .sort((a, b) => a.z - b.z)
      .forEach(({ f, c }) => {
        ctx.beginPath();
        ctx.moveTo(proj[f[0]][0], proj[f[0]][1]);
        f.slice(1).forEach(v => ctx.lineTo(proj[v][0], proj[v][1]));
        ctx.closePath();
        ctx.fillStyle = c; ctx.fill();
        ctx.strokeStyle = '#ffffff33'; ctx.stroke();
      });
    
    const img = new Image();
    img.onload = () => { originalImageRef.current = img; setImage(canvas.toDataURL()); };
    img.src = canvas.toDataURL();
  }, [rotation3D]);

  // ==================== SHADER RENDERER ====================
  const renderShader = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    // Animated mesh gradient
    const t = shaderTime * 0.02;
    
    // Background
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(0, 0, 400, 400);
    
    // Create multiple overlapping radial gradients
    const centers = [
      { x: 100 + Math.sin(t) * 50, y: 100 + Math.cos(t) * 50, colors: ['#ff6b6b', 'transparent'] },
      { x: 300 + Math.cos(t * 0.7) * 60, y: 150 + Math.sin(t * 0.7) * 60, colors: ['#4ecdc4', 'transparent'] },
      { x: 200 + Math.sin(t * 1.2) * 40, y: 300 + Math.cos(t * 1.2) * 40, colors: ['#ffe66d', 'transparent'] },
      { x: 350 + Math.cos(t * 0.5) * 30, y: 350 + Math.sin(t * 0.5) * 30, colors: ['#95e1d3', 'transparent'] }
    ];
    
    ctx.globalCompositeOperation = 'screen';
    centers.forEach(({ x, y, colors }) => {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 200);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(1, colors[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 400);
    });
    ctx.globalCompositeOperation = 'source-over';
    
    const img = new Image();
    img.onload = () => { originalImageRef.current = img; setImage(canvas.toDataURL()); };
    img.src = canvas.toDataURL();
  }, [shaderTime]);

  // ==================== WEBCAM ====================
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setWebcamActive(true);
      }
    } catch (err) {
      console.error('Webcam error:', err);
      alert('Could not access webcam. Please ensure camera permissions are granted.');
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    if (webcamLoopRef.current) {
      cancelAnimationFrame(webcamLoopRef.current);
      webcamLoopRef.current = null;
    }
    setWebcamActive(false);
  }, []);

  // Webcam frame capture loop
  useEffect(() => {
    if (!webcamActive || inputMode !== 'webcam') return;
    
    const captureFrame = () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        const temp = document.createElement('canvas');
        temp.width = videoRef.current.videoWidth || 640;
        temp.height = videoRef.current.videoHeight || 480;
        temp.getContext('2d').drawImage(videoRef.current, 0, 0);
        
        const img = new Image();
        img.onload = () => { originalImageRef.current = img; setImage(temp.toDataURL()); };
        img.src = temp.toDataURL();
      }
      webcamLoopRef.current = requestAnimationFrame(captureFrame);
    };
    
    captureFrame();
    return () => {
      if (webcamLoopRef.current) cancelAnimationFrame(webcamLoopRef.current);
    };
  }, [webcamActive, inputMode]);

  // ==================== IMAGE LOADING ====================
  const loadSampleImage = (idx) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    const [c1, c2] = sampleGradients[idx];
    const grad = ctx.createLinearGradient(0, 0, 400, 300);
    grad.addColorStop(0, c1); grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 300);
    
    // Add visual elements
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(120, 120, 80, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(280, 180, 60, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    
    const img = new Image();
    img.onload = () => { originalImageRef.current = img; setImage(canvas.toDataURL()); };
    img.src = canvas.toDataURL();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 500;
        let w = img.width, h = img.height;
        if (Math.max(w, h) > maxDim) {
          const s = maxDim / Math.max(w, h);
          w *= s; h *= s;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        
        const resized = new Image();
        resized.onload = () => { originalImageRef.current = resized; setImage(canvas.toDataURL()); };
        resized.src = canvas.toDataURL();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // ==================== MOUSE PARALLAX ====================
  const handleMouseMove = useCallback((e) => {
    if (!mouseParallax || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
    setParallaxOffset({ x: x * 20, y: y * 20 });
  }, [mouseParallax]);

  // ==================== EFFECTS ====================
  // Mode change handler
  useEffect(() => {
    if (inputMode === 'webcam') {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [inputMode, startWebcam, stopWebcam]);

  // 3D auto-rotate
  useEffect(() => {
    if (inputMode !== '3d') return;
    render3D();
    const interval = setInterval(() => setRotation3D(p => ({ x: p.x + 0.5, y: p.y + 1 })), 50);
    return () => clearInterval(interval);
  }, [inputMode, rotation3D, render3D]);

  // Shader animation
  useEffect(() => {
    if (inputMode !== 'shader') return;
    renderShader();
    const interval = setInterval(() => setShaderTime(t => t + 1), 50);
    return () => clearInterval(interval);
  }, [inputMode, shaderTime, renderShader]);

  // Apply effect when image or settings change
  useEffect(() => {
    if (image) applyEffect();
  }, [image, applyEffect]);

  const selectPalette = (p) => { setInkColor(p.ink); setPaperColor(p.bg); };

  const downloadImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `efecto-${effectType.toLowerCase()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  // ==================== RENDER ====================
  return (
    <div style={styles.container}>
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.logo}>efecto</h1>
        <div style={styles.headerRight}>
          <IconBtn><SparkleIcon /></IconBtn>
          <IconBtn><SettingsIcon /></IconBtn>
          <div style={styles.divider} />
          <Btn onClick={downloadImage} primary><CameraIcon /> Capture</Btn>
          <Btn><span style={styles.recordDot} /> Record</Btn>
          <Btn outline>&lt;/&gt; Get Code</Btn>
        </div>
      </header>

      <div style={styles.main}>
        {/* Left Panel */}
        <div style={styles.leftPanel}>
          <div style={styles.panelContent}>
            <h2 style={styles.sectionTitle}>Input Source</h2>
            
            <div style={styles.tabs}>
              {[
                { id: '3d', icon: <CubeIcon />, label: '3D' },
                { id: 'webcam', icon: <VideoIcon />, label: 'Webcam' },
                { id: 'image', icon: <ImageIcon />, label: 'Image' },
                { id: 'shader', icon: <SparkleIcon />, label: 'Shader' }
              ].map(({ id, icon }) => (
                <button key={id} onClick={() => setInputMode(id)} style={{ ...styles.tab, backgroundColor: inputMode === id ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
                  <span style={{ color: inputMode === id ? 'white' : '#6b7280' }}>{icon}</span>
                </button>
              ))}
            </div>

            {inputMode === 'image' && (
              <>
                <button onClick={() => fileInputRef.current?.click()} style={styles.uploadBtn}>
                  <UploadIcon /> Upload
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                <div style={styles.sampleGrid}>
                  {sampleGradients.map((c, i) => (
                    <button key={i} onClick={() => loadSampleImage(i)} style={{ ...styles.sampleBtn, background: `linear-gradient(135deg, ${c[0]}, ${c[1]})` }} />
                  ))}
                </div>
              </>
            )}

            {inputMode === 'webcam' && (
              <div style={styles.modeInfo}>
                <div style={{ ...styles.statusDot, backgroundColor: webcamActive ? '#22c55e' : '#ef4444' }} />
                <span style={{ color: '#9ca3af', fontSize: 13 }}>{webcamActive ? 'Webcam active - streaming live' : 'Starting webcam...'}</span>
              </div>
            )}

            {inputMode === '3d' && (
              <div style={styles.modeInfo}>
                <CubeIcon />
                <span style={{ color: '#9ca3af', fontSize: 13, marginLeft: 8 }}>3D Cube • Rotation: {Math.round(rotation3D.y) % 360}°</span>
              </div>
            )}

            {inputMode === 'shader' && (
              <div style={styles.modeInfo}>
                <SparkleIcon />
                <span style={{ color: '#9ca3af', fontSize: 13, marginLeft: 8 }}>Animated Mesh Gradient</span>
              </div>
            )}

            <Section title="Adjustments" open={sectionsOpen.adjustments} toggle={() => toggleSection('adjustments')}>
              <Slider label="Brightness" value={srcBrightness} onChange={setSrcBrightness} min={0.5} max={2} />
              <Slider label="Contrast" value={srcContrast} onChange={setSrcContrast} min={0.5} max={2} />
              <Slider label="Saturation" value={srcSaturation} onChange={setSrcSaturation} min={0} max={2} />
            </Section>

            <Section title="Interaction" open={sectionsOpen.interaction} toggle={() => toggleSection('interaction')}>
              <div style={styles.toggleRow}>
                <span style={styles.toggleLabel}>Mouse Parallax</span>
                <Toggle value={mouseParallax} onChange={setMouseParallax} />
              </div>
            </Section>
          </div>

          <div style={styles.footer}>
            <p style={styles.footerText}>Made by Pablo Stanley</p>
          </div>
        </div>

        {/* Canvas */}
        <div ref={containerRef} style={styles.canvasArea} onMouseMove={handleMouseMove} onMouseLeave={() => setParallaxOffset({ x: 0, y: 0 })}>
          {image ? (
            <canvas ref={canvasRef} style={{
              ...styles.canvas,
              transform: mouseParallax ? `perspective(1000px) rotateY(${parallaxOffset.x}deg) rotateX(${-parallaxOffset.y}deg)` : 'none',
              transition: mouseParallax ? 'transform 0.1s ease-out' : 'none'
            }} />
          ) : (
            <div style={styles.placeholder}>
              <p style={{ fontSize: 16, marginBottom: 8, margin: 0 }}>No image selected</p>
              <p style={{ fontSize: 14, margin: 0, marginTop: 8 }}>Choose an input source</p>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div style={styles.rightPanel}>
          <div style={styles.panelContent}>
            <div style={styles.effectsHeader}>
              <h2 style={styles.effectsTitle}>Effects</h2>
              <Toggle value={effectsEnabled} onChange={setEffectsEnabled} />
            </div>

            <div style={styles.tabs}>
              {['ASCII', 'Dither', 'Halftone'].map((t) => (
                <button key={t} onClick={() => setEffectType(t)} style={{ ...styles.effectTab, backgroundColor: effectType === t ? 'rgba(255,255,255,0.1)' : 'transparent', color: effectType === t ? 'white' : '#6b7280' }}>
                  {t}
                </button>
              ))}
            </div>

            <Section title="Dithering Settings" open={sectionsOpen.dithering} toggle={() => toggleSection('dithering')}>
              <div style={styles.selectWrapper}>
                <label style={styles.selectLabel}>Algorithm</label>
                <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)} style={styles.select}>
                  {Object.keys(algorithms).map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <Slider label="Point Size" value={pointSize} onChange={setPointSize} min={1} max={8} step={1} />
            </Section>

            <Section title="Color Palette" open={sectionsOpen.palette} toggle={() => toggleSection('palette')}>
              <div style={styles.paletteGrid}>
                {palettes.map((p, i) => (
                  <button key={i} onClick={() => selectPalette(p)} style={{ ...styles.paletteBtn, background: `linear-gradient(135deg, ${p.bg} 50%, ${p.ink} 50%)`, border: inkColor === p.ink ? '2px solid white' : '2px solid transparent' }} />
                ))}
              </div>
              <div style={styles.colorPickers}>
                <ColorPicker label="Ink" value={inkColor} onChange={setInkColor} />
                <ColorPicker label="Paper" value={paperColor} onChange={setPaperColor} />
              </div>
            </Section>

            <Section title="Image Adjustments" open={sectionsOpen.imageAdj} toggle={() => toggleSection('imageAdj')}>
              <Slider label="Brightness" value={brightness} onChange={setBrightness} min={0.5} max={2} />
              <Slider label="Contrast" value={contrast} onChange={setContrast} min={0.5} max={2} />
              <Slider label="Detail" value={detail} onChange={setDetail} min={0.5} max={1.5} />
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================
const IconBtn = ({ children, onClick }) => <button onClick={onClick} style={styles.iconBtn}>{children}</button>;

const Btn = ({ children, onClick, primary, outline }) => (
  <button onClick={onClick} style={{ ...styles.button, ...(primary ? styles.buttonPrimary : {}), ...(outline ? styles.buttonOutline : {}) }}>{children}</button>
);

const Section = ({ title, open, toggle, children }) => (
  <div style={styles.section}>
    <button onClick={toggle} style={styles.sectionHeader}>
      <span>{title}</span>
      <ChevronIcon style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
    </button>
    {open && <div>{children}</div>}
  </div>
);

const Slider = ({ label, value, onChange, min = 0, max = 1, step = 0.01 }) => (
  <div style={styles.slider}>
    <div style={styles.sliderHeader}>
      <span style={styles.sliderLabel}>{label}</span>
      <span style={styles.sliderValue}>{Number(value).toFixed(step >= 1 ? 0 : 2)}</span>
    </div>
    <input type="range" value={value} onChange={(e) => onChange(parseFloat(e.target.value))} min={min} max={max} step={step} style={styles.sliderInput} />
  </div>
);

const Toggle = ({ value, onChange }) => (
  <button onClick={() => onChange(!value)} style={{ ...styles.toggle, backgroundColor: value ? '#6366f1' : '#374151' }}>
    <div style={{ ...styles.toggleKnob, transform: value ? 'translateX(20px)' : 'translateX(0)' }} />
  </button>
);

const ColorPicker = ({ label, value, onChange }) => (
  <div style={styles.colorPicker}>
    <label style={styles.colorLabel}>{label}</label>
    <div style={styles.colorInputWrapper}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={styles.colorInput} />
    </div>
  </div>
);

// ==================== ICONS ====================
const SparkleIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;
const SettingsIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const CameraIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const CubeIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>;
const VideoIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const ImageIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const UploadIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const ChevronIcon = ({ style }) => <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={style}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;

// ==================== STYLES ====================
const styles = {
  container: { minHeight: '100vh', backgroundColor: '#0a0a0a', color: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' },
  header: { height: 56, backgroundColor: '#141414', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 },
  logo: { fontSize: 18, fontWeight: 600, letterSpacing: '-0.025em', margin: 0 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  divider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 8px' },
  main: { display: 'flex', flex: 1, overflow: 'hidden' },
  leftPanel: { width: 280, backgroundColor: '#141414', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  rightPanel: { width: 280, backgroundColor: '#141414', borderLeft: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto' },
  panelContent: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: '#9ca3af', marginBottom: 12, marginTop: 0 },
  tabs: { display: 'flex', backgroundColor: '#1a1a1a', borderRadius: 8, padding: 4, marginBottom: 16, gap: 2 },
  tab: { flex: 1, padding: 8, borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  effectTab: { flex: 1, padding: '8px 12px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  uploadBtn: { width: '100%', padding: '10px 16px', backgroundColor: 'transparent', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 8, color: '#9ca3af', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  sampleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 },
  sampleBtn: { aspectRatio: '4/3', borderRadius: 8, border: '2px solid transparent', cursor: 'pointer', minHeight: 60 },
  modeInfo: { display: 'flex', alignItems: 'center', padding: 12, backgroundColor: '#1a1a1a', borderRadius: 8, marginBottom: 16 },
  statusDot: { width: 8, height: 8, borderRadius: '50%', marginRight: 8 },
  footer: { marginTop: 'auto', padding: 16, borderTop: '1px solid rgba(255,255,255,0.05)' },
  footerText: { fontSize: 12, color: '#4b5563', margin: 0 },
  canvasArea: { flex: 1, backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  canvas: { maxWidth: '100%', maxHeight: '100%', imageRendering: 'pixelated' },
  placeholder: { textAlign: 'center', color: '#4b5563' },
  effectsHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  effectsTitle: { fontSize: 14, fontWeight: 600, margin: 0 },
  section: { marginBottom: 16 },
  sectionHeader: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, marginBottom: 12, border: 'none', backgroundColor: 'transparent', color: '#9ca3af', fontSize: 13, cursor: 'pointer' },
  selectWrapper: { marginBottom: 12 },
  selectLabel: { fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 },
  select: { width: '100%', backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: 'white', fontSize: 13, cursor: 'pointer', outline: 'none' },
  paletteGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 12 },
  paletteBtn: { aspectRatio: '1', borderRadius: 8, cursor: 'pointer', minHeight: 32 },
  colorPickers: { display: 'flex', gap: 12 },
  colorPicker: { flex: 1 },
  colorLabel: { fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 },
  colorInputWrapper: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#1a1a1a', borderRadius: 8, padding: '6px 10px', border: '1px solid rgba(255,255,255,0.05)' },
  colorInput: { width: 24, height: 24, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 },
  slider: { marginBottom: 12 },
  sliderHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  sliderLabel: { fontSize: 13, color: '#6b7280' },
  sliderValue: { fontSize: 13, color: '#9ca3af', fontFamily: 'monospace' },
  sliderInput: { width: '100%', height: 4, borderRadius: 2, background: '#374151', appearance: 'none', cursor: 'pointer', accentColor: '#3b82f6' },
  toggle: { width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', transition: 'background-color 0.2s' },
  toggleKnob: { width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', transition: 'transform 0.2s' },
  toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 13, color: '#9ca3af' },
  iconBtn: { padding: 8, borderRadius: 8, border: 'none', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  button: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', backgroundColor: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  buttonPrimary: { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' },
  buttonOutline: { backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)' },
  recordDot: { width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }
};
