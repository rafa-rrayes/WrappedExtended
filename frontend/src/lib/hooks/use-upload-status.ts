import useSWR from "swr";
import type { UploadStatus } from "@/types/api";
import { apiClient } from "@/lib/api-client";

export function useUploadStatus(uploadId: string) {
  return useSWR<UploadStatus>(
    uploadId ? `/uploads/${uploadId}/status` : null,
    () => apiClient.getUploadStatus(uploadId),
    {
      refreshInterval: (data) => {
        if (!data) return 2000;
        if (data.status === "completed" || data.status === "failed") return 0;
        return 2000;
      },
    }
  );
}
