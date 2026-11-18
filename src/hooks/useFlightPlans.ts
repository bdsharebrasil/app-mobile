import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
export interface FlightPlan {
  id: string; flight_date: string; departure_airport: string; arrival_airport: string; aircraft_id: string | null;
  pilot_in_command: string; alternate_airport: string | null; cruise_altitude: string | null; estimated_time: string | null;
  fuel_endurance: string | null; route: string | null; remarks: string | null; status: 'draft' | 'filed' | 'approved' | 'completed' | 'cancelled';
  created_by: string | null; created_at: string; updated_at: string; flight_schedule_id: string | null;
  calculations?: any; validation?: any; weather?: any;
}
export interface CreateFlightPlanInput {
  flight_date: string; departure_airport: string; arrival_airport: string; aircraft_id?: string; pilot_in_command: string;
  alternate_airport?: string; cruise_altitude?: string; estimated_time?: string; fuel_endurance?: string; route?: string; remarks?: string;
  status?: 'draft' | 'filed' | 'approved' | 'completed' | 'cancelled'; calculations?: any; validation?: any; weather?: any;
}
type WorkerPlan = { id: string; created_at?: string; payload?: Record<string, any>; adep?: string; ades?: string; data_voo?: string | null; eobt?: string | null };
function fromWorker(plan: WorkerPlan): FlightPlan {
  const p = plan.payload || {};
  return { id: plan.id, flight_date: p.flight_date || plan.data_voo || '', departure_airport: p.departure_airport || plan.adep || '',
    arrival_airport: p.arrival_airport || plan.ades || '', aircraft_id: p.aircraft_id || null, pilot_in_command: p.pilot_in_command || p.form?.piloto || '',
    alternate_airport: p.alternate_airport || null, cruise_altitude: p.cruise_altitude || null, estimated_time: p.estimated_time || null,
    fuel_endurance: p.fuel_endurance || null, route: p.route || p.form?.rota || null, remarks: p.remarks || p.form?.observacoes || null,
    status: p.status || 'draft', created_by: p.created_by || null, created_at: plan.created_at || p.created_at || '', updated_at: p.updated_at || plan.created_at || '',
    flight_schedule_id: p.flight_schedule_id || null, calculations: p.calculations || null, validation: p.validation || null, weather: p.weather || null };
}
export function useFlightPlans() {
  const { user } = useAuth();
  const [flightPlans, setFlightPlans] = useState<FlightPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchFlightPlans = useCallback(async () => {
    if (!user) { setFlightPlans([]); return; }
    setLoading(true); setError(null);
    try {
      const rows = await apiClient.get<WorkerPlan[]>('/api/interno/planos-voo', { mine: 'true' });
      setFlightPlans((rows || []).filter((row) => row.payload?.created_by === user.id).map(fromWorker));
    } catch (err) { const message = err instanceof Error ? err.message : 'Erro ao buscar planos de voo'; setError(message); console.error(message); }
    finally { setLoading(false); }
  }, [user]);
  const createFlightPlan = useCallback(async (input: CreateFlightPlanInput): Promise<FlightPlan | null> => {
    if (!user) { toast.error('Usuário não autenticado'); return null; }
    setLoading(true); setError(null);
    try {
      const payload = { ...input, created_by: user.id, created_at: new Date().toISOString() };
      const result = await apiClient.post<{ id: string; created_at: string }>('/api/interno/planos-voo', {
        ...payload, adep: input.departure_airport, ades: input.arrival_airport, data_voo: input.flight_date || null,
        flightplan: { adep: input.departure_airport, ades: input.arrival_airport },
      });
      toast.success('Plano de voo salvo com sucesso!'); await fetchFlightPlans();
      return fromWorker({ ...result, adep: input.departure_airport, ades: input.arrival_airport, data_voo: input.flight_date, payload });
    } catch (err) { const message = err instanceof Error ? err.message : 'Erro ao criar plano de voo'; setError(message); toast.error(message); return null; }
    finally { setLoading(false); }
  }, [user, fetchFlightPlans]);
  const deleteFlightPlan = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true); setError(null);
    try { await apiClient.delete(`/api/interno/planos-voo/${encodeURIComponent(id)}`); toast.success('Plano de voo excluído!'); await fetchFlightPlans(); return true; }
    catch (err) { const message = err instanceof Error ? err.message : 'Erro ao excluir plano de voo'; setError(message); toast.error(message); return false; }
    finally { setLoading(false); }
  }, [fetchFlightPlans]);
  return { flightPlans, loading, error, createFlightPlan, deleteFlightPlan, refreshFlightPlans: fetchFlightPlans };
}
