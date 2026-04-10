import React, { useState } from 'react';
import { parseWholeFeet, parseWholeInches } from '../utils/dimensionsInput';
import './CalibrationModal.css';

function CalibrationModal({ onSubmit, onCancel }) {
  const [feet, setFeet] = useState('0');
  const [inches, setInches] = useState('0');

  const handleSubmit = (e) => {
    e.preventDefault();
    const feetNum = parseWholeFeet(feet);
    const inchesNum = parseWholeInches(inches);
    if (feetNum === 0 && inchesNum === 0) {
      alert('Please enter a dimension');
      return;
    }
    onSubmit(feetNum, inchesNum);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Calibrate Scale</h2>
        <p>Enter the real-world length of the line you just drew:</p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <div className="input-field">
              <label>Feet</label>
              <input
                type="number"
                min="0"
                value={feet}
                onChange={(e) => setFeet(e.target.value)}
                autoFocus
              />
            </div>
            <div className="input-field">
              <label>Inches</label>
              <input
                type="number"
                min="0"
                max="11"
                value={inches}
                onChange={(e) => setInches(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-buttons">
            <button type="button" onClick={onCancel} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Set Scale
            </button>
          </div>
        </form>
        <div className="hint">
          <strong>Tip:</strong> Use a dimension from your floor plan like the M. Bedroom wall (11'5")
        </div>
      </div>
    </div>
  );
}

export default CalibrationModal;
