// src/components/EventNetworkPerf.tsx
import React, { useState, useEffect, useRef } from 'react';
import Gauge from './Gauge.tsx';
import MonitoringForm from './MonitoringForm.tsx';
import InfoPanel from './InfoPanel.tsx';
import HeartbeatLog from './HeartbeatLog.tsx';
import { RequestConfig, Heartbeat, Segment } from '../types';
import '../styles/EventNetworkPerf.css';

const EventNetworkPerf: React.FC = () => {
  const [apiUrl, setApiUrl] = useState<string>('https://jsonplaceholder.typicode.com/posts/1');
  const [requestConfig, setRequestConfig] = useState<RequestConfig>({
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  const [formCurl, setFormCurl] = useState<string>('');
  const [intervalSeconds, setIntervalSeconds] = useState<number>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
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
  const [deviceName] = useState<string>(() => {
    const storedName = localStorage.getItem('deviceName');
    if (storedName) return storedName;
    const name = prompt('Enter device location (e.g., North, South, East, West):')?.trim() || 'Unknown';
    localStorage.setItem('deviceName', name);
    return name;
  });
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const monitoringTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const targetTime = 0.1;

  const latencySegments = React.useMemo<Segment[]>(() => [
    { max: maxValueLatency * 0.2, color: '#006400', label: 'Great (0-20%)' },
    { max: maxValueLatency * 0.4, color: '#4CAF50', label: 'Good (20-40%)' },
    { max: maxValueLatency * 0.6, color: '#FFC107', label: 'Moderate (40-60%)' },
    { max: maxValueLatency * 0.8, color: '#FF5722', label: 'Sub Par (60-80%)' },
    { max: maxValueLatency, color: '#D32F2F', label: 'Poor (80-100%)' },
  ], [maxValueLatency]);

  const bandwidthSegments = React.useMemo<Segment[]>(() => {
    const effectiveMax = maxBandwidth || 10;
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
    setPayloadSize(null);
    setStatus('Enter a curl command, interval, and duration, then click "Start Monitoring"');
  };

  const getColor = (value: number, segments: Segment[]): string => {
    if (!segments.length) return '#666';
    for (const segment of segments) {
      if (value <= segment.max) return segment.color;
    }
    return segments[segments.length - 1].color;
  };

  const validateInputs = (
    newApiUrl: string,
    newIntervalSeconds: string,
    newDurationSeconds: string,
    newMaxValueLatency: string
  ): { interval: number; duration: number; latencyMax: number } | null => {
    try {
      new URL(newApiUrl);
    } catch {
      setStatus(`<div className="error">Error: Invalid URL format</div>`);
      return null;
    }

    const interval = parseInt(newIntervalSeconds);
    const duration = parseInt(newDurationSeconds);
    const latencyMax = parseInt(newMaxValueLatency) || 250;

    if (isNaN(interval) || interval < 1 || interval > 10) {
      setStatus(`<div className="error">Error: Interval must be a number between 1 and 10 seconds</div>`);
      return null;
    }
    if (isNaN(duration) || duration < interval) {
      setStatus(`<div className="error">Error: Duration must be a number at least equal to the interval</div>`);
      return null;
    }
    if (latencyMax < 1 || latencyMax > 1000) {
      setStatus(`<div className="error">Error: Latency Max Value must be between 1 and 1000 ms</div>`);
      return null;
    }

    return { interval, duration, latencyMax };
  };

  const startMonitoring = (
    newApiUrl: string,
    newRequestConfig: RequestConfig,
    newIntervalSeconds: string,
    newDurationSeconds: string,
    newMaxValueLatency: string,
    formCurl: string
  ): void => {
    const validated = validateInputs(newApiUrl, newIntervalSeconds, newDurationSeconds, newMaxValueLatency);
    if (!validated) return;

    const { interval, duration, latencyMax } = validated;
    const cleanedRequestConfig: RequestConfig = {
      ...newRequestConfig,
      body: (newRequestConfig.method === 'GET' || newRequestConfig.method === 'HEAD') ? undefined : newRequestConfig.body,
    };

    resetState();
    setApiUrl(newApiUrl);
    setRequestConfig(cleanedRequestConfig);
    setFormCurl(formCurl);
    setIntervalSeconds(interval);
    setDurationSeconds(duration);
    setMaxValueLatency(latencyMax);
    setIsMonitoring(true);

    const monitorBeganAt = new Date().toLocaleString();
    const startTime = Date.now();
    let localHeartbeats: Heartbeat[] = [];
    let isMonitoringLocal = true;

    const measure = async () => {
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      console.log('Measure called, elapsed:', elapsedSeconds.toFixed(1), 'isMonitoring (state):', isMonitoring, 'isMonitoringLocal:', isMonitoringLocal);
      if (elapsedSeconds > duration || !isMonitoringLocal) {
        console.log('Measure stopped: elapsed > duration or not monitoring');
        return;
      }

      console.log('Calling measureApiResponseTime...');
      const heartbeat = await measureApiResponseTime(newApiUrl, cleanedRequestConfig, formCurl, monitorBeganAt, startTime);
      console.log('Heartbeat measured:', heartbeat);
      localHeartbeats.push(heartbeat);
      setHeartbeats([...localHeartbeats]);
      console.log('Heartbeats state updated, count:', localHeartbeats.length);
      setStatus(`
        <div>Start Time: ${monitorBeganAt}</div>
        <div className="timestamp">Last measured: ${heartbeat.timestamp}</div>
        <div>Status: ${heartbeat.error ? 'Error' : 'Success'}</div>
        <div>cURL: ${formCurl}</div>
        <div>Method: ${cleanedRequestConfig.method}</div>
        <div>Interval: ${interval} seconds</div>
        <div>Elapsed: ${elapsedSeconds.toFixed(1)} / ${duration} seconds</div>
        <div>Heartbeats: ${localHeartbeats.length} / ${Math.floor(duration / interval) + 1}</div>
        ${heartbeat.error ? `<div className="error">Error: ${heartbeat.error}</div>` : ''}
      `);
    };

    console.log('Starting monitoring, initial isMonitoring:', isMonitoring);
    measure().catch(error => console.error('Initial measure failed:', error));
    monitoringIntervalRef.current = setInterval(measure, interval * 1000);
    monitoringTimeoutRef.current = setTimeout(() => {
      console.log('Stopping monitoring...');
      isMonitoringLocal = false;
      stopMonitoring(localHeartbeats, monitorBeganAt, formCurl, cleanedRequestConfig, interval, duration, false);
    }, duration * 1000);

    const stopManually = () => {
      if (!isMonitoring) return;
      console.log('Manual stop triggered');
      isMonitoringLocal = false;
      stopMonitoring(localHeartbeats, monitorBeganAt, formCurl, cleanedRequestConfig, interval, duration, true);
    };
    (startMonitoring as any).stopManually = stopManually;
  };

  const stopMonitoring = (
    localHeartbeats: Heartbeat[],
    monitorBeganAt: string,
    formCurl: string,
    requestConfig: RequestConfig,
    interval: number,
    duration: number,
    userInitiated: boolean
  ): void => {
    if (monitoringIntervalRef.current) clearInterval(monitoringIntervalRef.current);
    if (monitoringTimeoutRef.current) clearTimeout(monitoringTimeoutRef.current);
    setIsMonitoring(false);

    const avgLatency = localHeartbeats.length ? localHeartbeats.reduce((sum, hb) => sum + hb.latency, 0) / localHeartbeats.length : 0;
    const avgBandwidth = localHeartbeats.length ? localHeartbeats.reduce((sum, hb) => sum + hb.bandwidth, 0) / localHeartbeats.length : 0;
    setAvgLatency(avgLatency);
    setAvgBandwidth(avgBandwidth);

    const latencyColor = getColor(avgLatency, latencySegments);
    const bandwidthColor = getColor(avgBandwidth, bandwidthSegments);
    const endMessage = userInitiated ? '<div className="info">Monitoring stopped by user</div>' : '';
    setStatus(`
      <div>Start Time: ${monitorBeganAt}</div>
      <div className="timestamp">End Time: ${new Date().toLocaleString()}</div>
      ${endMessage}
      <div>cURL: ${formCurl}</div>
      <div>Method: ${requestConfig.method}</div>
      <div>Interval: ${interval} seconds</div>
      <div>Duration: ${duration} seconds</div>
      <div>Total Heartbeats: ${localHeartbeats.length}</div>
      <div>Average Latency: <span style="color: ${latencyColor}">${avgLatency.toFixed(2)} ms</span></div>
      <div>Average Bandwidth: <span style="color: ${bandwidthColor}">${avgBandwidth.toFixed(2)} KB/s</span></div>
    `);
  };

  const measureApiResponseTime = async (
    apiUrl: string,
    requestConfig: RequestConfig,
    formCurl: string,
    monitorBeganAt: string,
    startTime: number
  ): Promise<Heartbeat> => {
    console.log('Fetching from:', apiUrl);
    let errorMessage: string | undefined;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const start = performance.now();
      const response = await fetch(apiUrl, {
        method: requestConfig.method,
        headers: requestConfig.headers,
        body: requestConfig.body,
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const end = performance.now();
      const responseTime = end - start;

      if (!response.ok) {
        throw new Error(response.status === 0 ? 'CORS preflight request failed' : `HTTP error! status: ${response.status}`);
      }

      const responseBody = await response.json();
      const responseSize = new TextEncoder().encode(JSON.stringify(responseBody)).length;
      const timeInSeconds = responseTime / 1000;
      const bandwidthKBs = responseSize / timeInSeconds / 1024;

      setCurrentLatency(responseTime);
      setCurrentBandwidth(bandwidthKBs);
      setPayloadSize(responseSize);
      setMaxBandwidth(prev => Math.max(prev || 0, (responseSize / targetTime / 1024) * 2, 1));

      return {
        timestamp: new Date().toLocaleTimeString(),
        latency: responseTime,
        bandwidth: bandwidthKBs,
        deviceInfo: getDeviceInfo(),
        deviceName,
      };
    } catch (error) {
      errorMessage = (error as Error).message;
      if (errorMessage === 'The operation was aborted') {
        errorMessage = 'Fetch timed out after 3 seconds';
      } else if (errorMessage.includes('CORS')) {
        errorMessage += '<br><span className="error">Try a CORS-enabled API or use a proxy.</span>';
      }
      setCurrentLatency(0);
      setCurrentBandwidth(0);
      setPayloadSize(null);

      return {
        timestamp: new Date().toLocaleTimeString(),
        latency: 0,
        bandwidth: 0,
        deviceInfo: getDeviceInfo(),
        deviceName,
        error: errorMessage,
      };
    }
  };

  const handleStopMonitoring = () => {
    if (!isMonitoring) return;
    (startMonitoring as any).stopManually();
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
        payloadSize: payloadSize ? `${(payloadSize / 1024).toFixed(2)} KB` : 'N/A',
      },
      statusInfo: {
        ...statusInfo,
        stoppedByUser: status.includes('Monitoring stopped by user') ? 'true' : 'false',
      },
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

  useEffect(() => {
    return () => {
      if (monitoringIntervalRef.current) clearInterval(monitoringIntervalRef.current);
      if (monitoringTimeoutRef.current) clearTimeout(monitoringTimeoutRef.current);
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
        {isMonitoring && (
          <button onClick={handleStopMonitoring} className="stop-button">
            Stop Monitoring
          </button>
        )}
        {!isMonitoring && heartbeats.length > 0 && (
          <button onClick={exportHeartbeatsToFile} className="export-button">
            Export Session
          </button>
        )}
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
            <HeartbeatLog
              heartbeats={heartbeats}
              latencySegments={latencySegments}
              bandwidthSegments={bandwidthSegments}
              onExport={() => {}} // Empty prop since button moved
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default EventNetworkPerf;