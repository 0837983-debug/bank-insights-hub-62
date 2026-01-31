import { CheckCircle, Circle, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProgressStage } from '@/types/progress';

interface UploadStagesProgressProps {
  stages: ProgressStage[];
  className?: string;
}

export function UploadStagesProgress({ stages, className }: UploadStagesProgressProps) {
  if (!stages || stages.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)} data-testid="upload-stages-progress">
      {stages.map((stage) => (
        <div 
          key={stage.code} 
          className="flex items-center gap-3"
          data-testid={`upload-stage-${stage.code}`}
        >
          {/* Иконка статуса */}
          {stage.status === 'completed' && (
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          )}
          {stage.status === 'in_progress' && (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin flex-shrink-0" />
          )}
          {stage.status === 'pending' && (
            <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
          )}
          {stage.status === 'failed' && (
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          )}

          {/* Название и детали */}
          <div className="flex-1 min-w-0">
            <div className={cn(
              'text-sm font-medium',
              stage.status === 'completed' && 'text-green-700',
              stage.status === 'in_progress' && 'text-blue-700',
              stage.status === 'pending' && 'text-gray-500',
              stage.status === 'failed' && 'text-red-700'
            )}>
              {stage.name}
              {stage.rowsProcessed !== undefined && (
                <span className="font-normal text-gray-500 ml-1">
                  ({stage.rowsProcessed} строк)
                </span>
              )}
            </div>
            {stage.error && (
              <div className="text-xs text-red-500 mt-0.5">{stage.error}</div>
            )}
          </div>

          {/* Время выполнения */}
          {stage.duration_ms !== undefined && (
            <div className="text-xs text-gray-400 flex-shrink-0">
              {stage.duration_ms < 1000 
                ? `${stage.duration_ms}ms` 
                : `${(stage.duration_ms / 1000).toFixed(1)}s`}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
