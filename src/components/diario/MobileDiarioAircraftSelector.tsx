import React from 'react';
import { ArrowLeft, Plane, ChevronRight, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LottieAirplaneSpinner } from '@/components/ui/lottie-airplane-spinner';

interface Props {
  onSelect: (id: string, registration: string) => void;
  onBack: () => void;
}

const decimalToHM = (decimal?: number | null): string => {
  if (decimal === null || decimal === undefined || isNaN(decimal)) return '--:--';
  const isNegative = decimal < 0;
  const absDecimal = Math.abs(decimal);
  const totalMinutes = Math.round(absDecimal * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const sign = isNegative ? '-' : '';
  return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const MobileDiarioAircraftSelector: React.FC<Props> = ({ onSelect, onBack }) => {
  const { data: aircraft = [], isLoading } = useQuery({
    queryKey: ['diario-aircraft-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aircraft')
        .select('id, registration, model, status, image_url')
        .order('registration', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch latest logbook_months for each aircraft
  const { data: monthsMap = {} } = useQuery({
    queryKey: ['diario-logbook-months', aircraft.map(a => a.id).join(',')],
    queryFn: async () => {
      if (!aircraft.length) return {};
      const map: Record<string, any> = {};
      for (const ac of aircraft) {
        const { data } = await supabase
          .from('logbook_months')
          .select('celula_atual, celula_prox_revisao, celula_disponivel')
          .eq('aircraft_id', ac.id)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(1);
        if (data && data.length > 0) map[ac.id] = data[0];
      }
      return map;
    },
    enabled: aircraft.length > 0,
  });

  if (isLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <LottieAirplaneSpinner size="md" text="Carregando aeronaves..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* iOS-style header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center px-4 h-14">
          <button onClick={onBack} className="flex items-center gap-1 text-primary text-sm font-medium -ml-1 active:opacity-60 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </button>
          <h1 className="flex-1 text-center text-base font-semibold text-foreground">Diário de Bordo</h1>
          <div className="w-16" /> {/* Spacer */}
        </div>
      </div>

      {/* Subtitle */}
      <div className="px-5 pt-6 pb-3">
        <p className="text-sm text-muted-foreground">Selecione a aeronave para novo lançamento</p>
      </div>

      {/* Aircraft list */}
      <div className="px-4 space-y-3 pb-8">
        {aircraft.map(ac => {
          const monthData = monthsMap[ac.id];
          const disponivel = monthData?.celula_disponivel ?? null;
          const isLow = disponivel !== null && disponivel < 0;

          return (
            <button
              key={ac.id}
              onClick={() => onSelect(ac.id, ac.registration)}
              className="w-full bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-4 active:scale-[0.98] transition-all duration-150 shadow-sm"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Plane className="w-6 h-6 text-primary" />
              </div>

              {/* Info */}
              <div className="flex-1 text-left min-w-0">
                <p className="text-base font-semibold text-foreground">{ac.registration}</p>
                <p className="text-xs text-muted-foreground truncate">{ac.model}</p>
                
                {monthData && (
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        {decimalToHM(monthData.celula_atual)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-accent-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Rev: {decimalToHM(monthData.celula_prox_revisao)}
                      </span>
                    </div>
                    {disponivel !== null && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className={`w-3 h-3 ${isLow ? 'text-destructive' : 'text-primary'}`} />
                        <span className={`text-xs font-medium ${isLow ? 'text-destructive' : 'text-primary'}`}>
                          {decimalToHM(disponivel)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chevron */}
              <ChevronRight className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
            </button>
          );
        })}

        {aircraft.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-sm">
            Nenhuma aeronave encontrada
          </div>
        )}
      </div>
    </div>
  );
};
