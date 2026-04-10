import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import useImage from './hooks/useImage';
import Toolbar from './components/Toolbar';
import FurnitureItem from './components/FurnitureItem';
import CalibrationLine from './components/CalibrationLine';
import CalibrationModal from './components/CalibrationModal';
import ClearConfirmModal from './components/ClearConfirmModal';
import FurniturePanel from './components/FurniturePanel';
import './App.css';

function App() {
  const [floorPlanUrl, setFloorPlanUrl] = useState(null);
  const [floorPlanImage] = useImage(floorPlanUrl);
  const [furniture, setFurniture] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [pixelsPerInch, setPixelsPerInch] = useState(null); // Core calibration value
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationLine, setCalibrationLine] = useState(null);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const stageRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load floor plan from localStorage on mount
  useEffect(() => {
    const savedFloorPlan = localStorage.getItem('floorPlanImage');
    if (savedFloorPlan) {
      setFloorPlanUrl(savedFloorPlan);
    }
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle file upload
  const handleFileUpload = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setFloorPlanUrl(dataUrl);
      localStorage.setItem('floorPlanImage', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Start calibration mode
  const startCalibration = () => {
    setIsCalibrating(true);
    setCalibrationLine(null);
  };

  // Handle calibration line drawing on stage click
  const handleStageClick = (e) => {
    if (!isCalibrating) return;

    const stage = stageRef.current;
    const pos = stage.getPointerPosition();

    if (!calibrationLine) {
      // First click — anchor start; end follows pointer until second click
      setCalibrationLine({ start: pos, end: pos, phase: 'drawing' });
    } else if (calibrationLine.phase === 'drawing') {
      // Second click — lock end and open length dialog
      setCalibrationLine({ ...calibrationLine, end: pos, phase: 'locked' });
      setShowCalibrationModal(true);
    }
  };

  // Handle mouse move during calibration (live preview of line end)
  const handleStageMouseMove = (e) => {
    if (!isCalibrating || !calibrationLine || calibrationLine.phase !== 'drawing') return;

    const stage = stageRef.current;
    const pos = stage.getPointerPosition();
    setCalibrationLine({ ...calibrationLine, end: pos });
  };

  // Calculate pixels per inch from calibration
  const handleCalibrationSubmit = (feet, inches) => {
    if (!calibrationLine) return;

    const totalInches = feet * 12 + inches;
    const lineLength = Math.sqrt(
      Math.pow(calibrationLine.end.x - calibrationLine.start.x, 2) +
      Math.pow(calibrationLine.end.y - calibrationLine.start.y, 2)
    );

    /**
     * SCALE CALCULATION:
     * pixelsPerInch = total pixels in drawn line / total inches in real world
     * This ratio is used to convert all real-world dimensions to canvas pixels
     */
    const ppi = lineLength / totalInches;
    setPixelsPerInch(ppi);
    setIsCalibrating(false);
    setCalibrationLine(null);
    setShowCalibrationModal(false);
    alert(`Calibration set! ${ppi.toFixed(2)} pixels per inch`);
  };

  // Add furniture item
  const addFurniture = (type, widthFeet, widthInches, depthFeet, depthInches) => {
    if (!pixelsPerInch) {
      alert('Please calibrate the floor plan first!');
      return;
    }

    const totalWidthInches = widthFeet * 12 + widthInches;
    const totalDepthInches = depthFeet * 12 + depthInches;

    /**
     * FURNITURE SIZE CALCULATION:
     * Canvas width = real width in inches × pixelsPerInch
     * Canvas height = real depth in inches × pixelsPerInch
     */
    const newItem = {
      id: Date.now().toString(),
      type,
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
      width: totalWidthInches * pixelsPerInch,
      height: totalDepthInches * pixelsPerInch,
      rotation: 0,
      realWidth: { feet: widthFeet, inches: widthInches },
      realDepth: { feet: depthFeet, inches: depthInches },
    };

    setFurniture([...furniture, newItem]);
  };

  // Update furniture dimensions
  const updateFurniture = (id, widthFeet, widthInches, depthFeet, depthInches) => {
    const totalWidthInches = widthFeet * 12 + widthInches;
    const totalDepthInches = depthFeet * 12 + depthInches;

    setFurniture(furniture.map(item =>
      item.id === id
        ? {
            ...item,
            width: totalWidthInches * pixelsPerInch,
            height: totalDepthInches * pixelsPerInch,
            realWidth: { feet: widthFeet, inches: widthInches },
            realDepth: { feet: depthFeet, inches: depthInches },
          }
        : item
    ));
  };

  const deleteFurniture = useCallback((id) => {
    setFurniture((prev) => prev.filter((item) => item.id !== id));
    setSelectedId((sel) => (sel === id ? null : sel));
  }, []);

  const hasCanvasContent = !!floorPlanUrl || furniture.length > 0;

  const confirmClearCanvas = useCallback(() => {
    localStorage.removeItem('floorPlanImage');
    setFloorPlanUrl(null);
    setFurniture([]);
    setSelectedId(null);
    setPixelsPerInch(null);
    setIsCalibrating(false);
    setCalibrationLine(null);
    setShowCalibrationModal(false);
    setShowClearConfirm(false);
  }, []);

  const handleExportPlan = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const pixelRatio = Math.min(3, Math.max(2, dpr * 1.5));
    const dataUrl = stage.toDataURL({
      mimeType: 'image/png',
      quality: 1,
      pixelRatio,
    });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'my-floorplan.png';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  // Handle furniture drag
  const handleDragEnd = (id, e) => {
    const node = e.target;
    setFurniture((prev) =>
      prev.map((f) => (f.id === id ? { ...f, x: node.x(), y: node.y() } : f))
    );
  };

  // Rotation / move only — dimensions stay tied to calibration (panel updates size)
  const handleTransformEnd = (id, e) => {
    const node = e.target;
    node.scaleX(1);
    node.scaleY(1);

    setFurniture((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              x: node.x(),
              y: node.y(),
              rotation: node.rotation(),
            }
          : f
      )
    );
  };

  // Deselect when clicking floor / empty canvas (not when calibrating)
  const handleStageMouseDown = (e) => {
    if (isCalibrating) return;
    const target = e.target;
    const nodeName = typeof target.name === 'function' ? target.name() : '';
    if (nodeName === 'floor-plan') {
      setSelectedId(null);
      return;
    }
    const cls = target.getClassName?.();
    if (cls === 'Stage' || cls === 'Layer') {
      setSelectedId(null);
    }
  };

  // Delete selected item with Backspace / Delete (not while typing in inputs)
  useEffect(() => {
    const onKeyDown = (ev) => {
      if (ev.key !== 'Backspace' && ev.key !== 'Delete') return;
      const el = document.activeElement;
      if (el) {
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (el.isContentEditable) return;
      }
      if (!selectedId) return;
      ev.preventDefault();
      deleteFurniture(selectedId);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, deleteFurniture]);

  const selectedFurniture = furniture.find(f => f.id === selectedId);

  return (
    <div
      className="app"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
      <Toolbar
        onStartCalibration={startCalibration}
        isCalibrated={!!pixelsPerInch}
        pixelsPerInch={pixelsPerInch}
        onUploadFloorPlan={() => fileInputRef.current?.click()}
        hasFloorPlan={!!floorPlanUrl}
        onClearCanvas={() => setShowClearConfirm(true)}
        onExportPlan={handleExportPlan}
        canClearCanvas={hasCanvasContent}
        canExportPlan={hasCanvasContent}
      />

      <FurniturePanel
        onAddFurniture={addFurniture}
        selectedFurniture={selectedFurniture}
        onUpdateFurniture={updateFurniture}
        onDeleteFurniture={deleteFurniture}
        isCalibrated={!!pixelsPerInch}
      />

      {isDraggingFile && (
        <div className="drop-overlay">
          <div className="drop-message">
            <p>Drop floor plan image here</p>
          </div>
        </div>
      )}

      {!floorPlanUrl && !isDraggingFile && (
        <div className="no-floorplan">
          <div className="upload-prompt">
            <h2>Upload a Floor Plan to Get Started</h2>
            <p>Drag and drop an image here or click the button below</p>
            <button onClick={() => fileInputRef.current?.click()} className="upload-btn">
              Choose Floor Plan Image
            </button>
          </div>
        </div>
      )}

      <Stage
        ref={stageRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onClick={handleStageClick}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onTap={handleStageClick}
        style={{ cursor: isCalibrating ? 'crosshair' : 'default' }}
      >
        <Layer>
          {/* Floor plan background image */}
          {floorPlanImage && (
            <KonvaImage
              name="floor-plan"
              image={floorPlanImage}
              x={0}
              y={0}
              listening
            />
          )}

          {/* Calibration line */}
          {isCalibrating && calibrationLine && (
            <CalibrationLine line={calibrationLine} />
          )}

          {/* Furniture items */}
          {furniture.map((item) => (
            <FurnitureItem
              key={item.id}
              item={item}
              isSelected={item.id === selectedId}
              onSelect={() => setSelectedId(item.id)}
              onDelete={() => deleteFurniture(item.id)}
              onDragEnd={(e) => handleDragEnd(item.id, e)}
              onTransformEnd={(e) => handleTransformEnd(item.id, e)}
            />
          ))}
        </Layer>
      </Stage>

      {showCalibrationModal && (
        <CalibrationModal
          onSubmit={handleCalibrationSubmit}
          onCancel={() => {
            setShowCalibrationModal(false);
            setCalibrationLine(null);
            setIsCalibrating(false);
          }}
        />
      )}

      {showClearConfirm && (
        <ClearConfirmModal
          onCancel={() => setShowClearConfirm(false)}
          onConfirm={confirmClearCanvas}
        />
      )}
    </div>
  );
}

export default App;
