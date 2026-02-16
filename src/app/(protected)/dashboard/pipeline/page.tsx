import type { Metadata } from "next";
import { PipelineContent } from "./pipeline-content";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelinePage() {
  return (
    <ErrorBoundary>
      <PipelineContent />
    </ErrorBoundary>
  );
}
