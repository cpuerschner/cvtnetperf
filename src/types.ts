// src/types.ts
export interface RequestConfig {
    method: string;
    headers: Record<string, string>;
    body?: BodyInit | null | string; // Union type to accommodate both fetch and form parsing
  }