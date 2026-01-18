import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  uploadFile,
  getUploadStatus,
  getUploadSheets,
  rollbackUpload,
  getUploadHistory,
  type UploadResponse,
  type UploadStatus,
  type UploadSheets,
  type UploadHistoryResponse,
} from "@/lib/api";

interface UseFileUploadOptions {
  targetTable?: string;
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Хук для управления загрузкой файлов
 */
export function useFileUpload(options: UseFileUploadOptions = {}) {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      targetTable,
      sheetName,
    }: {
      file: File;
      targetTable: string;
      sheetName?: string;
    }) => {
      setUploadProgress(0);
      const response = await uploadFile(file, targetTable, sheetName);
      setUploadProgress(100);
      return response;
    },
    onSuccess: (data) => {
      // Инвалидируем историю загрузок после успешной загрузки
      queryClient.invalidateQueries({ queryKey: ["uploads"] });
      options.onSuccess?.(data);
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      options.onError?.(error);
    },
  });

  const upload = useCallback(
    async (file: File, sheetName?: string) => {
      const targetTable = options.targetTable || "balance";
      return uploadMutation.mutateAsync({ file, targetTable, sheetName });
    },
    [uploadMutation, options.targetTable]
  );

  return {
    upload,
    isLoading: uploadMutation.isPending,
    progress: uploadProgress,
    error: uploadMutation.error,
    data: uploadMutation.data,
    isSuccess: uploadMutation.isSuccess,
    reset: uploadMutation.reset,
  };
}

/**
 * Хук для получения статуса загрузки
 */
export function useUploadStatus(uploadId: number | null, enabled = true) {
  return useQuery({
    queryKey: ["upload", uploadId],
    queryFn: () => getUploadStatus(uploadId!),
    enabled: enabled && uploadId !== null,
    refetchInterval: (query) => {
      const data = query.state.data as UploadStatus | undefined;
      // Обновляем статус каждые 2 секунды, если загрузка еще в процессе
      if (data?.status === "processing" || data?.status === "pending") {
        return 2000;
      }
      return false;
    },
  });
}

/**
 * Хук для получения списка листов XLSX файла
 */
export function useUploadSheets(uploadId: number | null, enabled = true) {
  return useQuery({
    queryKey: ["upload", uploadId, "sheets"],
    queryFn: () => getUploadSheets(uploadId!),
    enabled: enabled && uploadId !== null,
  });
}

/**
 * Хук для отката загрузки
 */
export function useRollbackUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uploadId, rolledBackBy }: { uploadId: number; rolledBackBy?: string }) => {
      return rollbackUpload(uploadId, rolledBackBy);
    },
    onSuccess: () => {
      // Инвалидируем историю и статус после отката
      queryClient.invalidateQueries({ queryKey: ["uploads"] });
      queryClient.invalidateQueries({ queryKey: ["upload"] });
    },
  });
}

/**
 * Хук для получения истории загрузок
 */
export function useUploadHistory(params?: {
  targetTable?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["uploads", params],
    queryFn: () => getUploadHistory(params),
  });
}
