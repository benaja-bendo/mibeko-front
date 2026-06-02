/**
 * usePythonStream.ts — Hook React pour écouter le flux SSE du backend Python.
 * Se connecte automatiquement et gère la reconnexion.
 */
import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { openPythonStream } from '@/features/ingestion/api/pythonApi';

export interface StreamNotification {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UsePythonStreamOptions {
  /** Appelé quand une notification arrivé depuis le backend Python. */
  onNotification?: (n: StreamNotification) => void;
  /** Clés React Query à invalider automatiquement lors d'une mise à jour. */
  invalidateKeys?: string[][];
  /** Activer/désactiver le stream. */
  enabled?: boolean;
}

export function usePythonStream({
  onNotification,
  invalidateKeys = [['python-documents'], ['python-stats']],
  enabled = true,
}: UsePythonStreamOptions = {}) {
  const queryClient = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleUpdate = useCallback(() => {
    for (const key of invalidateKeys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  }, [queryClient, invalidateKeys]);

  const handleNotification = useCallback(
    (payload: StreamNotification) => {
      onNotification?.(payload);
    },
    [onNotification]
  );

  useEffect(() => {
    if (!enabled) return;

    cleanupRef.current = openPythonStream(handleUpdate, handleNotification);

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [enabled, handleUpdate, handleNotification]);
}
