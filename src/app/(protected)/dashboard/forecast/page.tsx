import type { Metadata } from "next";
import { ForecastContent } from "./forecast-content";

export const metadata: Metadata = { title: "Sales Forecast" };

export default function ForecastPage() {
  return <ForecastContent />;
}
