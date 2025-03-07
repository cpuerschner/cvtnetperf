// src/components/EventNetworkPerf.tsx
import React, { useState, useEffect, useRef } from 'react';
import Gauge from './Gauge.tsx';
import MonitoringForm from './MonitoringForm.tsx';
import InfoPanel from './InfoPanel.tsx';
import '../styles/EventNetworkPerf.css';

interface Heartbeat {
  timestamp: string;
  latency: number;
  bandwidth: number;
  deviceInfo: string;
  deviceName: string;
  error?: string;
}

interface Segment {
  max: number;
  color: string;
  label: string;
}

interface RequestConfig {
  method: string;
  headers: Record<string, string>;
  body?: string;
}

const EventNetworkPerf: React.FC = () => {
  const [apiUrl, setApiUrl] = useState<string>('https://jsonplaceholder.typicode.com/posts/1');
  const [requestConfig, setRequestConfig] = useState<RequestConfig>({
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  const [intervalSeconds, setIntervalSeconds] = useState<number>(2);
  const [durationSeconds, setDurationSeconds] = useState<number>(30);
  const [maxValueLatency, setMaxValueLatency] = useState<number>(250);
  const [currentLatency, setCurrentLatency] = useState<number>(0);
  const [currentBandwidth, setCurrentBandwidth] = useState<number>(0);
  const [avgLatency, setAvgLatency] = useState<number>(0);
  const [avgBandwidth, setAvgBandwidth] = useState<number>(0);
  const [maxBandwidth, setMaxBandwidth] = useState<number | null>(null);
  const [payloadSize, setPayloadSize] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('Enter a curl command, interval, and duration, then click "Start Monitoring"');
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [isInfoCollapsed, setIsInfoCollapsed] = useState<boolean>(true);
  const [deviceName, setDeviceName] = useState<string>(() => {
    const storedName = localStorage.getItem('deviceName');
    if (storedName) return storedName;
    const name = prompt('Enter device location (e.g., North, South, East, West):')?.trim() || 'Unknown';
    localStorage.setItem('deviceName', name);
    return name;
  });
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const targetTime = 0.1;

  const latencySegments: Segment[] = React.useMemo(() => [
    { max: maxValueLatency * 0.2, color: '#006400', label: 'Great (0-20%)' },
    { max: maxValueLatency * 0.4, color: '#4CAF50', label: 'Good (20-40%)' },
    { max: maxValueLatency * 0.6, color: '#FFC107', label: 'Moderate (40-60%)' },
    { max: maxValueLatency * 0.8, color: '#FF5722', label: 'Sub Par (60-80%)' },
    { max: maxValueLatency, color: '#D32F2F', label: 'Poor (80-100%)' },
  ], [maxValueLatency]);

  const bandwidthSegments: Segment[] = React.useMemo(() => {
    const effectiveMax = maxBandwidth || 10; // Match gauge fallback
    return [
      { max: effectiveMax * 0.2, color: '#D32F2F', label: `Poor (0-${(effectiveMax * 0.2).toFixed(2)} KB/s)` },
      { max: effectiveMax * 0.4, color: '#FF5722', label: `Sub Par (${(effectiveMax * 0.2).toFixed(2)}-${(effectiveMax * 0.4).toFixed(2)} KB/s)` },
      { max: effectiveMax * 0.6, color: '#FFC107', label: `Moderate (${(effectiveMax * 0.4).toFixed(2)}-${(effectiveMax * 0.6).toFixed(2)} KB/s)` },
      { max: effectiveMax * 0.8, color: '#4CAF50', label: `Good (${(effectiveMax * 0.6).toFixed(2)}-${(effectiveMax * 0.8).toFixed(2)} KB/s)` },
      { max: effectiveMax, color: '#006400', label: `Great (${(effectiveMax * 0.8).toFixed(2)}-${effectiveMax.toFixed(2)} KB/s)` },
    ];
  }, [maxBandwidth]);

  const getDeviceInfo = (): string => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad/i.test(ua)) return 'Mobile (iOS)';
    if (/Android/i.test(ua)) return `${/Mobile/.test(ua) ? 'Mobile' : 'Tablet'} (Android)`;
    if (/Windows NT/i.test(ua)) return 'Windows (Windows)';
    if (/Mac OS X/i.test(ua)) return 'MacBook (macOS)';
    if (/Linux/i.test(ua)) return 'Unix Desktop (Linux)';
    return 'Unknown Device (Unknown OS)';
  };

  const resetState = (): void => {
    setHeartbeats([]);
    setCurrentLatency(0);
    setCurrentBandwidth(0);
    setAvgLatency(0);
    setAvgBandwidth(0);
    // Keep maxBandwidth intact to avoid resetting segments
    setPayloadSize(null);
    setStatus('Enter a curl command, interval, and duration, then click "Start Monitoring"');
  };

  const getColor = (value: number, segments: Segment[]): string => {
    if (!segments.length) return '#666'; // Shouldn't hit this now with fallback
    for (const segment of segments) {
      if (value <= segment.max) return segment.color;
    }
    return segments[segments.length - 1].color;
  };

  const startMonitoring = (
    newApiUrl: string,
    newRequestConfig: RequestConfig,
    newIntervalSeconds: string,
    newDurationSeconds: string,
    newMaxValueLatency: string,
    formCurl: string
  ): void => {
    console.log('Starting monitoring with:', { apiUrl: newApiUrl, requestConfig: newRequestConfig, intervalSeconds: newIntervalSeconds, durationSeconds: newDurationSeconds, maxValueLatency: newMaxValueLatency });

    const cleanedRequestConfig: RequestConfig = {
      ...newRequestConfig,
      body: (newRequestConfig.method === 'GET' || newRequestConfig.method === 'HEAD') ? undefined : newRequestConfig.body,
    };

    try {
      new URL(newApiUrl);
    } catch (e) {
      setStatus(`<div class="error">Error: Invalid URL format</div>`);
      return;
    }

    const interval = parseInt(newIntervalSeconds) || 2;
    const duration = parseInt(newDurationSeconds) || 30;
    const latencyMax = parseInt(newMaxValueLatency) || 250;

    if (interval < 1 || interval > 10) {
      setStatus(`<div class="error">Error: Interval must be between 1 and 10 seconds</div>`);
      return;
    }
    if (duration < interval) {
      setStatus(`<div class="error">Error: Duration must be at least the interval length</div>`);
      return;
    }
    if (latencyMax < 1 || latencyMax > 1000) {
      setStatus(`<div class="error">Error: Latency Max Value must be between 1 and 1000 ms</div>`);
      return;
    }

    resetState();
    setApiUrl(newApiUrl);
    setRequestConfig(cleanedRequestConfig);
    setIntervalSeconds(interval);
    setDurationSeconds(duration);
    setMaxValueLatency(latencyMax);
    setIsMonitoring(true);
    const monitorBeganAt = new Date().toLocaleString();
    startTimeRef.current = Date.now();

    measureApiResponseTime(true, [], interval, duration, newApiUrl, cleanedRequestConfig, formCurl, monitorBeganAt);
  };

  const measureApiResponseTime = async (
    forceRecalculate: boolean,
    localHeartbeats: Heartbeat[],
    interval: number,
    duration: number,
    currentApiUrl: string,
    currentRequestConfig: RequestConfig,
    formCurl: string,
    monitorBeganAt: string
  ): Promise<void> => {
    console.log('Measuring with params:', { apiUrl: currentApiUrl, requestConfig: currentRequestConfig, interval, duration });

    try {
      const startTime = performance.now();
      const response = await fetch(currentApiUrl, {
        method: currentRequestConfig.method,
        headers: currentRequestConfig.headers,
        body: currentRequestConfig.body,
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit',
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      if (!response.ok) {
        throw new Error(response.status === 0 ? 'CORS preflight request failed' : `HTTP error! status: ${response.status}`);
      }

      const responseBody = await response.json();
      const responseSize = new TextEncoder().encode(JSON.stringify(responseBody)).length;
      const timeInSeconds = responseTime / 1000;
      const bandwidthKBs = responseSize / timeInSeconds / 1024;

      const timestamp = new Date().toLocaleTimeString();
      setCurrentLatency(responseTime);
      setCurrentBandwidth(bandwidthKBs);
      setPayloadSize(responseSize);

      // Always update maxBandwidth to ensure segments are ready
      setMaxBandwidth(prev => Math.max(prev || 0, (responseSize / targetTime / 1024) * 2, 1));

      const deviceInfo = getDeviceInfo();
      const newHeartbeat: Heartbeat = {
        timestamp,
        latency: responseTime,
        bandwidth: bandwidthKBs,
        deviceInfo,
        deviceName,
      };
      localHeartbeats.push(newHeartbeat);
      setHeartbeats([...localHeartbeats]);

      const elapsedSeconds = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0;
      const expectedHeartbeats = Math.floor(duration / interval) + 1;

      if (localHeartbeats.length >= expectedHeartbeats || elapsedSeconds >= duration) {
        if (monitoringIntervalRef.current) clearInterval(monitoringIntervalRef.current);
        monitoringIntervalRef.current = null;
        setIsMonitoring(false);

        const totalHeartbeats = localHeartbeats.length;
        const avgLatency = localHeartbeats.reduce((sum, hb) => sum + hb.latency, 0) / totalHeartbeats;
        const avgBandwidth = localHeartbeats.reduce((sum, hb) => sum + hb.bandwidth, 0) / totalHeartbeats;

        setAvgLatency(avgLatency);
        setAvgBandwidth(avgBandwidth);

        const latencyColor = getColor(avgLatency, latencySegments);
        const bandwidthColor = getColor(avgBandwidth, bandwidthSegments);

        console.log('Completion Averages:', {
          avgLatency,
          latencyColor,
          maxValueLatency,
          latencySegments,
          avgBandwidth,
          bandwidthColor,
          maxBandwidth,
          bandwidthSegments,
        });

        setStatus(`
          <div>Start Time: ${monitorBeganAt}</div>
          <div class="timestamp">End Time: ${new Date().toLocaleString()}</div>
          <div>cURL: ${formCurl}</div>
          <div>Method: ${currentRequestConfig.method}</div>
          <div>Interval: ${interval} seconds</div>
          <div>Duration: ${duration} seconds</div>
          <div>Total Heartbeats: ${totalHeartbeats}</div>
          <div>Average Latency: <span style="color: ${latencyColor}">${avgLatency.toFixed(2)} ms</span></div>
          <div>Average Bandwidth: <span style="color: ${bandwidthColor}">${avgBandwidth.toFixed(2)} KB/s</span></div>
        `);
      } else {
        setStatus(`
          <div>Start Time: ${monitorBeganAt}</div>
          <div class="timestamp">Last measured: ${timestamp}</div>
          <div>Status: Success</div>
          <div>cURL: ${formCurl}</div>
          <div>Method: ${currentRequestConfig.method}</div>
          <div>Interval: ${interval} seconds</div>
          <div>Elapsed: ${elapsedSeconds.toFixed(1)} / ${duration} seconds</div>
          <div>Heartbeats: ${localHeartbeats.length} / ${expectedHeartbeats}</div>
        `);
        setTimeout(() => measureApiResponseTime(false, localHeartbeats, interval, duration, currentApiUrl, currentRequestConfig, formCurl, monitorBeganAt), interval * 1000);
      }
    } catch (error) {
      const timestamp = new Date().toLocaleTimeString();
      let errorMessage = (error as Error).message;
      if (errorMessage.includes('CORS')) errorMessage += '<br><span class="error">Try a CORS-enabled API or use a proxy.</span>';
      setCurrentLatency(0);
      setCurrentBandwidth(0);
      setPayloadSize(null);

      const deviceInfo = getDeviceInfo();
      const newHeartbeat: Heartbeat = { timestamp, latency: 0, bandwidth: 0, deviceInfo, deviceName, error: errorMessage };
      localHeartbeats.push(newHeartbeat);
      setHeartbeats([...localHeartbeats]);

      const elapsedSeconds = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0;
      const expectedHeartbeats = Math.floor(duration / interval) + 1;

      if (localHeartbeats.length >= expectedHeartbeats || elapsedSeconds >= duration) {
        if (monitoringIntervalRef.current) clearInterval(monitoringIntervalRef.current);
        monitoringIntervalRef.current = null;
        setIsMonitoring(false);

        const totalHeartbeats = localHeartbeats.length;
        const avgLatency = localHeartbeats.reduce((sum, hb) => sum + hb.latency, 0) / totalHeartbeats;
        const avgBandwidth = localHeartbeats.reduce((sum, hb) => sum + hb.bandwidth, 0) / totalHeartbeats;

        setAvgLatency(avgLatency);
        setAvgBandwidth(avgBandwidth);

        const latencyColor = getColor(avgLatency, latencySegments);
        const bandwidthColor = getColor(avgBandwidth, bandwidthSegments);

        console.log('Error Completion Averages:', {
          avgLatency,
          latencyColor,
          maxValueLatency,
          latencySegments,
          avgBandwidth,
          bandwidthColor,
          maxBandwidth,
          bandwidthSegments,
        });

        setStatus(`
          <div>Start Time: ${monitorBeganAt}</div>
          <div class="timestamp">End Time: ${new Date().toLocaleString()}</div>
          <div>cURL: ${formCurl}</div>
          <div>Method: ${currentRequestConfig.method}</div>
          <div>Interval: ${interval} seconds</div>
          <div>Duration: ${duration} seconds</div>
          <div>Total Heartbeats: ${totalHeartbeats}</div>
          <div>Average Latency: <span style="color: ${latencyColor}">${avgLatency.toFixed(2)} ms</span></div>
          <div>Average Bandwidth: <span style="color: ${bandwidthColor}">${avgBandwidth.toFixed(2)} KB/s</span></div>
        `);
      } else {
        setStatus(`
          <div>Start Time: ${monitorBeganAt}</div>
          <div class="error">Error: ${errorMessage}</div>
          <div class="timestamp">Last attempted: ${timestamp}</div>
          <div>cURL: ${formCurl}</div>
          <div>Method: ${currentRequestConfig.method}</div>
          <div>Interval: ${interval} seconds</div>
          <div>Elapsed: ${elapsedSeconds.toFixed(1)} / ${duration} seconds</div>
          <div>Heartbeats: ${localHeartbeats.length} / ${expectedHeartbeats}</div>
        `);
        setTimeout(() => measureApiResponseTime(false, localHeartbeats, interval, duration, currentApiUrl, currentRequestConfig, formCurl, monitorBeganAt), interval * 1000);
      }
    }
  };

  const exportHeartbeatsToFile = () => {
    if (!heartbeats.length) {
      alert('No heartbeat data to export.');
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(status, 'text/html');
    const statusDivs = Array.from(doc.body.querySelectorAll('div'));
    const statusInfo: Record<string, string> = {};
    statusDivs.forEach(div => {
      const text = div.textContent || '';
      const [key, value] = text.includes(':') ? text.split(/:\s*(.+)/) : [text, ''];
      if (key) {
        const camelCaseKey = key
          .replace(/\s+(.)/g, (_, char) => char.toUpperCase())
          .replace(/^(.)/, (_, char) => char.toLowerCase());
        statusInfo[camelCaseKey] = value || key;
      }
    });

    const exportData = {
      heartbeats,
      devicePayloadInfo: {
        deviceName,
        payloadSize: payloadSize ? `${(payloadSize / 1024).toFixed(2)} KB` : 'N/A'
      },
      statusInfo
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'heartbeats.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const heartbeatItems = React.useMemo(() => heartbeats.map((hb, index) => {
    return (
      <li key={index} className="heartbeat-item">
        <span className="heartbeat-timestamp">{hb.timestamp}</span>
        {hb.error ? (
          <span className="heartbeat-error">{hb.error}</span>
        ) : (
          <>
            <span className="heartbeat-latency" style={{ color: getColor(hb.latency, latencySegments) }}>
              Latency: {hb.latency.toFixed(2)} ms
            </span>
            <span className="heartbeat-bandwidth" style={{ color: getColor(hb.bandwidth, bandwidthSegments) }}>
              Bandwidth: {hb.bandwidth.toFixed(2)} KB/s
            </span>
            <span className="heartbeat-device">Device: {hb.deviceInfo} ({hb.deviceName})</span>
          </>
        )}
      </li>
    );
  }), [heartbeats, latencySegments, bandwidthSegments]);

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
        requestConfig={requestConfig}
        intervalSeconds={intervalSeconds} 
        durationSeconds={durationSeconds} 
        maxValueLatency={maxValueLatency} 
        onSubmit={startMonitoring} 
      />
      <div className="gauges-container">
        <Gauge value={displayLatency} maxValue={maxValueLatency} segments={latencySegments} title="Latency" />
        <Gauge key={maxBandwidth} value={displayBandwidth} maxValue={maxBandwidth || 10} segments={bandwidthSegments} title="Bandwidth" />
      </div>
      <div className="monitoring-info">
        <button onClick={() => setIsInfoCollapsed(!isInfoCollapsed)} className="toggle-button">
          {isInfoCollapsed ? 'Show Monitoring Info' : 'Hide Monitoring Info'}
        </button>
        {!isInfoCollapsed && (
          <div className="monitoring-info-content">
            <div className="device-payload-info">
              <h3>Device & Payload</h3>
              <ul>
                <li className="info-item">
                  <span className="info-label">Device Name:</span>
                  <span className="info-value">{deviceName}</span>
                </li>
                <li className="info-item">
                  <span className="info-label">Payload Size:</span>
                  <span className="info-value">{payloadSize ? `${(payloadSize / 1024).toFixed(2)} KB` : 'N/A'}</span>
                </li>
              </ul>
            </div>
            <InfoPanel status={status} isInfoCollapsed={false} onToggle={() => {}} />
            <div className="heartbeat-list">
              <button onClick={exportHeartbeatsToFile} disabled={!heartbeats.length} className="export-button">
                Export Heartbeats to File
              </button>
              {heartbeats.length > 0 && (
                <>
                  <h3>Heartbeat Log</h3>
                  <ul>{heartbeatItems}</ul>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventNetworkPerf;