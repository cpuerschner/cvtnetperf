import React, { useEffect, useRef } from 'react';
import './Gauge.css';

const Gauge = ({ value, maxValue, segments, title }) => {
  const bgCanvasRef = useRef(null);
  const needleRef = useRef(null);
  const legendRef = useRef(null);

  const centerX = 150;
  const centerY = 160;
  const radius = 120;

  useEffect(() => {
    const bgCtx = bgCanvasRef.current.getContext('2d');
    bgCtx.clearRect(0, 0, 300, 200); // Clear canvas to avoid overlap

    // Draw base arc
    bgCtx.beginPath();
    bgCtx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI, false);
    bgCtx.lineWidth = 20;
    bgCtx.strokeStyle = '#e0e0e0';
    bgCtx.stroke();

    // Draw colored segment arcs
    let previousAngle = Math.PI;
    segments.forEach(segment => {
      const zonePercentage = Math.min(segment.max / maxValue, 1);
      const endAngle = Math.PI + (zonePercentage * Math.PI);
      bgCtx.beginPath();
      bgCtx.arc(centerX, centerY, radius, previousAngle, endAngle, false);
      bgCtx.strokeStyle = segment.color;
      bgCtx.stroke();
      previousAngle = endAngle;
    });
  }, [segments, maxValue, title]);

  useEffect(() => {
    needleRef.current.style.transform = `rotate(-180deg)`; // Force -180° on mount
  }, [title]);

  useEffect(() => {
    const percentage = Math.min(value / maxValue, 1);
    const rotationDegrees = -180 + (percentage * 180);
    needleRef.current.style.transform = `rotate(${rotationDegrees}deg)`;
  }, [value, maxValue, title]);

  useEffect(() => {
    if (legendRef.current) {
      // No console.log here, just maintain visibility check if needed later
    }
  }, [segments, title]);

  // Dynamic label logic - use segment max values for markers
  const markers = segments.map(segment => segment.max);

  // Function to format labels with consistent 2 decimal places for Bandwidth, matching gauge-value
  const formatLabel = (marker, isBandwidth) => {
    if (isBandwidth) {
      return Number(marker).toFixed(2).toString(); // Ensure 2 decimal places as string
    }
    return Math.round(marker).toString(); // Integers for Latency
  };

  // Sanitize title to remove spaces and special characters for valid CSS class
  const sanitizedTitle = title.toLowerCase().replace(/[\s()]/g, '');

  return (
    <div className={`gauge-container-${sanitizedTitle}`} key={`${title}-${maxValue || Date.now()}`}> {/* Unique key per gauge and maxValue, with fallback timestamp */}
      <h2>{title}</h2>
      <div className="gauge">
        <canvas className="gauge-background" width="300" height="200" ref={bgCanvasRef}></canvas>
        <div className="gauge-pivot"></div>
        <div
          className="gauge-needle"
          ref={needleRef}
          style={{ transform: 'rotate(-180deg)' }}
        ></div>
        <div className="gauge-value">
          {value === 0 ? '0.00' : value.toFixed(2)} {title === 'Latency' ? 'ms' : 'KB/s'}
        </div>
        {/* DOM Labels - Only show Bandwidth labels if maxValue is set */}
        {title === 'Bandwidth' && !maxValue ? null : (
          markers.map((marker, i) => {
            const percentage = Math.min(marker / maxValue, 1);
            const angle = Math.PI + percentage * Math.PI; // Position at segment boundary
            const textRadius = radius + 20; // Position outside arc
            const x = centerX + textRadius * Math.cos(angle);
            const y = centerY + textRadius * Math.sin(angle);
            // Format labels using the new function, matching gauge-value
            const label = formatLabel(marker, title === 'Bandwidth');
            return (
              <span
                key={`${title}-${marker}-${maxValue || Date.now()}`} // Unique key for each label, maxValue, and timestamp
                className={`gauge-label gauge-label-${sanitizedTitle}`} // Use sanitized title for valid class name
                style={{
                  position: 'absolute',
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: 'translate(-50%, -50%)',
                  whiteSpace: 'nowrap',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  textTransform: 'none',
                  userSelect: 'none', // Prevent selection/modification
                  contenteditable: 'false', // Prevent editing
                }}
                data-label={label} // Debug attribute to inspect raw value (optional, can remove for production)
              >
                {label}
              </span>
            );
          })
        )}
      </div>
      <div className="gauge-legend" ref={legendRef}>
        {segments.map((zone, index) => (
          <div className="legend-item" key={index}>
            <div className="legend-color" style={{ backgroundColor: zone.color }}></div>
            <span className="legend-label">{zone.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gauge;