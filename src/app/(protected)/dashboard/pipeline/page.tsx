import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/error-boundary";

const PipelineContent = dynamic(() => import("./pipeline-content").then(m => m.PipelineContent));

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelinePage() {
  return (
    <ErrorBoundary>
      <PipelineContent />
    </ErrorBoundary>
  );
}
