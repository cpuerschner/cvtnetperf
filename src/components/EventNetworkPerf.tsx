// src/components/EventNetworkPerf.js
import React, { useState, useEffect, useRef } from 'react';
import Gauge from './Gauge.tsx';
import HeartbeatLog from './HeartbeatLog.tsx';
import MonitoringForm from './MonitoringForm.tsx';
import InfoPanel from './InfoPanel.tsx'; // Still works without .tsx here
import '../styles/EventNetworkPerf.css';
import { UAParser } from 'ua-parser-js';

const EventNetworkPerf: React.FC = () => {
  // Existing state declarations remain unchanged for now
  const [apiUrl, setApiUrl] = useState<string>('https://jsonplaceholder.typicode.com/posts/1');
  const [intervalSeconds, setIntervalSeconds] = useState<number>(2);
  const [durationSeconds, setDurationSeconds] = useState<number>(30);
  const [maxValueLatency, setMaxValueLatency] = useState<number>(250);
  const [currentLatency, setCurrentLatency] = useState<number>(0);
  const [currentBandwidth, setCurrentBandwidth] = useState<number>(0);
  const [avgLatency, setAvgLatency] = useState<number>(0);
  const [avgBandwidth, setAvgBandwidth] = useState<number>(0);
  const [maxBandwidth, setMaxBandwidth] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('Enter an API URL, interval, and duration, then click "Start Monitoring"');
  const [heartbeats, setHeartbeats] = useState<any[]>([]); // Refine this type later
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [isInfoCollapsed, setIsInfoCollapsed] = useState<boolean>(true);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const targetTime = 0.1;

  const latencySegments = [
    { max: maxValueLatency * 0.2, color: '#006400', label: 'Great (0-20%)' },
    { max: maxValueLatency * 0.4, color: '#4CAF50', label: 'Good (20-40%)' },
    { max: maxValueLatency * 0.6, color: '#FFC107', label: 'Moderate (40-60%)' },
    { max: maxValueLatency * 0.8, color: '#FF5722', label: 'Sub Par (60-80%)' },
    { max: maxValueLatency, color: '#D32F2F', label: 'Poor (80-100%)' },
  ];

  const bandwidthSegments = maxBandwidth
    ? [
        { max: maxBandwidth * 0.2, color: '#D32F2F', label: `Poor (0-${(maxBandwidth * 0.2).toFixed(2)} KB/s)` },
        { max: maxBandwidth * 0.4, color: '#FF5722', label: `Sub Par (${(maxBandwidth * 0.2).toFixed(2)}-${(maxBandwidth * 0.4).toFixed(2)} KB/s)` },
        { max: maxBandwidth * 0.6, color: '#FFC107', label: `Moderate (${(maxBandwidth * 0.4).toFixed(2)}-${(maxBandwidth * 0.6).toFixed(2)} KB/s)` },
        { max: maxBandwidth * 0.8, color: '#4CAF50', label: `Good (${(maxBandwidth * 0.6).toFixed(2)}-${(maxBandwidth * 0.8).toFixed(2)} KB/s)` },
        { max: maxBandwidth, color: '#006400', label: `Great (${(maxBandwidth * 0.8).toFixed(2)}-${maxBandwidth.toFixed(2)} KB/s)` },
      ]
    : [];

  const getDeviceInfo = () => {
    const parser = new UAParser();
    const result = parser.getResult();
    let deviceType = 'Unknown Device';
    let os = 'Unknown OS';

    if (/iPhone|iPad/i.test(navigator.userAgent)) {
      deviceType = 'Mobile';
      os = 'iOS';
    } else if (/Android/i.test(navigator.userAgent)) {
      deviceType = /Mobile/.test(navigator.userAgent) ? 'Mobile' : 'Tablet';
      os = 'Android';
    } else if (/Windows NT/i.test(navigator.userAgent)) {
      deviceType = 'Windows';
      os = 'Windows';
    } else if (/Mac OS X/i.test(navigator.userAgent)) {
      deviceType = 'MacBook';
      os = 'macOS';
    } else if (/Linux/i.test(navigator.userAgent)) {
      deviceType = 'Unix Desktop';
      os = 'Linux';
    }

    return `${deviceType} (${os})`;
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

  const startMonitoring = (newApiUrl, newIntervalSeconds, newDurationSeconds, newMaxValueLatency) => {
    console.log('Starting monitoring with:', {
      apiUrl: newApiUrl,
      intervalSeconds: newIntervalSeconds,
      durationSeconds: newDurationSeconds,
      maxValueLatency: newMaxValueLatency,
    });
    setApiUrl(newApiUrl);
    setIntervalSeconds(parseInt(newIntervalSeconds) || 2);
    setDurationSeconds(parseInt(newDurationSeconds) || 30);
    setMaxValueLatency(parseInt(newMaxValueLatency) || 250);

    if (monitoringIntervalRef.current) clearInterval(monitoringIntervalRef.current);

    try {
      new URL(newApiUrl);
    } catch (e) {
      setStatus('<div class="error">Error: Invalid URL format</div>');
      return;
    }

    const interval = parseInt(newIntervalSeconds) || 2;
    const duration = parseInt(newDurationSeconds) || 30;
    const latencyMax = parseInt(newMaxValueLatency) || 250;
    if (isNaN(interval) || interval < 1 || interval > 10) {
      setStatus('<div class="error">Error: Interval must be between 1 and 10 seconds</div>');
      return;
    }

    if (isNaN(duration) || duration < interval) {
      setStatus('<div class="error">Error: Duration must be at least the interval length</div>');
      return;
    }

    if (isNaN(latencyMax) || latencyMax < 1 || latencyMax > 1000) {
      setStatus('<div class="error">Error: Latency Max Value must be between 1 and 1000 ms</div>');
      return;
    }

    resetState();
    setIsMonitoring(true);
    startTimeRef.current = Date.now();

    measureApiResponseTime(true, [], interval, duration);
  };

  const measureApiResponseTime = async (forceRecalculate = false, localHeartbeats = [], interval, duration) => {
    console.log('Measuring with params:', {
      apiUrl,
      interval,
      duration,
    });
    if (interval <= 0 || duration <= 0) {
      console.error('Invalid interval or duration detected:', { interval, duration });
      return;
    }

    try {
      const startTime = performance.now();
      const response = await fetch(apiUrl, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit',
        headers: { 'Accept': 'application/json' },
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

      const deviceInfo = getDeviceInfo();
      const newHeartbeat = { timestamp, latency: responseTime, bandwidth: bandwidthKBs, deviceInfo };
      localHeartbeats.push(newHeartbeat);
      setHeartbeats(localHeartbeats);
      console.log('Heartbeat Added:', newHeartbeat);

      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
      const expectedHeartbeats = Math.floor(duration / interval) + 1;
      console.log('Heartbeat Logic:', {
        elapsedSeconds,
        duration,
        interval,
        expectedHeartbeats,
        currentHeartbeats: localHeartbeats.length,
      });

      if (localHeartbeats.length >= expectedHeartbeats || elapsedSeconds >= duration) {
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
          <div>Interval: ${interval} seconds</div>
          <div>Duration: ${duration} seconds</div>
          <div>Total Heartbeats: ${totalHeartbeats}</div>
          <div>Average Latency: ${avgLatency.toFixed(2)} ms</div>
          <div>Average Bandwidth: ${avgBandwidth.toFixed(2)} KB/s</div>
        `);
      } else {
        setStatus(`
          <div class="timestamp">Last measured: ${timestamp}</div>
          <div>Status: Success</div>
          <div>URL: ${apiUrl}</div>
          <div>Interval: ${interval} seconds</div>
          <div>Elapsed: ${elapsedSeconds.toFixed(1)} / ${duration} seconds</div>
          <div>Heartbeats: ${localHeartbeats.length} / ${expectedHeartbeats}</div>
        `);
        setTimeout(() => measureApiResponseTime(false, localHeartbeats, interval, duration), interval * 1000);
      }
    } catch (error) {
      const timestamp = new Date().toLocaleTimeString();
      let errorMessage = error.message;
      if (errorMessage.includes('CORS')) {
        errorMessage += '<br><span class="error">Try a CORS-enabled API or use a proxy.</span>';
      }
      setCurrentLatency(0);
      setCurrentBandwidth(0);

      const deviceInfo = getDeviceInfo();
      const newHeartbeat = { timestamp, latency: 0, bandwidth: 0, error: errorMessage, deviceInfo };
      localHeartbeats.push(newHeartbeat);
      setHeartbeats(localHeartbeats);
      console.log('Heartbeat Added (Error):', newHeartbeat);

      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
      const expectedHeartbeats = Math.floor(duration / interval) + 1;

      if (localHeartbeats.length >= expectedHeartbeats || elapsedSeconds >= duration) {
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
          <div>Interval: ${interval} seconds</div>
          <div>Duration: ${duration} seconds</div>
          <div>Total Heartbeats: ${totalHeartbeats}</div>
          <div>Average Latency: ${avgLatency.toFixed(2)} ms</div>
          <div>Average Bandwidth: ${avgBandwidth.toFixed(2)} KB/s</div>
        `);
      } else {
        setStatus(`
          <div class="error">Error: ${errorMessage}</div>
          <div class="timestamp">Last attempted: ${timestamp}</div>
          <div>URL: ${apiUrl}</div>
          <div>Interval: ${interval} seconds</div>
          <div>Elapsed: ${elapsedSeconds.toFixed(1)} / ${duration} seconds</div>
          <div>Heartbeats: ${localHeartbeats.length} / ${expectedHeartbeats}</div>
        `);
        setTimeout(() => measureApiResponseTime(false, localHeartbeats, interval, duration), interval * 1000);
      }
    }
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
      <MonitoringForm 
        apiUrl={apiUrl} 
        intervalSeconds={intervalSeconds} 
        durationSeconds={durationSeconds} 
        maxValueLatency={maxValueLatency} 
        onSubmit={startMonitoring} 
      />
      <div className="gauges-container">
        <Gauge value={displayLatency} maxValue={maxValueLatency} segments={latencySegments} title="Latency" />
        <Gauge key={maxBandwidth} value={displayBandwidth} maxValue={maxBandwidth || 10} segments={bandwidthSegments} title="Bandwidth" />
      </div>
      <InfoPanel status={status} isInfoCollapsed={isInfoCollapsed} onToggle={() => setIsInfoCollapsed(!isInfoCollapsed)} />
      <HeartbeatLog heartbeats={heartbeats} latencySegments={latencySegments} bandwidthSegments={bandwidthSegments} />
    </div>
  );
};

export default EventNetworkPerf;