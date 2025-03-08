// src/components/Heartbeat.tsx
import React from 'react';
import { Heartbeat as HeartbeatType, Segment } from '../types'; // Alias the type
import '../styles/Heartbeat.css';

interface HeartbeatProps {
  heartbeat: HeartbeatType; // Use the aliased type
  latencySegments: Segment[];
  bandwidthSegments: Segment[];
}

const getColor = (value: number, segments: Segment[]): string => {
  if (!segments.length) return '#666';
  for (const segment of segments) {
    if (value <= segment.max) return segment.color;
  }
  return segments[segments.length - 1].color;
};

const Heartbeat: React.FC<HeartbeatProps> = ({ heartbeat, latencySegments, bandwidthSegments }) => {
  return (
    <li className="heartbeat-item">
      <span className="heartbeat-timestamp">{heartbeat.timestamp}</span>
      {heartbeat.error ? (
        <span className="heartbeat-error">{heartbeat.error}</span>
      ) : (
        <>
          <span className="heartbeat-latency" style={{ color: getColor(heartbeat.latency, latencySegments) }}>
            Latency: {heartbeat.latency.toFixed(2)} ms
          </span>
          <span className="heartbeat-bandwidth" style={{ color: getColor(heartbeat.bandwidth, bandwidthSegments) }}>
            Bandwidth: {heartbeat.bandwidth.toFixed(2)} KB/s
          </span>
          <span className="heartbeat-device">Device: {heartbeat.deviceInfo} ({heartbeat.deviceName})</span>
        </>
      )}
    </li>
  );
};

export default Heartbeat;