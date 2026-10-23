import { Activity, FilePlus2, FolderOpen, Map, Route, Shield } from 'lucide-react';

type FlightPlanTab =
  | 'formulario-icao'
  | 'planejar'
  | 'resultados'
  | 'notam'
  | 'aerodromos'
  | 'cartas'
  | 'meteorologia'
  | 'planos-salvos'
  | 'salvos';

const tabPaths: Record<FlightPlanTab, string> = {
  'formulario-icao': '/plano-voo/formulario-icao',
  planejar: '/plano-voo/rotas',
  resultados: '/plano-voo/resultados',
  notam: '/plano-voo/notams',
  aerodromos: '/plano-voo/aerodromos',
  cartas: '/plano-voo/cartas',
  meteorologia: '/plano-voo/meteorologia',
  'planos-salvos': '/plano-voo/planos-icao-salvos',
  salvos: '/plano-voo/rotas-salvas',
};

const pathTabs = Object.fromEntries(
  Object.entries(tabPaths).map(([tab, path]) => [path, tab]),
) as Record<string, FlightPlanTab>;

export function flightPlanTabFromPath(pathname: string): FlightPlanTab {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  if (normalizedPath === '/plano-voo') return 'formulario-icao';
  return pathTabs[normalizedPath] ?? 'formulario-icao';
}

export function flightPlanPathForTab(tab: FlightPlanTab): string {
  return tabPaths[tab];
}

const navigationItems: Array<{
  tab: FlightPlanTab;
  label: string;
  icon: typeof FilePlus2;
}> = [
  { tab: 'formulario-icao', label: 'Formulário ICAO', icon: FilePlus2 },
  { tab: 'planejar', label: 'Criar rotas', icon: Route },
  { tab: 'resultados', label: 'Resultados', icon: Activity },
  { tab: 'notam', label: 'NOTAMs', icon: Shield },
  { tab: 'cartas', label: 'Cartas', icon: Map },
  { tab: 'salvos', label: 'Rotas salvas', icon: FolderOpen },
];

export function FlightPlanNavigation({
  activeTab,
  onSelect,
}: {
  activeTab: FlightPlanTab;
  onSelect: (tab: FlightPlanTab) => void;
}) {
  return (
    <nav
      aria-label="Rotas e ferramentas do plano de voo"
      className="rounded-2xl border border-white/10 bg-[#101e33]/90 p-3"
    >
      <p className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-400">
        Planejamento · deslize para ver todas as seções
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {navigationItems.map(({ tab, label, icon: Icon }) => {
          const selected = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              aria-label={label}
              aria-current={selected ? 'page' : undefined}
              aria-pressed={selected}
              onClick={() => onSelect(tab)}
              className={`inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                selected
                  ? 'border-sky-300 bg-sky-400 text-slate-950'
                  : 'border-white/10 bg-[#0a1729] text-slate-300 hover:border-white/25 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export type { FlightPlanTab };
