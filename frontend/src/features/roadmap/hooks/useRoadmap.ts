import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notebookApi } from "../../../lib/notebook-api";
import type { Roadmap } from "../../../lib/notebook-types";

export function useRoadmap(notebookId: string | undefined) {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const queryClient = useQueryClient();

  const generateRoadmapMutation = useMutation({
    mutationFn: () => notebookApi.generateRoadmap(notebookId!),
    onError: (err: any) => {
      alert(`Roadmap Generation failed: ${err.message || err}`);
    },
  });

  return {
    roadmap,
    setRoadmap,
    generateRoadmap: generateRoadmapMutation.mutateAsync,
    isGenerating: generateRoadmapMutation.isPending,
  };
}
export default useRoadmap;
