// src/components/Gauge.js
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
    bgCtx.beginPath();
    bgCtx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI, false);
    bgCtx.lineWidth = 20;
    bgCtx.strokeStyle = '#e0e0e0';
    bgCtx.stroke();

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

    console.log(`${title} Gauge - Background Rendered`);
  }, [segments, maxValue, title]);

  useEffect(() => {
    console.log(`${title} Gauge - Initial Mount: Setting rotation to -180°`);
    needleRef.current.style.transform = `rotate(-180deg)`; // Force -180° on mount
  }, [title]);

  useEffect(() => {
    const percentage = Math.min(value / maxValue, 1);
    const rotationDegrees = -180 + (percentage * 180);
    needleRef.current.style.transform = `rotate(${rotationDegrees}deg)`;
    console.log(`${title} Gauge - Update: value=${value}, maxValue=${maxValue}, percentage=${percentage}, rotationDegrees=${rotationDegrees}°`);
    console.log(`${title} Gauge - Applied Transform: ${needleRef.current.style.transform}`);
  }, [value, maxValue, title]);

  useEffect(() => {
    if (legendRef.current) {
      console.log(`${title} Gauge - Legend Visibility: display=${window.getComputedStyle(legendRef.current).display}, z-index=${window.getComputedStyle(legendRef.current).zIndex}`);
    }
  }, [segments, title]);

  return (
    <div className="gauge-container">
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