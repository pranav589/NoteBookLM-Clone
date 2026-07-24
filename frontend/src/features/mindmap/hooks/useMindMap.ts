import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { notebookApi } from "../../../lib/notebook-api";
import type { MindMap } from "../../../lib/notebook-types";

export function useMindMap(notebookId: string | undefined) {
  const [mindMap, setMindMap] = useState<MindMap | null>(null);

  const generateMindMapMutation = useMutation({
    mutationFn: () => notebookApi.generateMindMap(notebookId!),
    onError: (err: any) => {
      alert(`Mind Map Generation failed: ${err.message || err}`);
    },
  });

  return {
    mindMap,
    setMindMap,
    generateMindMap: generateMindMapMutation.mutateAsync,
    isGenerating: generateMindMapMutation.isPending,
  };
}

export default useMindMap;
