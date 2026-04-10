import React, { useEffect } from 'react';
import { ROOM_TEMPLATES } from '../data/roomTemplates';
import './TemplatesModal.css';

function TemplatesModal({ onClose, onSelectTemplate }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="templates-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="templates-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="templates-modal-title"
      >
        <div className="templates-modal__header">
          <h2 id="templates-modal-title">Templates</h2>
          <button
            type="button"
            className="templates-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="templates-modal__lead">
          Pick a starter layout. This replaces your current floor plan, scale, and furniture.
        </p>
        <div className="templates-modal__grid">
          {ROOM_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="template-card"
              onClick={() => onSelectTemplate(t)}
            >
              <span className="template-card__title">{t.title}</span>
              <span className="template-card__desc">{t.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TemplatesModal;
