import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Edit2, Plane, Fuel, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { LottieAirplaneSpinner } from '@/components/ui/lottie-airplane-spinner';

const RevisaoCoordenador: React.FC = () => {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const isCoordinator = roles.includes('coordenador_de_voo') || roles.includes('admin') || roles.includes('gestor_master') || roles.includes('piloto_chefe');

  // Fetch unconfirmed logbook entries
  const { data: pendingEntries = [], isLoading } = useQuery({
    queryKey: ['pending-logbook-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logbook_entries')
        .select(`
          *,
          aircraft:aircraft_id (registration, model)
        `)
        .or('confirmed.is.null,confirmed.eq.false')
        .order('entry_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch related fuel records
  const { data: fuelRecords = [] } = useQuery({
    queryKey: ['pending-fuel-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('abastecimentos')
        .select('*')
        .order('data', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch creator profiles
  const { data: profiles = {} } = useQuery({
    queryKey: ['entry-creators', pendingEntries.map((e: any) => e.created_by).join(',')],
    queryFn: async () => {
      const ids = [...new Set(pendingEntries.map((e: any) => e.created_by).filter(Boolean))];
      if (!ids.length) return {};
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', ids);
      const map: Record<string, string> = {};
      data?.forEach((p: any) => { map[p.id] = p.full_name; });
      return map;
    },
    enabled: pendingEntries.length > 0,
  });

  const handleConfirm = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('logbook_entries')
        .update({ confirmed: true, confirmed_at: new Date().toISOString(), confirmed_by: user?.id })
        .eq('id', entryId);
      if (error) throw error;
      toast.success('Lançamento confirmado!');
      queryClient.invalidateQueries({ queryKey: ['pending-logbook-entries'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao confirmar');
    }
  };

  const handleStartEdit = (entry: any) => {
    setEditingEntry({ ...entry });
    setExpandedId(entry.id);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    setSaving(true);
    try {
      const { id, aircraft, ...updates } = editingEntry;
      const { error } = await supabase
        .from('logbook_entries')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      toast.success('Lançamento atualizado!');
      setEditingEntry(null);
      queryClient.invalidateQueries({ queryKey: ['pending-logbook-entries'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const updateEditField = (field: string, value: any) => {
    setEditingEntry((prev: any) => prev ? { ...prev, [field]: value } : null);
  };

  if (!isCoordinator) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
          <X className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Acesso Restrito</h2>
          <p className="text-sm text-muted-foreground mt-2">Apenas coordenadores de voo podem acessar esta página.</p>
          <Button onClick={() => navigate('/')} className="mt-6 rounded-xl">Voltar ao Início</Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center px-4 h-14">
            <button onClick={() => navigate('/')} className="flex items-center gap-1 text-primary text-sm font-medium -ml-1 active:opacity-60">
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </button>
            <h1 className="flex-1 text-center text-base font-semibold text-foreground">Revisão de Lançamentos</h1>
            <div className="w-16" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <LottieAirplaneSpinner size="md" text="Carregando pendências..." />
          </div>
        ) : pendingEntries.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-6 text-center">
            <div>
              <Check className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground">Tudo em dia!</h2>
              <p className="text-sm text-muted-foreground mt-2">Nenhum lançamento pendente de revisão.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-8">
            <p className="text-xs text-muted-foreground mb-2">{pendingEntries.length} lançamento(s) pendente(s)</p>
            {pendingEntries.map((entry: any) => {
              const isExpanded = expandedId === entry.id;
              const isEditing = editingEntry?.id === entry.id;
              const creatorName = profiles[entry.created_by] || 'Desconhecido';
              const relatedFuel = fuelRecords.filter((f: any) =>
                f.aeronave_id === entry.aircraft_id &&
                f.data === entry.entry_date &&
                f.trecho === `${entry.departure_aerodrome}-${entry.arrival_aerodrome}`
              );

              return (
                <div key={entry.id} className="bg-card border border-border/60 rounded-2xl overflow-hidden">
                  {/* Summary row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="w-full p-4 flex items-center gap-3 text-left active:bg-muted/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Plane className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {entry.aircraft?.registration || '—'} · {entry.departure_aerodrome}→{entry.arrival_aerodrome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.entry_date), 'dd/MM/yyyy')} · {creatorName} · {entry.flight_nature}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
                      {isEditing ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">Origem</Label>
                              <Input value={editingEntry.departure_aerodrome} onChange={e => updateEditField('departure_aerodrome', e.target.value)} className="mt-1 rounded-xl bg-background text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Destino</Label>
                              <Input value={editingEntry.arrival_aerodrome} onChange={e => updateEditField('arrival_aerodrome', e.target.value)} className="mt-1 rounded-xl bg-background text-sm" />
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {['ac_time', 'dep_time', 'pou_time', 'cor_time'].map(field => (
                              <div key={field}>
                                <Label className="text-[10px] text-muted-foreground uppercase">{field.replace('_time', '').replace('_', ' ').toUpperCase()}</Label>
                                <Input
                                  value={editingEntry[field] ? editingEntry[field].substring(11, 16) : ''}
                                  onChange={e => updateEditField(field, `${editingEntry.entry_date}T${e.target.value}:00`)}
                                  className="mt-1 rounded-xl bg-background text-xs text-center"
                                  placeholder="HH:MM"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Pousos</Label>
                              <Input type="number" value={editingEntry.pousos || ''} onChange={e => updateEditField('pousos', parseInt(e.target.value) || 0)} className="mt-1 rounded-xl bg-background text-center text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">PAX</Label>
                              <Input type="number" value={editingEntry.passengers || ''} onChange={e => updateEditField('passengers', parseInt(e.target.value) || 0)} className="mt-1 rounded-xl bg-background text-center text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Combustível</Label>
                              <Input type="number" value={editingEntry.fuel_added || ''} onChange={e => updateEditField('fuel_added', parseFloat(e.target.value) || 0)} className="mt-1 rounded-xl bg-background text-center text-sm" />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Ocorrências</Label>
                            <Textarea value={editingEntry.occurrences || ''} onChange={e => updateEditField('occurrences', e.target.value)} className="mt-1 rounded-xl bg-background text-sm min-h-[50px] resize-none" />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleSaveEdit} disabled={saving} className="flex-1 rounded-xl h-10 text-sm" size="sm">
                              <Save className="w-4 h-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar'}
                            </Button>
                            <Button variant="outline" onClick={() => setEditingEntry(null)} className="rounded-xl h-10 text-sm" size="sm">
                              Cancelar
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Read-only details */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-muted-foreground">AC:</span> <span className="text-foreground font-medium">{entry.ac_time?.substring(11, 16) || '—'}</span></div>
                            <div><span className="text-muted-foreground">DEP:</span> <span className="text-foreground font-medium">{entry.dep_time?.substring(11, 16) || '—'}</span></div>
                            <div><span className="text-muted-foreground">POU:</span> <span className="text-foreground font-medium">{entry.pou_time?.substring(11, 16) || '—'}</span></div>
                            <div><span className="text-muted-foreground">COR:</span> <span className="text-foreground font-medium">{entry.cor_time?.substring(11, 16) || '—'}</span></div>
                            <div><span className="text-muted-foreground">Tempo Voo:</span> <span className="text-foreground font-medium">{entry.time?.toFixed(2) || '—'}h</span></div>
                            <div><span className="text-muted-foreground">Bloco:</span> <span className="text-foreground font-medium">{entry.total_time?.toFixed(2) || '—'}h</span></div>
                            <div><span className="text-muted-foreground">Pousos:</span> <span className="text-foreground font-medium">{entry.pousos || 0}</span></div>
                            <div><span className="text-muted-foreground">PAX:</span> <span className="text-foreground font-medium">{entry.passengers || 0}</span></div>
                          </div>

                          {entry.occurrences && (
                            <p className="text-xs text-muted-foreground italic">"{entry.occurrences}"</p>
                          )}

                          {/* Related fuel records */}
                          {relatedFuel.length > 0 && (
                            <div className="bg-muted/30 rounded-xl p-3 space-y-1">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                                <Fuel className="w-3.5 h-3.5" /> Abastecimento
                              </div>
                              {relatedFuel.map((f: any) => (
                                <div key={f.id} className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{f.litros}L · {f.local}</span>
                                  <span className="text-foreground font-medium">R$ {f.valor_total?.toFixed(2) || '—'}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2 pt-1">
                            <Button onClick={() => handleStartEdit(entry)} variant="outline" className="flex-1 rounded-xl h-10 text-sm" size="sm">
                              <Edit2 className="w-4 h-4 mr-1" /> Editar
                            </Button>
                            <Button onClick={() => handleConfirm(entry.id)} className="flex-1 rounded-xl h-10 text-sm" size="sm">
                              <Check className="w-4 h-4 mr-1" /> Confirmar
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default RevisaoCoordenador;
