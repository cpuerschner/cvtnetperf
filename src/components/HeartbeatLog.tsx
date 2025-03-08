// src/components/HeartbeatLog.tsx
import React from 'react';
import Heartbeat from './Heartbeat.tsx';
import { Heartbeat as HeartbeatType, Segment } from '../types';
import '../styles/HeartbeatLog.css';

interface HeartbeatLogProps {
  heartbeats: HeartbeatType[];
  latencySegments: Segment[];
  bandwidthSegments: Segment[];
  onExport: () => void; // Still needed but unused here
}

const HeartbeatLog: React.FC<HeartbeatLogProps> = ({ heartbeats, latencySegments, bandwidthSegments }) => {
  const displayedHeartbeats = React.useMemo(() => heartbeats.slice(-50), [heartbeats]);
  const heartbeatItems = React.useMemo(() =>
    displayedHeartbeats.map((hb, index) => (
      <Heartbeat
        key={index}
        heartbeat={hb}
        latencySegments={latencySegments}
        bandwidthSegments={bandwidthSegments}
      />
    )), [displayedHeartbeats, latencySegments, bandwidthSegments]);

  return (
    <div className="heartbeat-list">
      {heartbeats.length > 0 && (
        <>
          <h3>Heartbeat Log</h3>
          <ul>{heartbeatItems}</ul>
        </>
      )}
    </div>
  );
};

export default HeartbeatLog;