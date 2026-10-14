// Cliente centralizado para comunicação autenticada com o Cloudflare Worker/D1.
import { supabase } from '@/integrations/supabase/client';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'https://api-workers.sharebrasil.workers.dev';

interface ApiError {
  error: string;
  details?: any;
}

export interface DiarioAeronaveResumo {
  id: string;
  matricula_registro: string;
  fabricante: string | null;
  modelo: string | null;
  image_url: string | null;
  status: string | null;
  horas_ano: number;
  celula_atual_ttotal: number;
  celula_prox_revisao_ttotal: number;
  celula_disponivel_ttotal: number;
  mes_referencia: number;
  fechado: number;
}

export interface DiarioOpcoesResponse {
  clientes: Array<{ id: string; nome: string; codigo_cliente: string | null; proprietario: string | null }>;
  holdings: Array<{ id: string; nome: string; proprietario: string | null }>;
  socios: Array<{ id: string; nome: string; cotista_id: string | null; holding_id: string | null }>;
  tripulantes: Array<{ id: string; canac: string | null; nome_completo: string; status: string; origem: string }>;
  aerodromos: Array<{ id: string; designativo: string; nome: string; coordenadas: string | null }>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
    const response = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) throw new Error(data?.error || `API Error: ${response.statusText}`);
    return data as T;
  }

  async getBlob(endpoint: string): Promise<Blob> {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = new Headers();
    if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
    const response = await fetch(`${this.baseUrl}${endpoint}`, { headers });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || `API Error: ${response.statusText}`);
    }
    return response.blob();
  }

  async postMultipart<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body: formData });
  }

  async patchMultipart<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body: formData });
  }

  // Métodos HTTP básicos
  async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
    const queryString = params
      ? '?' + new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString()
      : '';
    return this.request<T>(`${endpoint}${queryString}`);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // ========== HEALTH CHECK ==========
  async healthCheck() {
    try {
      const response = await this.get<{ status: string; uptime?: number }>('/api/health');
      return { success: true, data: response };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ========== USERS ==========
  async getUsers() {
    return this.get('/api/users');
  }

  async getUser(id: string) {
    return this.get(`/api/users/${id}`);
  }

  async getUserProfile(id: string) {
    return this.get(`/api/users/${id}/profile`);
  }

  // ========== FLIGHTS ==========
  async getFlights(filters?: { status?: string; date?: string; aircraft_id?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.date) params.append('date', filters.date);
    if (filters?.aircraft_id) params.append('aircraft_id', filters.aircraft_id);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.get(`/api/flights${query}`);
  }

  async getFlight(id: string) {
    return this.get(`/api/flights/${id}`);
  }

  async getActiveFlights() {
    return this.get('/api/flights/active/now');
  }

  // ========== CLIENTS ==========
  async getClients() {
    return this.get('/api/clients');
  }

  async getClient(id: string) {
    return this.get(`/api/clients/${id}`);
  }

  async getClientContracts(id: string) {
    return this.get(`/api/clients/${id}/contracts`);
  }

  // ========== AIRCRAFT ==========
  async getAircraft() {
    return this.get('/api/aircraft');
  }

  async getAircraftDetail(id: string) {
    return this.get(`/api/aircraft/${id}`);
  }

  async getAircraftAvailability(id: string) {
    return this.get(`/api/aircraft/${id}/availability`);
  }

  // ========== AERODROMES ==========
  async getAerodromes() {
    return this.get('/api/aerodromes');
  }

  async getAerodromeDetails() {
    return this.get('/api/aerodromes/details');
  }

  async getAerodrome(icao: string) {
    return this.get(`/api/aerodromes/${icao}`);
  }

  // ========== CATEGORIES ==========
  async getCategories() {
    return this.get('/api/categories');
  }

  async getCategoriesByType() {
    return this.get('/api/categories/unique-by-type');
  }

  // ========== MAINTENANCE ==========
  async createMaintenance(payload: any) {
    return this.post('/api/maintenance', payload);
  }

  async updateMaintenance(id: string, payload: any) {
    return this.put(`/api/maintenance/${id}`, payload);
  }

  // ========== FLIGHT DOCUMENTS ==========
  async createFlightDocument(payload: any) {
    return this.post('/api/flight-documents', payload);
  }

  async getFlightDocuments(flightId: string) {
    return this.get(`/api/flight-documents?flight_id=${flightId}`);
  }

  // ========== WEATHER ==========
  async getWeather(icao: string) {
    return this.get(`/api/weather/${icao.toUpperCase()}`);
  }

  // ========== NOTAM ==========
  async getNotam(icao: string) {
    return this.get(`/api/notam/${icao.toUpperCase()}`);
  }

  // ========== INFOTEMP (ROTAER) ==========
  async getInfoTemp(icao: string) {
    return this.get(`/api/infotemp/${icao.toUpperCase()}`);
  }

  // ========== CHARTS ==========
  async getCharts(icao: string, especie?: string, tipo?: string) {
    const params: Record<string, string> = {};
    if (especie) params.especie = especie;
    if (tipo) params.tipo = tipo;
    return this.get(`/api/charts/${icao.toUpperCase()}`, params);
  }

  // ========== SOLAR ==========
  async getSolar(icao: string, date?: string) {
    const params: Record<string, string> = {};
    if (date) params.date = date;
    return this.get(`/api/solar/${icao.toUpperCase()}`, params);
  }

  // ========== PREFERENTIAL ROUTES ==========
  async getPreferentialRoutes(adep: string, ades: string) {
    return this.get('/api/routes', { adep, ades });
  }

  // ========== WAYPOINTS ==========
  async getWaypoints() {
    return this.get('/api/waypoints');
  }

  // ========== FLIGHT CALCULATIONS ==========
  async calculateFlight(payload: any) {
    return this.post('/api/flight-calculations', payload);
  }

  // ========== CACHE ==========
  async getCacheStats() {
    return this.get('/api/cache/stats');
  }

  async clearCache(pattern?: string) {
    return this.post('/api/cache/clear', { pattern });
  }

  // ========== LOGBOOK ==========
  async getLogbook(filters?: { aircraft_id?: string; month?: number; year?: number }) {
    const params = new URLSearchParams();
    if (filters?.aircraft_id) params.append('aircraft_id', filters.aircraft_id);
    if (filters?.month) params.append('month', filters.month.toString());
    if (filters?.year) params.append('year', filters.year.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.get(`/api/logbook${query}`);
  }

  async getLogbookEntry(id: string) {
    return this.get(`/api/logbook/${id}`);
  }

  async createLogbookEntry(payload: any) {
    return this.post('/api/logbook', payload);
  }

  // ========== DIÁRIO DE BORDO (D1) ==========
  async getDiarioOpcoes() {
    return this.get<DiarioOpcoesResponse>('/api/interno/diario-bordo/opcoes');
  }

  async getDiarioResumo(ano: number) {
    return this.get<{ ano: number; aeronaves: DiarioAeronaveResumo[] }>('/api/interno/diario-bordo/resumo', { ano });
  }

  async getDiarioDetalhes(aeronaveId: string, ano: number, mes: number) {
    return this.get<{ aeronave: any; diario_mes: any | null; lancamentos: any[]; meses_disponiveis: any[] }>('/api/interno/diario-bordo/detalhes', { aeronave_id: aeronaveId, ano, mes });
  }

  async getCTMMaintenanceReports(aeronaveId?: string) {
    return this.get<{ data: any[]; aeronaves: any[] }>('/api/ctm/relatorios-manutencao', aeronaveId ? { aeronave_id: aeronaveId } : undefined);
  }

  async criarLancamentoDiario(payload: Record<string, unknown>) {
    return this.post<Record<string, unknown>>('/api/interno/diario-bordo/lancamentos', payload);
  }

  // ========== CONSOLIDATION ==========
  async consolidateRateio(payload: any) {
    return this.post('/api/consolidacao/consolidar-rateio', payload);
  }

  async consolidateMonthlyHours(payload: any) {
    return this.post('/api/consolidacao/consolidar-horas-mensais', payload);
  }

  async getClientExtract(clientId: string, filters?: { data_inicio?: string; data_fim?: string }) {
    const params = new URLSearchParams();
    if (filters?.data_inicio) params.append('data_inicio', filters.data_inicio);
    if (filters?.data_fim) params.append('data_fim', filters.data_fim);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.get(`/api/consolidacao/extrato-cliente/${clientId}${query}`);
  }

  async getClientMonthlySummary(clientId: string, ano: number, mes: number) {
    return this.get(`/api/consolidacao/resumo-mensal-cliente/${clientId}?ano=${ano}&mes=${mes}`);
  }

  async getAircraftUsageComparison(aircraftId: string, ano: number, mes: number) {
    return this.get(`/api/consolidacao/comparativo-uso/${aircraftId}?ano=${ano}&mes=${mes}`);
  }

  async getClientPendencias(clientId: string) {
    return this.get(`/api/consolidacao/pendencias-cliente/${clientId}`);
  }

  async getClientAnnualAnalysis(clientId: string, ano?: number) {
    const query = ano ? `?ano=${ano}` : '';
    return this.get(`/api/consolidacao/analise-anual/${clientId}${query}`);
  }

  async getReconciliationStatus() {
    return this.get('/api/consolidacao/status-conciliacao');
  }

  async getPendingReimbursements() {
    return this.get('/api/consolidacao/reembolsos-pendentes');
  }

  // ========== FUEL ==========
  async getFuel(filters: { client_id: string; date_start: string; date_end: string; aircraft_id?: string }) {
    const params = new URLSearchParams();
    params.append('client_id', filters.client_id);
    params.append('date_start', filters.date_start);
    params.append('date_end', filters.date_end);
    if (filters.aircraft_id) params.append('aircraft_id', filters.aircraft_id);

    return this.get(`/api/fuel?${params.toString()}`);
  }

  // ========== AIRPORTS ==========
  async getAirport(icao: string) {
    return this.get(`/api/airports/${icao}`);
  }

  async searchAirports(q: string) {
    return this.get(`/api/airports/search?q=${encodeURIComponent(q)}`);
  }

  // ========== FINANCIAL ==========
  // This is a router endpoint - implement specific financial endpoints as needed
  async getFinancial(endpoint: string, params?: Record<string, string>) {
    return this.get(`/api/financial${endpoint}`, params);
  }

  async postFinancial(endpoint: string, data?: any) {
    return this.post(`/api/financial${endpoint}`, data);
  }
}

// Instância única da API
export const apiClient = new ApiClient(API_BASE_URL);

// Helper para tratamento de erros
export function handleApiError(error: any): string {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return 'Erro desconhecido na API';
}
