import jsPDF from 'jspdf';

export interface FlightPlanPdfData {
  origin: string;
  originName?: string;
  destination: string;
  destinationName?: string;
  alternate?: string;
  aircraft?: string;
  registration?: string;
  flightRule?: string;
  cruiseAltitude?: string;
  cruiseSpeed?: string;
  departure?: string;
  passengers?: number;
  route?: string;
  calculations: {
    distance: number;
    bearing: number;
    ete: string;
    fuelRequired: number;
    fuelReserve: number;
    totalFuel: number;
    suggestedAlt: string;
    altitudeWarnings?: string[];
  };
  validation?: {
    valid: boolean;
    warnings?: string[];
  } | null;
}

function buildFlightPlanPdf(data: FlightPlanPdfData) {
  const document = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const margin = 16;
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const lineWidth = pageWidth - margin * 2;
  let y = 18;

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - margin) {
      document.addPage();
      y = margin;
    }
  };

  const section = (title: string, rows: Array<[string, string | number | undefined | null]>) => {
    ensureSpace(14);
    document.setFont('helvetica', 'bold');
    document.setFontSize(11);
    document.setTextColor(8, 80, 100);
    document.text(title, margin, y);
    y += 6;
    document.setFont('helvetica', 'normal');
    document.setFontSize(9);
    document.setTextColor(30, 41, 59);

    for (const [label, rawValue] of rows) {
      const value = rawValue == null || rawValue === '' ? '—' : String(rawValue);
      const lines = document.splitTextToSize(`${label}: ${value}`, lineWidth);
      const blockHeight = Math.max(5, lines.length * 4.5);
      ensureSpace(blockHeight + 1);
      document.text(lines, margin, y);
      y += blockHeight + 1;
    }
    y += 3;
  };

  document.setFillColor(10, 23, 41);
  document.rect(0, 0, pageWidth, 34, 'F');
  document.setTextColor(255, 255, 255);
  document.setFont('helvetica', 'bold');
  document.setFontSize(17);
  document.text('SHARE BRASIL · PLANO DE VOO', margin, 17);
  document.setFont('helvetica', 'normal');
  document.setFontSize(9);
  document.text(`${data.origin} → ${data.destination}  |  Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, 25);
  y = 43;

  document.setFont('helvetica', 'bold');
  document.setFontSize(8);
  document.setTextColor(153, 65, 0);
  const notice = document.splitTextToSize(
    'Documento de planejamento e apoio. Confirme todas as informações aeronáuticas nas fontes oficiais; este PDF não é uma submissão de FPL ao AIS/DECEA.',
    lineWidth,
  );
  document.text(notice, margin, y);
  y += notice.length * 4 + 5;

  section('TRECHO E AERONAVE', [
    ['Origem', `${data.origin}${data.originName ? ` · ${data.originName}` : ''}`],
    ['Destino', `${data.destination}${data.destinationName ? ` · ${data.destinationName}` : ''}`],
    ['Alternativa', data.alternate],
    ['Aeronave', data.aircraft],
    ['Matrícula', data.registration],
    ['Regra de voo', data.flightRule],
    ['Passageiros', data.passengers],
    ['Partida', data.departure ? new Date(data.departure).toLocaleString('pt-BR') : undefined],
    ['Rota informada/sugerida', data.route],
  ]);

  section('CÁLCULOS', [
    ['Distância direta estimada', `${data.calculations.distance} NM`],
    ['Proa magnética estimada', `${data.calculations.bearing}°`],
    ['Tempo estimado', data.calculations.ete],
    ['Altitude sugerida', data.calculations.suggestedAlt],
    ['Combustível de viagem', `${data.calculations.fuelRequired} L`],
    ['Reserva', `${data.calculations.fuelReserve} L`],
    ['Combustível total estimado', `${data.calculations.totalFuel} L`],
  ]);

  if (data.validation) {
    section('VALIDAÇÃO OPERACIONAL', [
      ['Resultado', data.validation.valid ? 'Sem alertas bloqueantes retornados' : 'Atenção necessária'],
      ['Alertas', data.validation.warnings?.length ? data.validation.warnings.join(' | ') : 'Nenhum alerta listado'],
    ]);
  }

  if (data.calculations.altitudeWarnings?.length) {
    section('OBSERVAÇÕES DE ALTITUDE', data.calculations.altitudeWarnings.map((warning, index) => [`Alerta ${index + 1}`, warning]));
  }

  document.setFont('helvetica', 'normal');
  document.setFontSize(8);
  document.setTextColor(100, 116, 139);
  document.text('Share Brasil · Plano de voo', margin, pageHeight - 8);

  const routeFile = `${data.origin}-${data.destination}`.replace(/[^A-Z0-9-]/gi, '-').toUpperCase();
  return { document, fileName: `plano-de-voo-${routeFile}.pdf` };
}

export async function exportFlightPlanPdf(data: FlightPlanPdfData): Promise<'shared' | 'downloaded'> {
  const { document, fileName } = buildFlightPlanPdf(data);
  const blob = document.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });
  const shareNavigator = navigator as Navigator & {
    canShare?: (shareData?: ShareData) => boolean;
  };

  if (navigator.share && shareNavigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Plano de voo', text: 'Plano de voo Share Brasil' });
    return 'shared';
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'downloaded';
}
