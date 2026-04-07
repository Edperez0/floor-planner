import React from 'react';
import './Toolbar.css';

function Toolbar({ onStartCalibration, isCalibrated, pixelsPerInch, onUploadFloorPlan, hasFloorPlan }) {
  return (
    <div className="toolbar">
      <h2>Floor Planner</h2>
      <button onClick={onUploadFloorPlan} className="upload-toolbar-btn">
        {hasFloorPlan ? '📁 Change Floor Plan' : '📁 Upload Floor Plan'}
      </button>
      <button
        onClick={onStartCalibration}
        className="calibrate-btn"
        disabled={!hasFloorPlan}
      >
        {isCalibrated ? '✓ Recalibrate' : 'Calibrate Scale'}
      </button>
      {isCalibrated && (
        <div className="calibration-info">
          Scale: {pixelsPerInch.toFixed(2)} px/inch
        </div>
      )}
    </div>
  );
}

export default Toolbar;
