import { useQuery } from "@tanstack/react-query";
import { notebookApi } from "../lib/notebook-api";
import type { QueryJobStatus } from "../lib/notebook-types";

export function useJobPoller(jobId: string | null) {
  return useQuery<QueryJobStatus>({
    queryKey: ["job", jobId],
    queryFn: () => notebookApi.getJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      const status = data?.status;
      return status === "completed" || status === "failed" ? false : 2000;
    },
  });
}
export default useJobPoller;
