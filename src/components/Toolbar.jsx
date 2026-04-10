import React from 'react';
import './Toolbar.css';

function Toolbar({
  onStartCalibration,
  isCalibrated,
  pixelsPerInch,
  onUploadFloorPlan,
  hasFloorPlan,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClearCanvas,
  onExportPlan,
  onSaveProject,
  onLoadProject,
  onOpenTemplates,
  canClearCanvas,
  canExportPlan,
}) {
  return (
    <div className="toolbar app-toolbar">
      <h2>Floor Planner</h2>
      <button type="button" onClick={onUploadFloorPlan} className="upload-toolbar-btn">
        {hasFloorPlan ? '📁 Change Floor Plan' : '📁 Upload Floor Plan'}
      </button>
      <button
        type="button"
        onClick={onStartCalibration}
        className="calibrate-btn"
        disabled={!hasFloorPlan}
      >
        {isCalibrated ? '✓ Recalibrate' : 'Calibrate Scale'}
      </button>
      <button
        type="button"
        onClick={onOpenTemplates}
        className="templates-toolbar-btn"
        title="Load a starter layout"
      >
        Templates
      </button>
      <div className="toolbar-utilities" role="group" aria-label="Canvas utilities">
        <button
          type="button"
          className="utility-btn utility-btn-undo"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z or ⌘Z)"
        >
          Undo
        </button>
        <button
          type="button"
          className="utility-btn utility-btn-redo"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z or ⌘⇧Z)"
        >
          Redo
        </button>
        <button
          type="button"
          className="utility-btn utility-btn-clear"
          onClick={onClearCanvas}
          disabled={!canClearCanvas}
          title={canClearCanvas ? 'Remove all furniture and the floor plan' : 'Nothing to clear'}
        >
          Clear Canvas
        </button>
        <button
          type="button"
          className="utility-btn utility-btn-export"
          onClick={onExportPlan}
          disabled={!canExportPlan}
          title={canExportPlan ? 'Download PNG of the plan' : 'Add a floor plan or furniture first'}
        >
          Export Plan
        </button>
        <button
          type="button"
          className="utility-btn utility-btn-save"
          onClick={onSaveProject}
          title="Download project as JSON"
        >
          Save Project
        </button>
        <button
          type="button"
          className="utility-btn utility-btn-load"
          onClick={onLoadProject}
          title="Load a previously saved JSON project"
        >
          Load Project
        </button>
      </div>
      {isCalibrated && (
        <div className="calibration-info">
          Scale: {pixelsPerInch.toFixed(2)} px/inch
        </div>
      )}
    </div>
  );
}

export default Toolbar;
