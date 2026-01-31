export type ProgressStageStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface ProgressStage {
  code: string;
  name: string;
  status: ProgressStageStatus;
  details?: string;
  rowsProcessed?: number;
  duration_ms?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ProgressSession {
  id: string;
  type: 'upload' | 'export' | 'sync';
  stages: ProgressStage[];
  currentStageIndex: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ProgressEvent {
  type: 'init' | 'stage' | 'complete' | 'error';
  sessionId: string;
  stage?: ProgressStage;
  stages?: ProgressStage[];
  error?: string;
}

// Названия стадий для загрузки
export const UPLOAD_STAGE_NAMES: Record<string, string> = {
  'file_received': 'Файл получен',
  'file_parsed': 'Файл распознан',
  'validation_passed': 'Валидация пройдена',
  'loaded_to_stg': 'Загружено в STG',
  'loaded_to_ods': 'Загружено в ODS',
  'loaded_to_mart': 'Загружено в MART',
};

// Стадии для upload pipeline
export const UPLOAD_STAGES = [
  'file_received',
  'file_parsed', 
  'validation_passed',
  'loaded_to_stg',
  'loaded_to_ods',
  'loaded_to_mart'
];
