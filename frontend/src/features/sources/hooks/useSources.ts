import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notebookApi } from "../../../lib/notebook-api";

export function useSources(notebookId: string | undefined) {
  const queryClient = useQueryClient();

  const addSourceMutation = useMutation({
    mutationFn: (formData: FormData) =>
      notebookApi.addSource(notebookId!, formData),
    onSuccess: () => {
      if (notebookId) {
        queryClient.invalidateQueries({ queryKey: ["notebook", notebookId] });
      }
    },
  });

  const removeSourceMutation = useMutation({
    mutationFn: (sourceId: string) =>
      notebookApi.removeSource(notebookId!, sourceId),
    onSuccess: () => {
      if (notebookId) {
        queryClient.invalidateQueries({ queryKey: ["notebook", notebookId] });
      }
    },
  });

  const reindexSourceMutation = useMutation({
    mutationFn: (sourceId: string) =>
      notebookApi.reindexSource(notebookId!, sourceId),
    onMutate: async (sourceId) => {
      if (!notebookId) return;
      await queryClient.cancelQueries({ queryKey: ["notebook", notebookId] });
      const previousNotebookData = queryClient.getQueryData(["notebook", notebookId]);

      if (previousNotebookData) {
        queryClient.setQueryData(["notebook", notebookId], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            sources: old.sources.map((s: any) =>
              s._id === sourceId ? { ...s, status: "indexing", error: undefined } : s
            ),
          };
        });
      }

      return { previousNotebookData };
    },
    onError: (err, sourceId, context: any) => {
      if (notebookId && context?.previousNotebookData) {
        queryClient.setQueryData(["notebook", notebookId], context.previousNotebookData);
      }
      console.error(err);
    },
    onSuccess: () => {
      if (notebookId) {
        queryClient.invalidateQueries({ queryKey: ["notebook", notebookId] });
      }
    },
  });

  return {
    addSource: addSourceMutation.mutateAsync,
    isUploading: addSourceMutation.isPending,
    removeSource: removeSourceMutation.mutateAsync,
    isDeleting: removeSourceMutation.isPending,
    reindexSource: reindexSourceMutation.mutateAsync,
    isReindexing: reindexSourceMutation.isPending,
  };
}
export default useSources;
