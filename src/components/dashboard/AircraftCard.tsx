import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane } from "lucide-react";
import type { Aircraft } from "@/types/maintenance";

interface AircraftCardProps {
  aircraft: Aircraft;
}

export function AircraftCard({ aircraft }: AircraftCardProps) {
  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Plane className="h-5 w-5 text-primary" />
          {aircraft.registration}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p><span className="text-muted-foreground">Modelo:</span> {aircraft.model}</p>
        <p><span className="text-muted-foreground">Fabricante:</span> {aircraft.manufacturer}</p>
        <p><span className="text-muted-foreground">Horas Totais:</span> {aircraft.totalHours}</p>
        <p><span className="text-muted-foreground">Ciclos:</span> {aircraft.totalCycles}</p>
        <p><span className="text-muted-foreground">Status:</span> {aircraft.status}</p>
      </CardContent>
    </Card>
  );
}
