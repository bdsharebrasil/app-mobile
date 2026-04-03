import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Component } from "@/types/maintenance";

interface ComponentLifeCardProps {
  component: Component;
}

export function ComponentLifeCard({ component }: ComponentLifeCardProps) {
  const percentage = component.totalLife > 0
    ? Math.round((component.currentLife / component.totalLife) * 100)
    : 0;

  const colorClass = percentage >= 80 ? "bg-destructive" : percentage >= 60 ? "bg-orange-500" : "bg-green-500";

  return (
    <Card className="bg-gradient-card border-border">
      <CardContent className="pt-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-medium text-sm">{component.name}</span>
          <span className="text-xs text-muted-foreground">{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {component.currentLife} / {component.totalLife} horas
        </p>
      </CardContent>
    </Card>
  );
}
