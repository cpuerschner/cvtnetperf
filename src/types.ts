// src/types.ts
export interface RequestConfig {
    method: string;
    headers?: { [key: string]: string };
    body?: string;
  }
  
  export interface Heartbeat {
    timestamp: string;
    latency: number;
    bandwidth: number;
    deviceInfo: string;
    deviceName: string;
    error?: string;
  }
  
  export interface Segment {
    max: number;
    color: string;
    label: string;
  }