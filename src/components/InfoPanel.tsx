// src/components/InfoPanel.tsx
import React, { useMemo } from 'react';
import '../styles/InfoPanel.css';

interface InfoPanelProps {
  status: string;
  isInfoCollapsed: boolean;
  onToggle: () => void; // Unused but kept for interface consistency
}

const InfoPanel: React.FC<InfoPanelProps> = ({ status }) => {
  const statusItems = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(status, 'text/html');
    const divs = Array.from(doc.body.querySelectorAll('div'));
    return divs.map(div => {
      const text = div.innerHTML || ''; // Use innerHTML to preserve nested tags
      const isError = div.className.includes('error');
      const [label, value] = text.includes(':') ? text.split(/:\s*(.+)/) : [text, ''];
      return { label, value, isError };
    });
  }, [status]);

  return (
    <div className="info-panel">
      <h3>Status</h3>
      <ul>
        {statusItems.map((item, index) => (
          <li key={index} className="info-item">
            <span className="info-label">{item.label}:</span>
            {item.label === 'cURL' ? (
              <div className="info-value curl-command-scrollable" title={item.value.replace(/<[^>]+>/g, '')}>
                {item.value}
              </div>
            ) : (
              <span
                className={`info-value ${item.isError ? 'error' : ''}`}
                dangerouslySetInnerHTML={{ __html: item.value || item.label }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InfoPanel;