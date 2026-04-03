import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MaintenanceItem } from "@/types/maintenance";

interface MaintenanceListProps {
  items: MaintenanceItem[];
}

const statusLabels: Record<string, string> = {
  expired: "Vencida",
  urgent: "Urgente",
  attention: "Atenção",
  ok: "Em Dia",
};

const statusVariants: Record<string, "destructive" | "secondary" | "default" | "outline"> = {
  expired: "destructive",
  urgent: "destructive",
  attention: "secondary",
  ok: "default",
};

export function MaintenanceList({ items }: MaintenanceListProps) {
  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="text-xl">Inspeções Próximas</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma inspeção cadastrada</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="font-medium text-sm">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{item.interval}</p>
                </div>
                <Badge variant={statusVariants[item.status] || "default"}>
                  {statusLabels[item.status] || item.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
