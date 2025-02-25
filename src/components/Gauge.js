// src/components/Gauge.js
import React, { useEffect, useRef } from 'react';
import './Gauge.css';

const Gauge = ({ value, maxValue, segments, title }) => {
  const bgCanvasRef = useRef(null);
  const fgCanvasRef = useRef(null);

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

    drawNeedle(0);
  }, [segments, maxValue]);

  useEffect(() => {
    drawNeedle(value);
  }, [value]);

  const drawNeedle = (value) => {
    const fgCtx = fgCanvasRef.current.getContext('2d');
    fgCtx.clearRect(0, 0, 300, 200);

    const percentage = Math.min(value / maxValue, 1);
    const needleAngle = Math.PI + (percentage * Math.PI);
    const needleX = centerX + Math.cos(needleAngle) * radius;
    const needleY = centerY + Math.sin(needleAngle) * radius;

    fgCtx.beginPath();
    fgCtx.moveTo(centerX, centerY);
    fgCtx.lineTo(needleX, needleY);
    const baseWidth = 8;
    const perpAngle = needleAngle + Math.PI / 2;
    const baseX1 = centerX + Math.cos(perpAngle) * baseWidth;
    const baseY1 = centerY + Math.sin(perpAngle) * baseWidth;
    const baseX2 = centerX - Math.cos(perpAngle) * baseWidth;
    const baseY2 = centerY - Math.sin(perpAngle) * baseWidth;
    fgCtx.lineTo(baseX1, baseY1);
    fgCtx.lineTo(baseX2, baseY2);
    fgCtx.closePath();

    const gradient = fgCtx.createLinearGradient(centerX, centerY, needleX, needleY);
    gradient.addColorStop(0, '#666');
    gradient.addColorStop(1, '#000');
    fgCtx.fillStyle = gradient;
    fgCtx.fill();
    fgCtx.lineWidth = 1;
    fgCtx.strokeStyle = '#333';
    fgCtx.stroke();

    fgCtx.beginPath();
    fgCtx.arc(centerX, centerY, 12, 0, 2 * Math.PI);
    fgCtx.fillStyle = '#444';
    fgCtx.fill();
    fgCtx.lineWidth = 1;
    fgCtx.strokeStyle = '#333';
    fgCtx.stroke();
  };

  return (
    <div className="gauge-container">
      <h2>{title}</h2>
      <div className="gauge">
        <canvas className="gauge-background" width="300" height="200" ref={bgCanvasRef}></canvas>
        <canvas className="gauge-foreground" width="300" height="200" ref={fgCanvasRef}></canvas>
        <div className="gauge-value">
          {value === 0 ? '0.00' : value.toFixed(2)} {title === 'Latency' ? 'ms' : 'KB/s'}
        </div>
      </div>
      <div className="gauge-legend">
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