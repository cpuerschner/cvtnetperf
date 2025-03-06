// src/components/InfoPanel.tsx
import React from 'react';
import '../styles/InfoPanel.css';

interface InfoPanelProps {
  status: string;
  isInfoCollapsed: boolean;
  onToggle: () => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ status, isInfoCollapsed, onToggle }) => {
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