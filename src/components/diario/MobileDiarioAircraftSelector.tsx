import React from 'react';
import { ArrowLeft, Plane, ChevronRight, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { LottieAirplaneSpinner } from '@/components/ui/lottie-airplane-spinner';

interface Props { onSelect: (id: string, registration: string) => void; onBack: () => void }
const decimalToHM = (decimal?: number | null): string => {
  if (decimal === null || decimal === undefined || Number.isNaN(decimal)) return '--:--';
  const totalMinutes = Math.round(Math.abs(decimal) * 60);
  return `${decimal < 0 ? '-' : ''}${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}:${(totalMinutes % 60).toString().padStart(2, '0')}`;
};

export const MobileDiarioAircraftSelector: React.FC<Props> = ({ onSelect, onBack }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['diario-aircraft-list', new Date().getFullYear()],
    queryFn: () => apiClient.getDiarioResumo(new Date().getFullYear()),
  });
  const aircraft = data?.aeronaves || [];
  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><LottieAirplaneSpinner size="md" text="Carregando aeronaves..." /></div>;
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50"><div className="flex items-center px-4 h-14">
        <button onClick={onBack} className="flex items-center gap-1 text-primary text-sm font-medium -ml-1 active:opacity-60"><ArrowLeft className="w-5 h-5" /><span>Voltar</span></button>
        <h1 className="flex-1 text-center text-base font-semibold text-foreground">Diário de Bordo</h1><div className="w-16" />
      </div></div>
      <div className="px-5 pt-6 pb-3"><p className="text-sm text-muted-foreground">Selecione a aeronave para novo lançamento</p></div>
      <div className="px-4 space-y-3 pb-8">
        {isError && <p className="text-center py-8 text-destructive text-sm">Não foi possível consultar o Diário de Bordo.</p>}
        {aircraft.map((ac: any) => {
          const disponivel = Number(ac.celula_disponivel_ttotal || 0);
          const hasMonth = Number(ac.mes_referencia || 0) > 0;
          return <button key={ac.id} onClick={() => onSelect(ac.id, ac.matricula_registro)} className="w-full bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-4 active:scale-[0.98] transition-all shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Plane className="w-6 h-6 text-primary" /></div>
            <div className="flex-1 text-left min-w-0"><p className="text-base font-semibold text-foreground">{ac.matricula_registro}</p><p className="text-xs text-muted-foreground truncate">{ac.fabricante} {ac.modelo}</p>
              {hasMonth && <div className="flex items-center gap-3 mt-1.5"><span className="flex items-center gap-1 text-xs text-muted-foreground"><Zap className="w-3 h-3 text-primary" />{decimalToHM(ac.celula_atual_ttotal)}</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><AlertCircle className="w-3 h-3" />Rev: {decimalToHM(ac.celula_prox_revisao_ttotal)}</span><span className={`flex items-center gap-1 text-xs font-medium ${disponivel < 0 ? 'text-destructive' : 'text-primary'}`}><CheckCircle className="w-3 h-3" />{decimalToHM(disponivel)}</span></div>}
            </div><ChevronRight className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
          </button>;
        })}
        {!isError && aircraft.length === 0 && <div className="text-center py-20 text-muted-foreground text-sm">Nenhuma aeronave encontrada</div>}
      </div>
    </div>
  );
};
