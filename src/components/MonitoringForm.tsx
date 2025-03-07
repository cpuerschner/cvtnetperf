// src/components/MonitoringForm.tsx
import React, { useState } from 'react';
import '../styles/MonitoringForm.css';

interface RequestConfig {
  method: string;
  headers: Record<string, string>;
  body?: string;
}

interface MonitoringFormProps {
  apiUrl: string;
  requestConfig: RequestConfig;
  intervalSeconds: number;
  durationSeconds: number;
  maxValueLatency: number;
  onSubmit: (
    apiUrl: string,
    requestConfig: RequestConfig,
    intervalSeconds: string,
    durationSeconds: string,
    maxValueLatency: string
  ) => void;
}

const MonitoringForm: React.FC<MonitoringFormProps> = ({
  apiUrl: initialApiUrl,
  requestConfig: initialRequestConfig,
  intervalSeconds: initialIntervalSeconds,
  durationSeconds: initialDurationSeconds,
  maxValueLatency: initialMaxValueLatency,
  onSubmit,
}) => {
  const [formCurl, setFormCurl] = useState<string>(
    `curl --location '${initialApiUrl}'` +
    (initialRequestConfig.method !== 'GET' ? ` --request ${initialRequestConfig.method}` : '') +
    Object.entries(initialRequestConfig.headers).map(([key, value]) => ` --header '${key}: ${value}'`).join('') +
    (initialRequestConfig.body ? ` --data '${initialRequestConfig.body}'` : '')
  );
  const [formIntervalSeconds, setFormIntervalSeconds] = useState<string>(initialIntervalSeconds.toString());
  const [formDurationSeconds, setFormDurationSeconds] = useState<string>(initialDurationSeconds.toString());
  const [formMaxValueLatency, setFormMaxValueLatency] = useState<string>(initialMaxValueLatency.toString());

  const parseCurlCommand = (curl: string): { apiUrl: string; requestConfig: RequestConfig } => {
    try {
      // Remove 'curl' and split into parts
      const parts = curl.replace(/^curl\s+/, '').split(/\s+/);

      let apiUrl = '';
      let method = 'GET';
      const headers: Record<string, string> = {};
      let body = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        // URL (assumes it's quoted or unquoted after --location or first arg)
        if ((part === '--location' || part === '-L') && i + 1 < parts.length) {
          apiUrl = parts[++i].replace(/^['"]|['"]$/g, '');
        } else if (!part.startsWith('-') && !apiUrl && i === 0) {
          apiUrl = part.replace(/^['"]|['"]$/g, '');
        }

        // Method
        if ((part === '--request' || part === '-X') && i + 1 < parts.length) {
          method = parts[++i];
        }

        // Headers
        if ((part === '--header' || part === '-H') && i + 1 < parts.length) {
          const header = parts[++i].replace(/^['"]|['"]$/g, '');
          const [key, value] = header.split(/:\s*(.+)/);
          if (key && value) headers[key] = value;
        }

        // Body
        if ((part === '--data' || part === '-d') && i + 1 < parts.length) {
          body = parts[++i].replace(/^['"]|['"]$/g, '');
          // Handle multi-line body by collecting until next flag
          while (i + 1 < parts.length && !parts[i + 1].startsWith('-')) {
            body += ' ' + parts[++i];
          }
        }
      }

      if (!apiUrl) throw new Error('No URL found in curl command');

      const requestConfig: RequestConfig = {
        method,
        headers: headers['Content-Type'] ? headers : { ...headers, 'Content-Type': 'application/json' },
        body: body || undefined,
      };

      return { apiUrl, requestConfig };
    } catch (error) {
      throw new Error(`Invalid curl command: ${(error as Error).message}`);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const { apiUrl, requestConfig } = parseCurlCommand(formCurl);
      console.log('Parsed curl:', { apiUrl, requestConfig });
      onSubmit(apiUrl, requestConfig, formIntervalSeconds, formDurationSeconds, formMaxValueLatency);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <form id="apiForm" onSubmit={handleSubmit} className="monitoring-form">
      <div className="form-group">
        <label htmlFor="curlInput" className="form-label">Curl Command:</label>
        <textarea
          id="curlInput"
          value={formCurl}
          onChange={(e) => setFormCurl(e.target.value)}
          placeholder="Paste your curl command here, e.g., curl --location 'https://example.com' --header 'Content-Type: application/json' --data '{}'"
          className="curl-input"
          rows={6}
        />
      </div>
      <div className="form-group">
        <label htmlFor="intervalInput" className="form-label">Check Interval (seconds):</label>
        <input
          type="number"
          id="intervalInput"
          min="1"
          max="10"
          step="1"
          value={formIntervalSeconds}
          onChange={(e) => setFormIntervalSeconds(e.target.value)}
          title="Monitoring interval in seconds (1-10)"
          className="numeric-input"
        />
      </div>
      <div className="form-group">
        <label htmlFor="durationInput" className="form-label">Monitoring Duration (seconds):</label>
        <input
          type="number"
          id="durationInput"
          min={formIntervalSeconds}
          step="1"
          value={formDurationSeconds}
          onChange={(e) => setFormDurationSeconds(e.target.value)}
          title="Monitoring duration in seconds"
          className="numeric-input"
        />
      </div>
      <div className="form-group">
        <label htmlFor="maxValueLatencyInput" className="form-label">Latency Max Value (ms):</label>
        <input
          type="number"
          id="maxValueLatencyInput"
          min="1"
          step="1"
          value={formMaxValueLatency}
          onChange={(e) => setFormMaxValueLatency(e.target.value)}
          title="Maximum latency value in milliseconds (minimum 1)"
          className="numeric-input"
        />
      </div>
      <div className="form-group">
        <button type="submit" id="startButton" className="start-button">
          Start Monitoring
        </button>
      </div>
    </form>
  );
};

export default MonitoringForm;