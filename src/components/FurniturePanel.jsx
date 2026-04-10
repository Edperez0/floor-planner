import React, { useState, useEffect } from 'react';
import './FurniturePanel.css';

const FURNITURE_PRESETS = [
  { name: 'Queen Bed', width: { feet: 5, inches: 0 }, depth: { feet: 6, inches: 8 } },
  { name: 'King Bed', width: { feet: 6, inches: 4 }, depth: { feet: 6, inches: 8 } },
  { name: 'Sofa', width: { feet: 7, inches: 0 }, depth: { feet: 3, inches: 0 } },
  { name: 'Loveseat', width: { feet: 5, inches: 0 }, depth: { feet: 3, inches: 0 } },
  { name: 'Dining Table (6-seat)', width: { feet: 6, inches: 0 }, depth: { feet: 3, inches: 0 } },
  { name: 'Dining Table (8-seat)', width: { feet: 8, inches: 0 }, depth: { feet: 3, inches: 6 } },
  { name: 'Coffee Table', width: { feet: 4, inches: 0 }, depth: { feet: 2, inches: 0 } },
  { name: 'TV Stand', width: { feet: 5, inches: 0 }, depth: { feet: 1, inches: 6 } },
  { name: 'Dresser', width: { feet: 5, inches: 0 }, depth: { feet: 1, inches: 8 } },
  { name: 'Nightstand', width: { feet: 2, inches: 0 }, depth: { feet: 1, inches: 6 } },
  { name: 'Desk', width: { feet: 4, inches: 0 }, depth: { feet: 2, inches: 0 } },
  { name: 'Rug 5x7', width: { feet: 5, inches: 0 }, depth: { feet: 7, inches: 0 } },
  { name: 'Rug 8x10', width: { feet: 8, inches: 0 }, depth: { feet: 10, inches: 0 } },
];

function FurniturePanel({ onAddFurniture, selectedFurniture, onUpdateFurniture, onDeleteFurniture, isCalibrated }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [furnitureName, setFurnitureName] = useState('');
  const [widthFeet, setWidthFeet] = useState(0);
  const [widthInches, setWidthInches] = useState(0);
  const [depthFeet, setDepthFeet] = useState(0);
  const [depthInches, setDepthInches] = useState(0);

  // Update form when furniture is selected
  useEffect(() => {
    if (selectedFurniture) {
      setFurnitureName(selectedFurniture.type);
      setWidthFeet(selectedFurniture.realWidth.feet);
      setWidthInches(selectedFurniture.realWidth.inches);
      setDepthFeet(selectedFurniture.realDepth.feet);
      setDepthInches(selectedFurniture.realDepth.inches);
    }
  }, [selectedFurniture]);

  const handleAddPreset = (preset) => {
    if (!isCalibrated) {
      alert('Please calibrate the floor plan first!');
      return;
    }
    onAddFurniture(preset.name, preset.width.feet, preset.width.inches, preset.depth.feet, preset.depth.inches);
  };

  const handleAddCustom = () => {
    if (!furnitureName.trim()) {
      alert('Please enter a furniture name');
      return;
    }
    onAddFurniture(furnitureName, widthFeet, widthInches, depthFeet, depthInches);
    setShowAddForm(false);
    setFurnitureName('');
    setWidthFeet(0);
    setWidthInches(0);
    setDepthFeet(0);
    setDepthInches(0);
  };

  const handleUpdate = () => {
    if (selectedFurniture) {
      onUpdateFurniture(selectedFurniture.id, widthFeet, widthInches, depthFeet, depthInches);
    }
  };

  return (
    <div className="furniture-panel">
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
            <div className="dimension-row">
              <label>Width:</label>
              <input
                type="number"
                min="0"
                placeholder="ft"
                value={widthFeet}
                onChange={(e) => setWidthFeet(parseInt(e.target.value) || 0)}
              />
              <input
                type="number"
                min="0"
                max="11"
                placeholder="in"
                value={widthInches}
                onChange={(e) => setWidthInches(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="dimension-row">
              <label>Depth:</label>
              <input
                type="number"
                min="0"
                placeholder="ft"
                value={depthFeet}
                onChange={(e) => setDepthFeet(parseInt(e.target.value) || 0)}
              />
              <input
                type="number"
                min="0"
                max="11"
                placeholder="in"
                value={depthInches}
                onChange={(e) => setDepthInches(parseInt(e.target.value) || 0)}
              />
            </div>
            <button className="add-btn" onClick={handleAddCustom}>
              Add to Canvas
            </button>
          </div>
        )}
      </div>

      {selectedFurniture && (
        <div className="panel-section selected-section">
          <h3>Selected: {selectedFurniture.type}</h3>
          <div className="dimension-row">
            <label>Width:</label>
            <input
              type="number"
              min="0"
              value={widthFeet}
              onChange={(e) => setWidthFeet(parseInt(e.target.value) || 0)}
            />
            <input
              type="number"
              min="0"
              max="11"
              value={widthInches}
              onChange={(e) => setWidthInches(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="dimension-row">
            <label>Depth:</label>
            <input
              type="number"
              min="0"
              value={depthFeet}
              onChange={(e) => setDepthFeet(parseInt(e.target.value) || 0)}
            />
            <input
              type="number"
              min="0"
              max="11"
              value={depthInches}
              onChange={(e) => setDepthInches(parseInt(e.target.value) || 0)}
            />
          </div>
          <button className="update-btn" onClick={handleUpdate}>
            Update Dimensions
          </button>
          <button className="delete-btn" onClick={() => onDeleteFurniture(selectedFurniture.id)}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default FurniturePanel;
