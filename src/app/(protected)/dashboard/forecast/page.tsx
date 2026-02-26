import type { Metadata } from "next";
import { ForecastContent } from "./forecast-content";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = { title: "Sales Forecast" };

export default function ForecastPage() {
  return (
    <ErrorBoundary>
      <ForecastContent />
    </ErrorBoundary>
  );
}
