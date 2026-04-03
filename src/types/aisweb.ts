export interface RouteValidation {
  routeStatus: "clear" | "caution" | "warning" | "danger";
  notams: NOTAMData[];
  warnings: string[];
}

export interface NOTAMData {
  id: string;
  location: string;
  text: string;
  effectiveFrom: string;
  effectiveTo: string;
  type: string;
}
