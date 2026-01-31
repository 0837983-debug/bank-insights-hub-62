export type ProgressStageStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface ProgressStage {
  code: string;
  name: string;
  status: ProgressStageStatus;
  details?: string;
  rowsProcessed?: number;
  duration_ms?: number;
  error?: string;
}

export interface ProgressEvent {
  type: 'connected' | 'init' | 'stage' | 'complete' | 'error';
  sessionId: string;
  stage?: ProgressStage;
  stages?: ProgressStage[];
  error?: string;
}
