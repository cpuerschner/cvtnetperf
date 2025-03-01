// src/components/HeartbeatLog.js
import React from 'react';
import '../styles/HeartbeatLog.css'; // Updated to use relative path from components directory

const HeartbeatLog = ({ heartbeats, latencySegments, bandwidthSegments }) => {
  // Function to get segment color for a value
  const getSegmentColor = (value, segments) => {
    if (!segments || segments.length === 0) return '#666';
    for (const segment of segments) {
      if (value <= segment.max) return segment.color;
    }
    return segments[segments.length - 1].color;
  };

  // Function to export heartbeats to a JSON-like text file
  const exportHeartbeatsToFile = () => {
    if (heartbeats.length === 0) {
      alert('No heartbeat data to export.');
      return;
    }

    const heartbeatData = JSON.stringify(heartbeats, null, 2); // Pretty-print JSON
    const blob = new Blob([heartbeatData], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'heartbeats.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <button onClick={exportHeartbeatsToFile} disabled={heartbeats.length === 0} className="export-button">
        Export Heartbeats to File
      </button>
      {heartbeats.length > 0 && (
        <div className="heartbeat-list">
          <h3>Heartbeat Log</h3>
          <ul>
            {heartbeats.map((hb, index) => (
              <li key={index} className="heartbeat-item">
                <span className="heartbeat-timestamp">{hb.timestamp}</span>
                {hb.error ? (
                  <span className="heartbeat-error">{hb.error}</span>
                ) : (
                  <>
                    <span
                      className="heartbeat-latency"
                      style={{ color: getSegmentColor(hb.latency, latencySegments) }}
                    >
                      Latency: {hb.latency.toFixed(2)} ms
                    </span>
                    <span
                      className="heartbeat-bandwidth"
                      style={{ color: getSegmentColor(hb.bandwidth, bandwidthSegments) }}
                    >
                      Bandwidth: {hb.bandwidth.toFixed(2)} KB/s
                    </span>
                    <span className="heartbeat-device">
                      Device: {hb.deviceInfo}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

export default HeartbeatLog;