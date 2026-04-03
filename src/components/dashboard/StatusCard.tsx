import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatusCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  status: "expired" | "urgent" | "attention" | "ok";
}

const statusColors: Record<string, string> = {
  expired: "text-destructive",
  urgent: "text-orange-500",
  attention: "text-yellow-500",
  ok: "text-green-500",
};

export function StatusCard({ title, value, icon: Icon, status }: StatusCardProps) {
  return (
    <Card className="bg-gradient-card border-border">
      <CardContent className="pt-4 flex flex-col items-center gap-2">
        <Icon className={`h-8 w-8 ${statusColors[status]}`} />
        <span className={`text-2xl font-bold ${statusColors[status]}`}>{value}</span>
        <span className="text-sm text-muted-foreground">{title}</span>
      </CardContent>
    </Card>
  );
}
