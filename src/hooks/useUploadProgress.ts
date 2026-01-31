import { useState, useEffect, useRef } from 'react';
import type { ProgressStage, ProgressEvent } from '@/types/progress';

interface UseUploadProgressOptions {
  sessionId: string | null;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

interface UseUploadProgressReturn {
  stages: ProgressStage[];
  isConnected: boolean;
  currentStage: ProgressStage | null;
  error: string | null;
}

// Базовый URL без /api (VITE_API_URL уже содержит /api)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function useUploadProgress({ 
  sessionId, 
  onComplete, 
  onError 
}: UseUploadProgressOptions): UseUploadProgressReturn {
  const [stages, setStages] = useState<ProgressStage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Используем ref для callbacks чтобы избежать переподключения SSE при ре-рендере
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  
  // Обновляем refs при изменении callbacks
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  useEffect(() => {
    if (!sessionId) {
      setStages([]);
      setIsConnected(false);
      return;
    }

    // URL: API_BASE_URL уже содержит /api, добавляем только /upload/progress/
    const url = `${API_BASE_URL}/upload/progress/${sessionId}`;
    console.log('[useUploadProgress] Connecting to:', url);
    
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('[useUploadProgress] Connected');
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: ProgressEvent = JSON.parse(event.data);
        console.log('[useUploadProgress] Event:', data.type, data);

        switch (data.type) {
          case 'connected':
            // Соединение установлено, ждём init или stage events
            console.log('[useUploadProgress] SSE connected, waiting for events...');
            setIsConnected(true);
            break;

          case 'init':
            if (data.stages) {
              setStages(data.stages);
            }
            break;

          case 'stage':
            if (data.stage) {
              setStages(prev => {
                // Если stages пустой, создаём массив с этим stage
                if (prev.length === 0) {
                  return [data.stage!];
                }
                // Обновляем существующий stage или добавляем новый
                const exists = prev.some(s => s.code === data.stage!.code);
                if (exists) {
                  return prev.map(s => s.code === data.stage!.code ? data.stage! : s);
                } else {
                  return [...prev, data.stage!];
                }
              });
            }
            break;

          case 'complete':
            if (data.stages) {
              setStages(data.stages);
            }
            onCompleteRef.current?.();
            eventSource.close();
            setIsConnected(false);
            break;

          case 'error':
            setError(data.error || 'Unknown error');
            onErrorRef.current?.(data.error || 'Unknown error');
            break;
        }
      } catch (e) {
        console.error('[useUploadProgress] Parse error:', e);
      }
    };

    eventSource.onerror = (e) => {
      console.error('[useUploadProgress] Connection error:', e);
      setIsConnected(false);
      // EventSource автоматически пытается переподключиться
    };

    return () => {
      console.log('[useUploadProgress] Closing connection');
      eventSource.close();
      setIsConnected(false);
    };
  }, [sessionId]); // Только sessionId в зависимостях - callbacks через refs

  // Найти текущую активную стадию
  const currentStage = stages.find(s => s.status === 'in_progress') || null;

  return { stages, isConnected, currentStage, error };
}
