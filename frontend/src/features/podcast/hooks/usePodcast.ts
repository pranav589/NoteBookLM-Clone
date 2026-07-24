import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notebookApi } from "../../../lib/notebook-api";
import type { Podcast } from "../../../lib/notebook-types";

export function usePodcast(notebookId: string | undefined) {
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const queryClient = useQueryClient();

  const generatePodcastMutation = useMutation({
    mutationFn: () => notebookApi.generatePodcast(notebookId!),
    onError: (err: any) => {
      alert(`Podcast Generation failed: ${err.message || err}`);
    },
  });

  return {
    podcast,
    setPodcast,
    generatePodcast: generatePodcastMutation.mutateAsync,
    isGenerating: generatePodcastMutation.isPending,
  };
}
export default usePodcast;
