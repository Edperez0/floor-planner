import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import useImage from './hooks/useImage';
import Toolbar from './components/Toolbar';
import FurnitureItem from './components/FurnitureItem';
import CalibrationLine from './components/CalibrationLine';
import CalibrationModal from './components/CalibrationModal';
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
      // First click - start the line
      setCalibrationLine({ start: pos, end: pos });
    } else if (!calibrationLine.end || (calibrationLine.end.x === calibrationLine.start.x && calibrationLine.end.y === calibrationLine.start.y)) {
      // Second click - end the line
      setCalibrationLine({ ...calibrationLine, end: pos });
      setShowCalibrationModal(true);
    }
  };

  // Handle mouse move during calibration
  const handleStageMouseMove = (e) => {
    if (!isCalibrating || !calibrationLine || calibrationLine.end) return;

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

  // Delete furniture
  const deleteFurniture = (id) => {
    setFurniture(furniture.filter(item => item.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // Handle furniture drag
  const handleDragEnd = (id, e) => {
    const item = e.target;
    setFurniture(furniture.map(f =>
      f.id === id
        ? { ...f, x: item.x(), y: item.y() }
        : f
    ));
  };

  // Handle furniture transform (rotation/scale)
  const handleTransformEnd = (id, e) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and adjust width/height instead
    node.scaleX(1);
    node.scaleY(1);

    setFurniture(furniture.map(f => {
      if (f.id === id) {
        const newWidth = Math.max(5, node.width() * scaleX);
        const newHeight = Math.max(5, node.height() * scaleY);

        // Calculate new real-world dimensions
        const newWidthInches = newWidth / pixelsPerInch;
        const newDepthInches = newHeight / pixelsPerInch;

        return {
          ...f,
          x: node.x(),
          y: node.y(),
          width: newWidth,
          height: newHeight,
          rotation: node.rotation(),
          realWidth: {
            feet: Math.floor(newWidthInches / 12),
            inches: Math.round(newWidthInches % 12)
          },
          realDepth: {
            feet: Math.floor(newDepthInches / 12),
            inches: Math.round(newDepthInches % 12)
          }
        };
      }
      return f;
    }));
  };

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
        onMouseMove={handleStageMouseMove}
        onTap={handleStageClick}
        style={{ cursor: isCalibrating ? 'crosshair' : 'default' }}
      >
        <Layer>
          {/* Floor plan background image */}
          {floorPlanImage && (
            <KonvaImage
              image={floorPlanImage}
              x={0}
              y={0}
              listening={false} // Background should not be interactive
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
    </div>
  );
}

export default App;
