import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notebookApi } from "../../../lib/notebook-api";
import type { Notebook, NotebookDetails } from "../../../lib/notebook-types";

export function useNotebooks() {
  const queryClient = useQueryClient();

  const useList = () =>
    useQuery<Notebook[]>({
      queryKey: ["notebooks"],
      queryFn: notebookApi.list,
    });

  const useGet = (notebookId: string | null) =>
    useQuery<NotebookDetails>({
      queryKey: ["notebook", notebookId],
      queryFn: () => notebookApi.get(notebookId!),
      enabled: !!notebookId,
    });

  const createMutation = useMutation({
    mutationFn: notebookApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notebookApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });

  return {
    useList,
    useGet,
    createNotebook: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteNotebook: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
export default useNotebooks;
