// src/components/MonitoringForm.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { RequestConfig } from '../types';
import '../styles/MonitoringForm.css';

interface MonitoringFormProps {
  apiUrl: string;
  requestConfig: RequestConfig;
  intervalSeconds: number;
  durationSeconds: number;
  maxValueLatency: number;
  onSubmit: (apiUrl: string, requestConfig: RequestConfig, intervalSeconds: string, durationSeconds: string, maxValueLatency: string, formCurl: string) => void;
}

const MonitoringForm: React.FC<MonitoringFormProps> = ({
  apiUrl: initialApiUrl,
  requestConfig: initialRequestConfig,
  intervalSeconds: initialIntervalSeconds,
  durationSeconds: initialDurationSeconds,
  maxValueLatency: initialMaxValueLatency,
  onSubmit,
}) => {
  const initialCurl = useMemo(() => 
    `curl --location '${initialApiUrl}'` +
    (initialRequestConfig.method !== 'GET' ? ` --request ${initialRequestConfig.method}` : '') +
    Object.entries(initialRequestConfig.headers).map(([key, value]) => ` --header '${key}: ${value}'`).join('') +
    (initialRequestConfig.body ? ` --data '${initialRequestConfig.body}'` : ''), 
    [initialApiUrl, initialRequestConfig]);

  const [formCurl, setFormCurl] = useState<string>(initialCurl);
  const [formIntervalSeconds, setFormIntervalSeconds] = useState<string>(''); // Default to empty
  const [formDurationSeconds, setFormDurationSeconds] = useState<string>(''); // Default to empty
  const [formMaxValueLatency, setFormMaxValueLatency] = useState<string>(initialMaxValueLatency.toString());

  useEffect(() => {
    console.log('Props updated:', { initialApiUrl, initialIntervalSeconds, initialDurationSeconds, initialMaxValueLatency });
    setFormCurl(initialCurl);
    // Do not set interval/duration here to keep them empty by default
    setFormMaxValueLatency(initialMaxValueLatency.toString());
  }, [initialCurl, initialIntervalSeconds, initialDurationSeconds, initialMaxValueLatency]);

  const resetForm = () => {
    setFormCurl('');
    setFormIntervalSeconds('');
    setFormDurationSeconds('');
    setFormMaxValueLatency('');
    console.log('Form reset to empty values');
  };

  const parseCurlCommand = (curl: string): { apiUrl: string; requestConfig: RequestConfig } => {
    const parts = curl.replace(/^curl\s+/, '').match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    let apiUrl = '';
    let method = 'GET';
    const headers: Record<string, string> = {};
    let body = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].replace(/^['"]|['"]$/g, '');
      if ((part === '--location' || part === '-L') && i + 1 < parts.length) {
        apiUrl = parts[++i].replace(/^['"]|['"]$/g, '');
      } else if (!part.startsWith('-') && !apiUrl) {
        apiUrl = part;
      } else if ((part === '--request' || part === '-X') && i + 1 < parts.length) {
        method = parts[++i];
      } else if ((part === '--header' || part === '-H') && i + 1 < parts.length) {
        const header = parts[++i].replace(/^['"]|['"]$/g, '');
        const [key, value] = header.split(/:\s*(.+)/);
        if (key && value) headers[key] = value;
      } else if ((part === '--data' || part === '-d') && i + 1 < parts.length) {
        body = parts[++i].replace(/^['"]|['"]$/g, '');
        while (i + 1 < parts.length && !parts[i + 1].startsWith('-')) {
          body += ' ' + parts[++i].replace(/^['"]|['"]$/g, '');
        }
      }
    }

    if (!apiUrl) throw new Error('No URL found in curl command');
    return { 
      apiUrl, 
      requestConfig: { 
        method, 
        headers: headers['Content-Type'] ? headers : { ...headers, 'Content-Type': 'application/json' }, 
        body: body || undefined 
      } 
    };
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const interval = parseInt(formIntervalSeconds);
    const duration = parseInt(formDurationSeconds);

    console.log('Form submitted with:', { formCurl, formIntervalSeconds, formDurationSeconds, formMaxValueLatency });

    if (!formIntervalSeconds || isNaN(interval)) {
      alert('Error: Please provide a valid interval (1-10 seconds).');
      return;
    }
    if (!formDurationSeconds || isNaN(duration)) {
      alert('Error: Please provide a valid duration (at least the interval length).');
      return;
    }

    try {
      const { apiUrl, requestConfig } = parseCurlCommand(formCurl);
      console.log('Parsed curl:', { apiUrl, requestConfig });
      onSubmit(apiUrl, requestConfig, formIntervalSeconds, formDurationSeconds, formMaxValueLatency || '250', formCurl);
      resetForm();
    } catch (error) {
      alert((error as Error).message);
    }
  };

  return (
    <div className="monitoring-form-container">
      <form id="apiForm" onSubmit={handleSubmit} className="monitoring-form">
        <div className="form-group">
          <label htmlFor="curlInput" className="form-label">Curl Command:</label>
          <textarea
            id="curlInput"
            value={formCurl}
            onChange={(e) => {
              setFormCurl(e.target.value);
              console.log('Curl updated:', e.target.value);
            }}
            placeholder="Paste your curl command here, e.g., curl --location 'https://example.com' --header 'Content-Type: application/json' --data '{}'"
            className="curl-input"
            rows={6}
          />
        </div>
        <div className="form-group">
          <span className="form-display">
            <span className="form-label">Check Interval:</span>
            <input
              type="number"
              id="intervalInput"
              min="1"
              max="10"
              step="1"
              value={formIntervalSeconds}
              onChange={(e) => {
                setFormIntervalSeconds(e.target.value);
                console.log('Interval updated:', e.target.value);
              }}
              title="Monitoring interval in seconds (1-10)"
              className="numeric-input"
              required
            />
            <span className="form-unit">sec</span>
          </span>
        </div>
        <div className="form-group">
          <span className="form-display">
            <span className="form-label">Monitoring Duration:</span>
            <input
              type="number"
              id="durationInput"
              min={formIntervalSeconds || 1}
              step="1"
              value={formDurationSeconds}
              onChange={(e) => {
                setFormDurationSeconds(e.target.value);
                console.log('Duration updated:', e.target.value);
              }}
              title="Monitoring duration in seconds"
              className="numeric-input"
              required
            />
            <span className="form-unit">sec</span>
          </span>
        </div>
        <div className="form-group">
          <span className="form-display">
            <span className="form-label">Max Latency:</span>
            <input
              type="number"
              id="maxValueLatencyInput"
              min="1"
              step="1"
              value={formMaxValueLatency}
              onChange={(e) => {
                setFormMaxValueLatency(e.target.value);
                console.log('Max Latency updated:', e.target.value);
              }}
              title="Maximum latency value in milliseconds (minimum 1)"
              className="numeric-input"
            />
            <span className="form-unit">ms</span>
          </span>
        </div>
        <div className="form-group">
          <button type="submit" id="startButton" className="start-button">Start Monitoring</button>
        </div>
      </form>
    </div>
  );
};

export default MonitoringForm;