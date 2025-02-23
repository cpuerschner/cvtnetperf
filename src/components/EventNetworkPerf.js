// src/components/EventNetworkPerf.js
import React, { useState, useEffect, useRef } from 'react';
import './EventNetworkPerf.css';

const EventNetworkPerf = () => {
  const [apiUrl, setApiUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [intervalSeconds, setIntervalSeconds] = useState(5);
  const [responseTime, setResponseTime] = useState(0);
  const [status, setStatus] = useState('Enter an API URL and interval, then click "Start Monitoring"');
  const bgCanvasRef = useRef(null);
  const fgCanvasRef = useRef(null);
  const monitoringIntervalRef = useRef(null);

  const maxValue = 250;
  const centerX = 150; // Half of canvas width (300)
  const centerY = 160; // 80% of canvas height (200)
  const radius = 120;  // 40% of canvas width

  // Draw static background on mount
  useEffect(() => {
    const bgCtx = bgCanvasRef.current.getContext('2d');
    bgCtx.beginPath();
    bgCtx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI, false);
    bgCtx.lineWidth = 20;
    bgCtx.strokeStyle = '#e0e0e0';
    bgCtx.stroke();

    const zones = [
      { max: 50, color: '#006400', label: 'Great (0-50ms)' },
      { max: 100, color: '#4CAF50', label: 'Good (50-100ms)' },
      { max: 150, color: '#FFC107', label: 'Moderate (100-150ms)' },
      { max: 200, color: '#FF5722', label: 'Sub Par (150-200ms)' },
      { max: 250, color: '#D32F2F', label: 'Poor (200-250ms)' }
    ];

    let previousAngle = Math.PI;
    zones.forEach(zone => {
      const zonePercentage = Math.min(zone.max / maxValue, 1);
      const endAngle = Math.PI + (zonePercentage * Math.PI);
      bgCtx.beginPath();
      bgCtx.arc(centerX, centerY, radius, previousAngle, endAngle, false);
      bgCtx.strokeStyle = zone.color;
      bgCtx.stroke();
      previousAngle = endAngle;
    });

    drawNeedle(0); // Initial needle position
  }, []);

  // Function to update the needle
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

  const measureApiResponseTime = async () => {
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
      const responseTime = (endTime - startTime).toFixed(2);

      if (!response.ok) {
        if (response.status === 0) throw new Error('CORS preflight request failed');
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const timestamp = new Date().toLocaleTimeString();
      setResponseTime(responseTime);
      drawNeedle(responseTime);
      setStatus(`
        <div class="timestamp">Last measured: ${timestamp}</div>
        <div>Status: Success</div>
        <div>URL: ${apiUrl}</div>
        <div>Interval: ${intervalSeconds} seconds</div>
      `);
    } catch (error) {
      const timestamp = new Date().toLocaleTimeString();
      let errorMessage = error.message;
      if (errorMessage.includes('CORS')) {
        errorMessage += '<br><span class="error">Try a CORS-enabled API or use a proxy.</span>';
      }
      setResponseTime(0);
      drawNeedle(0);
      setStatus(`
        <div class="error">Error: ${errorMessage}</div>
        <div class="timestamp">Last attempted: ${timestamp}</div>
        <div>URL: ${apiUrl}</div>
        <div>Interval: ${intervalSeconds} seconds</div>
      `);
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

    measureApiResponseTime();
    monitoringIntervalRef.current = setInterval(measureApiResponseTime, interval * 1000);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (monitoringIntervalRef.current) clearInterval(monitoringIntervalRef.current);
    };
  }, []);

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
        <button type="submit" id="startButton">Start Monitoring</button>
      </form>
      <div id="gaugeContainer">
        <canvas id="gaugeBackground" width="300" height="200" ref={bgCanvasRef}></canvas>
        <canvas id="gaugeForeground" width="300" height="200" ref={fgCanvasRef}></canvas>
        <div id="responseTime">{responseTime === 0 ? '0.00 ms' : `${responseTime} ms`}</div>
      </div>
      <div id="legend">
        {[
          { color: '#006400', label: 'Great (0-50ms)' },
          { color: '#4CAF50', label: 'Good (50-100ms)' },
          { color: '#FFC107', label: 'Moderate (100-150ms)' },
          { color: '#FF5722', label: 'Sub Par (150-200ms)' },
          { color: '#D32F2F', label: 'Poor (200-250ms)' }
        ].map((zone, index) => (
          <div className="legend-item" key={index}>
            <div className="legend-color" style={{ backgroundColor: zone.color }}></div>
            <span className="legend-label">{zone.label}</span>
          </div>
        ))}
      </div>
      <div id="info" dangerouslySetInnerHTML={{ __html: status }}></div>
    </div>
  );
};

export default EventNetworkPerf;