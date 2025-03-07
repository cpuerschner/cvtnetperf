// src/components/Gauge.tsx
import React, { useEffect, useRef } from 'react';
import '../styles/Gauge.css';

interface Segment {
  max: number;
  color: string;
  label: string;
}

interface GaugeProps {
  value: number;
  maxValue: number;
  segments: Segment[];
  title: string;
}

const Gauge: React.FC<GaugeProps> = ({ value, maxValue, segments, title }) => {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const needleRef = useRef<HTMLDivElement | null>(null);
  const centerX = 150;
  const centerY = 160;
  const radius = 120;

  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const bgCtx = bgCanvas.getContext('2d');
    if (!bgCtx) return;

    bgCanvas.width = 300;
    bgCanvas.height = 200;

    bgCtx.clearRect(0, 0, 300, 200);
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
  }, [segments, maxValue]);

  useEffect(() => {
    if (needleRef.current) {
      const percentage = Math.min(value / maxValue, 1);
      const rotationDegrees = -180 + (percentage * 180);
      needleRef.current.style.transform = `rotate(${rotationDegrees}deg)`;
    }
  }, [value, maxValue]);

  const markers = React.useMemo(() => segments.map(segment => segment.max), [segments]);
  const formatLabel = React.useMemo(() => (marker: number, isBandwidth: boolean): string => 
    isBandwidth ? marker.toFixed(2) : Math.round(marker).toString(), []);

  const sanitizedTitle = title.toLowerCase().replace(/[\s()]/g, '');
  const isBandwidth = title === 'Bandwidth';

  return (
    <div className={`gauge-container-${sanitizedTitle}`}>
      <h2>{title}</h2>
      <div className="gauge">
        <canvas className="gauge-background" width="300" height="200" ref={bgCanvasRef} />
        <div className="gauge-pivot" />
        <div className="gauge-needle" ref={needleRef} style={{ transform: 'rotate(-180deg)' }} />
        <div className="gauge-value">
          {value === 0 ? '0.00' : value.toFixed(2)} {isBandwidth ? 'KB/s' : 'ms'}
        </div>
        {isBandwidth && !maxValue ? null : markers.map((marker, i) => {
          const percentage = Math.min(marker / maxValue, 1);
          const angle = Math.PI + percentage * Math.PI;
          const textRadius = radius + 20;
          const x = centerX + textRadius * Math.cos(angle);
          const y = centerY + textRadius * Math.sin(angle);
          const label = formatLabel(marker, isBandwidth);
          console.log(`Label ${label}: x=${x}, y=${y}`);
          return (
            <span
              key={`${title}-${marker}-${i}`}
              className={`gauge-label gauge-label-${sanitizedTitle}`}
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -50%)',
                whiteSpace: 'nowrap',
                fontSize: '9px',
                fontWeight: 'bold',
                userSelect: 'none',
              }}
              data-label={label}
            >
              {label}
            </span>
          );
        })}
      </div>
      <div className="gauge-legend">
        {segments.map((zone, index) => (
          <div className="legend-item" key={index}>
            <div className="legend-color" style={{ backgroundColor: zone.color }} />
            <span className="legend-label">{zone.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gauge;