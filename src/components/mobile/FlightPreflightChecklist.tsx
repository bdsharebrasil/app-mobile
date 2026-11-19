import { useQueryClient } from '@tanstack/react-query';
import PreparacaoVoo, { type TransportePreparacao } from '@/components/preparacao/PreparacaoVoo';
import { apiClient } from '@/lib/api-client';
import { supabase } from '@/integrations/supabase/client';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ChecklistRecord } from '@/lib/flight-checklist';
const transporte: TransportePreparacao={
 json:(path,body)=>body===undefined?apiClient.get(path):apiClient.post(path,body),
 arquivo:(path)=>apiClient.getBlob(path),enviar:(path,form)=>apiClient.postMultipart(path,form),
 identidade:async()=>{const{data}=await supabase.auth.getSession();return data.session?.user?.id||null;},
};
export function FlightPreflightChecklist({flight,open,onClose,onSaved}:{flight:{id:string};checklist:ChecklistRecord;editable:boolean;open:boolean;onClose:()=>void;onSaved:()=>void}){
 const client=useQueryClient();
 if(!open)return null;
 return <><DialogHeader><DialogTitle>Preparação do voo</DialogTitle></DialogHeader><PreparacaoVoo vooId={flight.id} api={transporte} escuro abaInicial="resumo" aoSalvar={()=>{void client.invalidateQueries({queryKey:['flight-operations',flight.id]});void client.invalidateQueries({queryKey:['colaborador-meus-voos','preparacao',flight.id]});onSaved();}}/><button type="button" onClick={onClose} className="mt-3 rounded-lg border border-white/20 px-4 py-2 text-sm">Fechar preparação</button></>;
}
