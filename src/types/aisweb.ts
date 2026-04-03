export interface RouteValidation {
  routeStatus: "clear" | "caution" | "warning" | "danger";
  notams: NOTAMData[];
  warnings: string[];
}

export interface NOTAMData {
  id: string;
  location: string;
  icao: string;
  text: string;
  message: string;
  effectiveFrom: string;
  effectiveTo: string;
  type: string;
  priority: "critical" | "high" | "medium" | "low";
}
