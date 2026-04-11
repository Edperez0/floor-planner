import React, { useState, useEffect } from 'react';
import { parseWholeFeet, parseWholeInches } from '../utils/dimensionsInput';
import './CalibrationModal.css';

const SUCCESS_AUTO_CLOSE_MS = 1500;

function CalibrationModal({ onSubmit, onCancel, successPpi, onSuccessDismiss }) {
  const [feet, setFeet] = useState('0');
  const [inches, setInches] = useState('0');

  useEffect(() => {
    if (successPpi == null) return;
    const id = setTimeout(() => {
      onSuccessDismiss();
    }, SUCCESS_AUTO_CLOSE_MS);
    return () => clearTimeout(id);
  }, [successPpi, onSuccessDismiss]);

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

  const showSuccess = successPpi != null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Calibrate Scale</h2>
        {showSuccess ? (
          <div className="calibration-success" role="status">
            Calibration set! {successPpi.toFixed(2)} pixels per inch
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

export default CalibrationModal;
