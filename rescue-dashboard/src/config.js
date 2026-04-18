// Central API configuration.
// Override with environment variables for staging / production deployments.
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:5001/api';
export const WS_BASE  = import.meta.env.VITE_WS_BASE  ?? 'http://127.0.0.1:5001';

export const SEVERITY_COLORS = {
  0: '#22c55e', // Low      — Green
  1: '#eab308', // Moderate — Yellow
  2: '#3b82f6', // High     — Blue
  3: '#ef4444', // Critical — Red
};
