// API Configuration
export const API_URL = typeof window !== 'undefined' 
  ? (window.location.origin.includes('reservasegura.pro') 
      ? 'https://www.reservasegura.pro' 
      : 'http://localhost:4000')
  : 'https://www.reservasegura.pro';
