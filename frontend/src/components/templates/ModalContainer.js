import React, { useEffect } from 'react';
import './ModalContainer.css';
import InterfaceIcon from '../common/InterfaceIcon';

export default function ModalContainer({ onClose, children }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="overlay" onClick={(e) => e.target.classList.contains('overlay') && onClose()}>
      <div className="modal">
        <button className="modal-close-button" onClick={onClose} aria-label="Close dialog">
          <InterfaceIcon name="close" />
        </button>
        {children}
      </div>
    </div>
  );
}
