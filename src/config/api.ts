/**
 * Configuração centralizada de endpoints da API
 * Suporta múltiplos backends via VITE_BACKEND_URL
 */

const getBackendUrl = (): string => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  // Fallback para desenvolvimento
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }
  // Produção
  return 'https://api-workers.sharebrasil.workers.dev';
};

const BACKEND_URL = getBackendUrl();

/**
 * Mapa de endpoints da API
 * Cada função retorna a URL completa do endpoint
 */
export const API_ENDPOINTS = {
  // Weather endpoints
  weather: (icao: string) => `${BACKEND_URL}/api/weather/${icao.toUpperCase()}`,
  metar: (icao: string) => `${BACKEND_URL}/api/metar/${icao.toUpperCase()}`,
  taf: (icao: string) => `${BACKEND_URL}/api/taf/${icao.toUpperCase()}`,

  // Charts endpoints
  charts: (icao: string) => `${BACKEND_URL}/api/charts/${icao.toUpperCase()}`,

  // Airport endpoints
  airport: (icao: string) => `${BACKEND_URL}/api/airports/${icao.toUpperCase()}`,
  airports: () => `${BACKEND_URL}/api/airports`,
  airportsSearch: (query: string) => `${BACKEND_URL}/api/airports/search?q=${encodeURIComponent(query)}`,

  // Solar data endpoints
  solar: (lat: number, lon: number, date?: string) => {
    const dateParam = date ? `&date=${date}` : '';
    return `${BACKEND_URL}/api/solar?lat=${lat}&lon=${lon}${dateParam}`;
  },

  // Other endpoints
  health: () => `${BACKEND_URL}/api/health`,
};

export const BACKEND = BACKEND_URL;
