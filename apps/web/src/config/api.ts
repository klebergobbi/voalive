// API Configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || (
  typeof window !== 'undefined'
    ? (window.location.origin.includes('reservasegura.pro')
        ? 'https://www.reservasegura.pro'
        : window.location.origin.includes('159.89.80.179')
          ? 'http://159.89.80.179:3012'
          : 'http://localhost:4000')
    : 'http://localhost:4000'
);
