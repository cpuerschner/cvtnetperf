// src/components/EventNetworkPerf.js
import React, { useState, useEffect, useRef } from 'react';
import Gauge from './Gauge';
import './EventNetworkPerf.css';

const EventNetworkPerf = () => {
  const [apiUrl, setApiUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [intervalSeconds, setIntervalSeconds] = useState(2);
  const [durationSeconds, setDurationSeconds] = useState(6);
  const [currentLatency, setCurrentLatency] = useState(0);
  const [currentBandwidth, setCurrentBandwidth] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);
  const [avgBandwidth, setAvgBandwidth] = useState(0);
  const [maxBandwidth, setMaxBandwidth] = useState(null);
  const [status, setStatus] = useState('Enter an API URL, interval, and duration, then click "Start Monitoring"');
  const [heartbeats, setHeartbeats] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const monitoringIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const maxValueLatency = 250;
  const targetTime = 0.1;

  const latencySegments = [
    { max: 50, color: '#006400', label: 'Great (0-50ms)' },
    { max: 100, color: '#4CAF50', label: 'Good (50-100ms)' },
    { max: 150, color: '#FFC107', label: 'Moderate (100-150ms)' },
    { max: 200, color: '#FF5722', label: 'Sub Par (150-200ms)' },
    { max: 250, color: '#D32F2F', label: 'Poor (200-250ms)' }
  ];

  const bandwidthSegments = maxBandwidth
    ? [
        { max: maxBandwidth * 0.2, color: '#D32F2F', label: `Poor (0-${(maxBandwidth * 0.2).toFixed(1)} KB/s)` },
        { max: maxBandwidth * 0.4, color: '#FF5722', label: `Sub Par (${(maxBandwidth * 0.2).toFixed(1)}-${(maxBandwidth * 0.4).toFixed(1)} KB/s)` },
        { max: maxBandwidth * 0.6, color: '#FFC107', label: `Moderate (${(maxBandwidth * 0.4).toFixed(1)}-${(maxBandwidth * 0.6).toFixed(1)} KB/s)` },
        { max: maxBandwidth * 0.8, color: '#4CAF50', label: `Good (${(maxBandwidth * 0.6).toFixed(1)}-${(maxBandwidth * 0.8).toFixed(1)} KB/s)` },
        { max: maxBandwidth, color: '#006400', label: `Great (${(maxBandwidth * 0.8).toFixed(1)}-${maxBandwidth.toFixed(1)} KB/s)` }
      ]
    : [];

  const getSegmentColor = (value, segments) => {
    if (!segments || segments.length === 0) return '#666';
    for (const segment of segments) {
      if (value <= segment.max) return segment.color;
    }
    return segments[segments.length - 1].color;
  };

  const resetState = () => {
    setHeartbeats([]);
    setCurrentLatency(0);
    setCurrentBandwidth(0);
    setAvgLatency(0);
    setAvgBandwidth(0);
    setMaxBandwidth(null);
    setStatus('Enter an API URL, interval, and duration, then click "Start Monitoring"');
  };

  const measureApiResponseTime = async (forceRecalculate = false, localHeartbeats = []) => {
    try {
      const startTime = performance.now();
      const response = await fetch(apiUrl, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit',
        headers: { 'Accept': 'application/json' }
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      if (!response.ok) {
        if (response.status === 0) throw new Error('CORS preflight request failed');
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseBody = await response.json();
      const responseSize = new TextEncoder().encode(JSON.stringify(responseBody)).length;
      const timeInSeconds = responseTime / 1000;
      const bandwidthKBs = responseSize / timeInSeconds / 1024;

      const timestamp = new Date().toLocaleTimeString();
      setCurrentLatency(responseTime);
      setCurrentBandwidth(bandwidthKBs);

      if (forceRecalculate || !maxBandwidth) {
        const calculatedMaxBandwidth = (responseSize / targetTime / 1024) * 2;
        setMaxBandwidth(Math.max(calculatedMaxBandwidth, 1));
      }

      const newHeartbeat = { timestamp, latency: responseTime, bandwidth: bandwidthKBs };
      localHeartbeats.push(newHeartbeat);
      setHeartbeats(localHeartbeats);
      console.log('Heartbeat Added:', newHeartbeat);
      console.log('Current Heartbeats:', localHeartbeats);

      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
      const expectedHeartbeats = Math.floor(durationSeconds / intervalSeconds) + 1;

      if (localHeartbeats.length >= expectedHeartbeats || elapsedSeconds >= durationSeconds) {
        clearInterval(monitoringIntervalRef.current);
        monitoringIntervalRef.current = null;
        setIsMonitoring(false);

        const totalHeartbeats = localHeartbeats.length;
        const avgLatency = localHeartbeats.reduce((sum, hb) => sum + hb.latency, 0) / totalHeartbeats;
        const avgBandwidth = localHeartbeats.reduce((sum, hb) => sum + hb.bandwidth, 0) / totalHeartbeats;

        console.log('Final Heartbeats:', localHeartbeats);
        console.log('Total Heartbeats:', totalHeartbeats);
        console.log('Calculated Avg Latency:', avgLatency, 'Avg Bandwidth:', avgBandwidth);

        setAvgLatency(avgLatency);
        setAvgBandwidth(avgBandwidth);
        setStatus(`
          <div class="timestamp">Monitoring completed at: ${timestamp}</div>
          <div>URL: ${apiUrl}</div>
          <div>Interval: ${intervalSeconds} seconds</div>
          <div>Duration: ${durationSeconds} seconds</div>
          <div>Total Heartbeats: ${totalHeartbeats}</div>
          <div>Average Latency: ${avgLatency.toFixed(2)} ms</div>
          <div>Average Bandwidth: ${avgBandwidth.toFixed(2)} KB/s</div>
        `);
      } else {
        setStatus(`
          <div class="timestamp">Last measured: ${timestamp}</div>
          <div>Status: Success</div>
          <div>URL: ${apiUrl}</div>
          <div>Interval: ${intervalSeconds} seconds</div>
          <div>Elapsed: ${elapsedSeconds.toFixed(1)} / ${durationSeconds} seconds</div>
          <div>Heartbeats: ${localHeartbeats.length} / ${expectedHeartbeats}</div>
        `);
        // Pass the updated localHeartbeats to the next iteration
        setTimeout(() => measureApiResponseTime(false, localHeartbeats), intervalSeconds * 1000);
      }
    } catch (error) {
      const timestamp = new Date().toLocaleTimeString();
      let errorMessage = error.message;
      if (errorMessage.includes('CORS')) {
        errorMessage += '<br><span class="error">Try a CORS-enabled API or use a proxy.</span>';
      }
      setCurrentLatency(0);
      setCurrentBandwidth(0);

      const newHeartbeat = { timestamp, latency: 0, bandwidth: 0, error: errorMessage };
      localHeartbeats.push(newHeartbeat);
      setHeartbeats(localHeartbeats);
      console.log('Heartbeat Added (Error):', newHeartbeat);
      console.log('Current Heartbeats (Error):', localHeartbeats);

      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
      const expectedHeartbeats = Math.floor(durationSeconds / intervalSeconds) + 1;

      if (localHeartbeats.length >= expectedHeartbeats || elapsedSeconds >= durationSeconds) {
        clearInterval(monitoringIntervalRef.current);
        monitoringIntervalRef.current = null;
        setIsMonitoring(false);

        const totalHeartbeats = localHeartbeats.length;
        const avgLatency = localHeartbeats.reduce((sum, hb) => sum + (hb.latency || 0), 0) / totalHeartbeats;
        const avgBandwidth = localHeartbeats.reduce((sum, hb) => sum + (hb.bandwidth || 0), 0) / totalHeartbeats;

        console.log('Final Heartbeats (Error):', localHeartbeats);
        console.log('Total Heartbeats (Error):', totalHeartbeats);
        console.log('Calculated Avg Latency (Error):', avgLatency, 'Avg Bandwidth (Error):', avgBandwidth);

        setAvgLatency(avgLatency);
        setAvgBandwidth(avgBandwidth);
        setStatus(`
          <div class="timestamp">Monitoring completed at: ${timestamp}</div>
          <div>URL: ${apiUrl}</div>
          <div>Interval: ${intervalSeconds} seconds</div>
          <div>Duration: ${durationSeconds} seconds</div>
          <div>Total Heartbeats: ${totalHeartbeats}</div>
          <div>Average Latency: ${avgLatency.toFixed(2)} ms</div>
          <div>Average Bandwidth: ${avgBandwidth.toFixed(2)} KB/s</div>
        `);
      } else {
        setStatus(`
          <div class="error">Error: ${errorMessage}</div>
          <div class="timestamp">Last attempted: ${timestamp}</div>
          <div>URL: ${apiUrl}</div>
          <div>Interval: ${intervalSeconds} seconds</div>
          <div>Elapsed: ${elapsedSeconds.toFixed(1)} / ${durationSeconds} seconds</div>
          <div>Heartbeats: ${localHeartbeats.length} / ${expectedHeartbeats}</div>
        `);
        setTimeout(() => measureApiResponseTime(false, localHeartbeats), intervalSeconds * 1000);
      }
    }
  };

  const startMonitoring = (e) => {
    e.preventDefault();
    if (monitoringIntervalRef.current) clearInterval(monitoringIntervalRef.current);

    try {
      new URL(apiUrl);
    } catch (e) {
      setStatus('<div class="error">Error: Invalid URL format</div>');
      return;
    }

    const interval = parseInt(intervalSeconds);
    if (isNaN(interval) || interval < 1 || interval > 10) {
      setStatus('<div class="error">Error: Interval must be between 1 and 10 seconds</div>');
      return;
    }

    const duration = parseInt(durationSeconds);
    if (isNaN(duration) || duration < interval) {
      setStatus('<div class="error">Error: Duration must be at least the interval length</div>');
      return;
    }

    resetState();
    setIsMonitoring(true);
    startTimeRef.current = Date.now();

    measureApiResponseTime(true, []);
  };

  useEffect(() => {
    return () => {
      if (monitoringIntervalRef.current) clearInterval(monitoringIntervalRef.current);
    };
  }, []);

  const displayLatency = isMonitoring ? currentLatency : avgLatency;
  const displayBandwidth = isMonitoring ? currentBandwidth : avgBandwidth;

  return (
    <div className="event-network-perf">
      <h1>API Response Time Monitor</h1>
      <form id="apiForm" onSubmit={startMonitoring}>
        <input
          type="text"
          id="apiUrl"
          placeholder="Enter API URL (e.g., https://jsonplaceholder.typicode.com/posts/1)"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
        />
        <input
          type="number"
          id="intervalInput"
          min="1"
          max="10"
          step="1"
          value={intervalSeconds}
          onChange={(e) => setIntervalSeconds(e.target.value)}
          title="Monitoring interval in seconds (1-10)"
        /> sec
        <input
          type="number"
          id="durationInput"
          min={intervalSeconds}
          step="1"
          value={durationSeconds}
          onChange={(e) => setDurationSeconds(e.target.value)}
          title="Monitoring duration in seconds"
        /> sec
        <button type="submit" id="startButton">Start Monitoring</button>
      </form>
      <div className="gauges-container">
        <Gauge value={displayLatency} maxValue={maxValueLatency} segments={latencySegments} title="Latency" />
        <Gauge value={displayBandwidth} maxValue={maxBandwidth || 10} segments={bandwidthSegments} title="Bandwidth (KB/s)" />
      </div>
      <div id="info" dangerouslySetInnerHTML={{ __html: status }}></div>
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
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default EventNetworkPerf;