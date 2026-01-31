import { EventEmitter } from 'events';
import type { ProgressSession, ProgressStage, ProgressEvent, ProgressStageStatus } from './types.js';
import { UPLOAD_STAGE_NAMES } from './types.js';

const SESSION_TTL_MS = 5 * 60 * 1000;

class ProgressService {
  private sessions = new Map<string, ProgressSession>();
  private emitter = new EventEmitter();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  createSession(sessionId: string, type: 'upload' | 'export' | 'sync', stageCodes: string[]): void {
    const stages: ProgressStage[] = stageCodes.map(code => ({
      code,
      name: UPLOAD_STAGE_NAMES[code] || code,
      status: 'pending'
    }));

    this.sessions.set(sessionId, {
      id: sessionId, type, stages, currentStageIndex: 0, startedAt: new Date()
    });
    console.log(`[ProgressService] Session created: ${sessionId}`);
    
    // Отправляем init event для SSE клиентов, которые уже подключены
    this.emitter.emit(sessionId, { type: 'init', sessionId, stages: [...stages] });
  }

  startStage(sessionId: string, stageCode: string): void {
    this.updateStage(sessionId, stageCode, 'in_progress');
  }

  updateStage(sessionId: string, stageCode: string, status: ProgressStageStatus, details?: Partial<ProgressStage>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const stage = session.stages.find(s => s.code === stageCode);
    if (!stage) return;

    stage.status = status;
    if (status === 'in_progress' && !stage.startedAt) {
      stage.startedAt = new Date();
    }
    if (details) Object.assign(stage, details);

    const stageIndex = session.stages.findIndex(s => s.code === stageCode);
    if (stageIndex >= session.currentStageIndex) {
      session.currentStageIndex = stageIndex;
    }

    this.emitter.emit(sessionId, { type: 'stage', sessionId, stage: { ...stage } });
  }

  completeStage(sessionId: string, stageCode: string, details?: Partial<ProgressStage>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const stage = session.stages.find(s => s.code === stageCode);
    if (!stage) return;

    stage.completedAt = new Date();
    if (stage.startedAt) {
      stage.duration_ms = stage.completedAt.getTime() - stage.startedAt.getTime();
    }
    this.updateStage(sessionId, stageCode, 'completed', details);
  }

  failStage(sessionId: string, stageCode: string, error: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.error = error;
    this.updateStage(sessionId, stageCode, 'failed', { error });
    this.emitter.emit(sessionId, { type: 'error', sessionId, error });
  }

  completeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.completedAt = new Date();
    this.emitter.emit(sessionId, { type: 'complete', sessionId, stages: session.stages });
  }

  getProgress(sessionId: string): ProgressSession | null {
    return this.sessions.get(sessionId) || null;
  }

  subscribe(sessionId: string, callback: (event: ProgressEvent) => void): () => void {
    this.emitter.on(sessionId, callback);
    return () => this.emitter.off(sessionId, callback);
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.emitter.removeAllListeners(sessionId);
  }

  private cleanup(): void {
    const now = Date.now();
    const sessionsToDelete: string[] = [];
    
    this.sessions.forEach((session, sessionId) => {
      if (now - session.startedAt.getTime() > SESSION_TTL_MS) {
        sessionsToDelete.push(sessionId);
      }
    });
    
    sessionsToDelete.forEach(sessionId => this.deleteSession(sessionId));
  }

  stop(): void {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
    this.emitter.removeAllListeners();
  }
}

export const progressService = new ProgressService();
