// src/components/MonitoringForm.tsx
import React, { useState } from 'react';
import '../styles/MonitoringForm.css';

// Define props interface
interface MonitoringFormProps {
  apiUrl: string;
  intervalSeconds: number;
  durationSeconds: number;
  maxValueLatency: number;
  onSubmit: (apiUrl: string, intervalSeconds: string, durationSeconds: string, maxValueLatency: string) => void;
}

const MonitoringForm: React.FC<MonitoringFormProps> = ({
  apiUrl,
  intervalSeconds,
  durationSeconds,
  maxValueLatency,
  onSubmit,
}) => {
  const [formApiUrl, setFormApiUrl] = useState<string>(apiUrl);
  const [formIntervalSeconds, setFormIntervalSeconds] = useState<string>(intervalSeconds.toString());
  const [formDurationSeconds, setFormDurationSeconds] = useState<string>(durationSeconds.toString());
  const [formMaxValueLatency, setFormMaxValueLatency] = useState<string>(maxValueLatency.toString());

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Submitting form with:', {
      apiUrl: formApiUrl,
      intervalSeconds: formIntervalSeconds,
      durationSeconds: formDurationSeconds,
      maxValueLatency: formMaxValueLatency,
    });
    onSubmit(formApiUrl, formIntervalSeconds, formDurationSeconds, formMaxValueLatency);
  };

  return (
    <form id="apiForm" onSubmit={handleSubmit} className="monitoring-form">
      <div className="form-group">
        <label htmlFor="apiUrl" className="form-label">API URL:</label>
        <input
          type="text"
          id="apiUrl"
          placeholder="Enter API URL (e.g., https://jsonplaceholder.typicode.com/posts/1)"
          value={formApiUrl}
          onChange={(e) => setFormApiUrl(e.target.value)}
          className="url-input"
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