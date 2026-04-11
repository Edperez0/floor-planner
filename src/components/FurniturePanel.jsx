import React, { useState, useEffect } from 'react';
import { parseWholeFeet, parseWholeInches } from '../utils/dimensionsInput';
import { defaultFillColorForType } from '../utils/furnitureColors';
import './FurniturePanel.css';

const FURNITURE_PRESETS = [
  { name: 'Queen Bed', width: { feet: 5, inches: 0 }, depth: { feet: 6, inches: 8 }, color: '#9E9A96' },
  { name: 'King Bed', width: { feet: 6, inches: 4 }, depth: { feet: 6, inches: 8 }, color: '#9E9A96' },
  { name: 'Sofa', width: { feet: 7, inches: 0 }, depth: { feet: 3, inches: 0 }, color: '#A1887F' },
  { name: 'Loveseat', width: { feet: 5, inches: 0 }, depth: { feet: 3, inches: 0 }, color: '#A1887F' },
  { name: 'Dining Table (6-seat)', width: { feet: 6, inches: 0 }, depth: { feet: 3, inches: 0 }, color: '#6D4C41' },
  { name: 'Dining Table (8-seat)', width: { feet: 8, inches: 0 }, depth: { feet: 3, inches: 6 }, color: '#6D4C41' },
  { name: 'Coffee Table', width: { feet: 4, inches: 0 }, depth: { feet: 2, inches: 0 }, color: '#6D4C41' },
  { name: 'TV Stand', width: { feet: 5, inches: 0 }, depth: { feet: 1, inches: 6 }, color: '#5D4037' },
  { name: 'Dresser', width: { feet: 5, inches: 0 }, depth: { feet: 1, inches: 8 }, color: '#5D4037' },
  { name: 'Nightstand', width: { feet: 2, inches: 0 }, depth: { feet: 1, inches: 6 }, color: '#5D4037' },
  { name: 'Desk', width: { feet: 4, inches: 0 }, depth: { feet: 2, inches: 0 }, color: '#795548' },
  { name: 'Rug 5x7', width: { feet: 5, inches: 0 }, depth: { feet: 7, inches: 0 }, color: '#A8C5E2' },
  { name: 'Rug 8x10', width: { feet: 8, inches: 0 }, depth: { feet: 10, inches: 0 }, color: '#A8C5E2' },
  { name: 'Potted Plant', width: { feet: 1, inches: 6 }, depth: { feet: 1, inches: 6 }, color: '#66BB6A' },
];

function FurniturePanel({
  onAddFurniture,
  selectedFurniture,
  onUpdateFurniture,
  onUpdateFurnitureColor,
  onDeleteFurniture,
  isCalibrated,
  canvasViewLocked,
  onToggleCanvasViewLock,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [furnitureName, setFurnitureName] = useState('');
  const [widthFeet, setWidthFeet] = useState('0');
  const [widthInches, setWidthInches] = useState('0');
  const [depthFeet, setDepthFeet] = useState('0');
  const [depthInches, setDepthInches] = useState('0');
  const [customFillColor, setCustomFillColor] = useState('#8B7355');
  const [selectedFillColor, setSelectedFillColor] = useState('#8B7355');

  useEffect(() => {
    if (selectedFurniture) {
      setFurnitureName(selectedFurniture.type);
      setWidthFeet(String(selectedFurniture.realWidth.feet));
      setWidthInches(String(selectedFurniture.realWidth.inches));
      setDepthFeet(String(selectedFurniture.realDepth.feet));
      setDepthInches(String(selectedFurniture.realDepth.inches));
      setSelectedFillColor(
        selectedFurniture.fillColor ?? defaultFillColorForType(selectedFurniture.type)
      );
    }
  }, [selectedFurniture]);

  const handleAddPreset = (preset) => {
    if (!isCalibrated) {
      alert('Please calibrate the floor plan first!');
      return;
    }
    onAddFurniture(
      preset.name,
      preset.width.feet,
      preset.width.inches,
      preset.depth.feet,
      preset.depth.inches,
      preset.color
    );
  };

  const handleAddCustom = () => {
    if (!furnitureName.trim()) {
      alert('Please enter a furniture name');
      return;
    }
    const wf = parseWholeFeet(widthFeet);
    const wi = parseWholeInches(widthInches);
    const df = parseWholeFeet(depthFeet);
    const di = parseWholeInches(depthInches);
    onAddFurniture(furnitureName, wf, wi, df, di, customFillColor);
    setShowAddForm(false);
    setFurnitureName('');
    setWidthFeet('0');
    setWidthInches('0');
    setDepthFeet('0');
    setDepthInches('0');
    setCustomFillColor('#8B7355');
  };

  const handleUpdate = () => {
    if (selectedFurniture) {
      onUpdateFurniture(
        selectedFurniture.id,
        parseWholeFeet(widthFeet),
        parseWholeInches(widthInches),
        parseWholeFeet(depthFeet),
        parseWholeInches(depthInches)
      );
    }
  };

  const handleSelectedColorChange = (hex) => {
    setSelectedFillColor(hex);
    if (selectedFurniture) {
      onUpdateFurnitureColor(selectedFurniture.id, hex);
    }
  };

  return (
    <div className="furniture-panel">
      <div className="furniture-panel__main">
      <div className="panel-section panel-section--presets">
        <h3>Furniture Presets</h3>
        {!isCalibrated && (
          <p className="warning">⚠️ Calibrate scale first</p>
        )}
        <div className="presets-scroll" aria-label="Furniture preset list">
          <div className="presets-grid">
            {FURNITURE_PRESETS.map((preset, index) => (
              <button
                key={index}
                type="button"
                className="preset-btn"
                onClick={() => handleAddPreset(preset)}
                disabled={!isCalibrated}
              >
                <span
                  className="preset-swatch"
                  style={{ backgroundColor: preset.color }}
                  aria-hidden
                />
                {preset.name}
                <span className="preset-size">
                  {preset.width.feet}'{preset.width.inches}" × {preset.depth.feet}'{preset.depth.inches}"
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-section">
        <button
          type="button"
          className="toggle-form-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          disabled={!isCalibrated}
        >
          {showAddForm ? '− Hide Custom' : '+ Add Custom'}
        </button>

        {showAddForm && (
          <div className="add-form">
            <input
              type="text"
              placeholder="Furniture name"
              value={furnitureName}
              onChange={(e) => setFurnitureName(e.target.value)}
            />
            <div className="color-row">
              <label htmlFor="custom-fill-color">Color</label>
              <input
                id="custom-fill-color"
                type="color"
                value={customFillColor}
                onChange={(e) => setCustomFillColor(e.target.value)}
                title="Background color"
              />
            </div>
            <div className="dimension-row">
              <label>Width:</label>
              <input
                type="number"
                min="0"
                placeholder="ft"
                value={widthFeet}
                onChange={(e) => setWidthFeet(e.target.value)}
              />
              <input
                type="number"
                min="0"
                max="11"
                placeholder="in"
                value={widthInches}
                onChange={(e) => setWidthInches(e.target.value)}
              />
            </div>
            <div className="dimension-row">
              <label>Depth:</label>
              <input
                type="number"
                min="0"
                placeholder="ft"
                value={depthFeet}
                onChange={(e) => setDepthFeet(e.target.value)}
              />
              <input
                type="number"
                min="0"
                max="11"
                placeholder="in"
                value={depthInches}
                onChange={(e) => setDepthInches(e.target.value)}
              />
            </div>
            <button type="button" className="add-btn" onClick={handleAddCustom}>
              Add to Canvas
            </button>
          </div>
        )}
      </div>


      <div className="panel-section canvas-controls-section">
        <h3>Canvas Controls</h3>
        <button
          type="button"
          className="canvas-lock-btn"
          onClick={onToggleCanvasViewLock}
          aria-pressed={canvasViewLocked}
          title={canvasViewLocked ? 'Unlock pan and zoom' : 'Lock pan and zoom'}
        >
          <span className="canvas-lock-icon" aria-hidden>
            {canvasViewLocked ? '🔒' : '🔓'}
          </span>
          <span className="canvas-lock-label">{canvasViewLocked ? 'Locked' : 'Unlocked'}</span>
        </button>
        <p className="canvas-controls-hint">
          When unlocked: right-click drag pans; Ctrl+scroll (⌘+scroll on Mac) zooms. On touch: two fingers to pan and pinch.
        </p>
      </div>

      {selectedFurniture && (
        <div className="panel-section selected-section">
          <h3>Selected: {selectedFurniture.type}</h3>
          <div className="color-row color-row--selected">
            <label htmlFor="selected-fill-color">Color</label>
            <input
              id="selected-fill-color"
              type="color"
              value={selectedFillColor}
              onChange={(e) => handleSelectedColorChange(e.target.value)}
              title="Item color"
            />
          </div>
          <div className="dimension-row">
            <label>Width:</label>
            <input
              type="number"
              min="0"
              value={widthFeet}
              onChange={(e) => setWidthFeet(e.target.value)}
            />
            <input
              type="number"
              min="0"
              max="11"
              value={widthInches}
              onChange={(e) => setWidthInches(e.target.value)}
            />
          </div>
          <div className="dimension-row">
            <label>Depth:</label>
            <input
              type="number"
              min="0"
              value={depthFeet}
              onChange={(e) => setDepthFeet(e.target.value)}
            />
            <input
              type="number"
              min="0"
              max="11"
              value={depthInches}
              onChange={(e) => setDepthInches(e.target.value)}
            />
          </div>
          <button type="button" className="update-btn" onClick={handleUpdate}>
            Update Dimensions
          </button>
          <button type="button" className="delete-btn" onClick={() => onDeleteFurniture(selectedFurniture.id)}>
            Delete
          </button>
        </div>
      )}
      </div>

      <aside
        className="ad-slot ad-slot--sidebar"
        data-ad-slot="sidebar-mrec"
        aria-label="Advertisement"
      >
        Advertisement
      </aside>
    </div>
  );
}

export default FurniturePanel;
