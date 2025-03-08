// src/components/MonitoringForm.tsx
import React, { useState, useEffect } from 'react';
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
  const [formCurl, setFormCurl] = useState<string>('');
  const [formIntervalSeconds, setFormIntervalSeconds] = useState<string>(initialIntervalSeconds.toString());
  const [formDurationSeconds, setFormDurationSeconds] = useState<string>(initialDurationSeconds.toString());
  const [formMaxValueLatency, setFormMaxValueLatency] = useState<string>(initialMaxValueLatency.toString());

  useEffect(() => {
    console.log('Props updated:', { initialApiUrl, initialIntervalSeconds, initialDurationSeconds, initialMaxValueLatency });
    setFormCurl(generateCurlCommand(initialApiUrl, initialRequestConfig));
    setFormIntervalSeconds(initialIntervalSeconds.toString());
    setFormDurationSeconds(initialDurationSeconds.toString());
    setFormMaxValueLatency(initialMaxValueLatency.toString());
  }, [initialApiUrl, initialRequestConfig, initialIntervalSeconds, initialDurationSeconds, initialMaxValueLatency]);

  const resetForm = () => {
    setFormCurl('');
    setFormIntervalSeconds('');
    setFormDurationSeconds('');
    setFormMaxValueLatency('');
    console.log('Form reset to empty values');
  };

  const generateCurlCommand = (apiUrl: string, requestConfig: RequestConfig): string => {
    let curl = `curl --location '${apiUrl}'`;
    if (requestConfig.method !== 'GET') {
      curl += ` --request ${requestConfig.method}`;
    }
    const headers = requestConfig.headers || {};
    Object.entries(headers).forEach(([key, value]) => {
      curl += ` --header '${key}: ${value}'`;
    });
    if (requestConfig.body) {
      curl += ` --data '${requestConfig.body}'`;
    }
    return curl;
  };

  const parseCurlCommand = (curl: string): { apiUrl: string; requestConfig: RequestConfig } => {
    const parts = curl.split(' ');
    let apiUrl = '';
    const requestConfig: RequestConfig = { method: 'GET' };
    let i = 0;

    while (i < parts.length) {
      if (parts[i] === '--location' && i + 1 < parts.length) {
        apiUrl = parts[i + 1].replace(/^'|'$/g, '');
        i += 2;
      } else if (parts[i] === '--request' && i + 1 < parts.length) {
        requestConfig.method = parts[i + 1];
        i += 2;
      } else if (parts[i] === '--header' && i + 1 < parts.length) {
        const header = parts[i + 1].replace(/^'|'$/g, '');
        const [key, value] = header.split(':').map(part => part.trim());
        if (key && value) {
          requestConfig.headers = requestConfig.headers || {};
          requestConfig.headers[key] = value;
        }
        i += 2;
      } else if (parts[i] === '--data' && i + 1 < parts.length) {
        requestConfig.body = parts[i + 1].replace(/^'|'$/g, '');
        i += 2;
      } else {
        i++;
      }
    }

    console.log('Parsed curl:', { apiUrl, requestConfig });
    return { apiUrl, requestConfig };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with:', { formCurl, formIntervalSeconds, formDurationSeconds, formMaxValueLatency });

    const { apiUrl, requestConfig } = parseCurlCommand(formCurl);
    onSubmit(apiUrl, requestConfig, formIntervalSeconds, formDurationSeconds, formMaxValueLatency, formCurl);
    resetForm();
  };

  return (
    <form onSubmit={handleSubmit} className="monitoring-form">
      <label>
        cURL Command:
        <textarea
          value={formCurl}
          onChange={(e) => setFormCurl(e.target.value)}
          placeholder="Enter cURL command"
          required
        />
      </label>
      <label>
        Interval (seconds):
        <input
          type="number"
          value={formIntervalSeconds}
          onChange={(e) => setFormIntervalSeconds(e.target.value)}
          min="1"
          max="10"
          required
        />
      </label>
      <label>
        Duration (seconds):
        <input
          type="number"
          value={formDurationSeconds}
          onChange={(e) => setFormDurationSeconds(e.target.value)}
          min={parseInt(formIntervalSeconds) || 1}
          required
        />
      </label>
      <label>
        Max Latency Value (ms):
        <input
          type="number"
          value={formMaxValueLatency}
          onChange={(e) => setFormMaxValueLatency(e.target.value)}
          min="1"
          max="1000"
          required
        />
      </label>
      <div className="button-container">
        <button type="submit" className="start-button">Start Monitoring</button>
      </div>
    </form>
  );
};

export default MonitoringForm;