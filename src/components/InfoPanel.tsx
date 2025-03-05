// src/components/InfoPanel.tsx
import React from 'react';
import '../styles/InfoPanel.css'; // Import the new CSS file

const InfoPanel = ({ status, isInfoCollapsed, onToggle }) => {
  return (
    <div className="info-panel">
      <button 
        onClick={onToggle} 
        className="info-toggle"
      >
        {isInfoCollapsed ? 'Show Details' : 'Hide Details'}
      </button>
      {!isInfoCollapsed && (
        <div id="info" dangerouslySetInnerHTML={{ __html: status }}></div>
      )}
    </div>
  );
};

export default InfoPanel;