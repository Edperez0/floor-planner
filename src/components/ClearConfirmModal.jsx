import React from 'react';
import './CalibrationModal.css';
import './ClearConfirmModal.css';

function ClearConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="clear-modal-title">
      <div className="modal-content">
        <h2 id="clear-modal-title">Clear canvas</h2>
        <p>Are you sure? This will remove all furniture and the floor plan image from this session.</p>
        <div className="modal-buttons">
          <button type="button" className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="clear-confirm-btn" onClick={onConfirm}>
            Clear everything
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClearConfirmModal;
