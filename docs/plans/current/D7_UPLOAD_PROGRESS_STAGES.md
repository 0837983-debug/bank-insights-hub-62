# План D.7 — Отображение стадий загрузки файла (SSE)

> **Создан**: 2026-01-23  
> **Обновлён**: 2026-01-30 (выполнено)  
> **Статус**: ✅ ЗАВЕРШЕНО (2026-01-30)  
> **Приоритет**: Средний (улучшение UX)

---

## Цель

Real-time отображение прогресса загрузки файла через **Server-Sent Events (SSE)**.

```
✅ 1. Файл загружен                    0.05s
✅ 2. Файл распознан (150 строк)       0.12s
✅ 3. Валидация пройдена               0.08s
⏳ 4. Загрузка в STG...
⬜ 5. Трансформация STG → ODS
⬜ 6. Трансформация ODS → MART
```

---

## Архитектура: SSE (Server-Sent Events)

```
┌─────────────┐     POST /api/upload      ┌─────────────┐
│   Frontend  │ ────────────────────────▶ │   Backend   │
│             │                           │             │
│             │ ◀──── SSE connection ──── │  EventEmitter│
│             │      /api/upload/progress │             │
│  Listener   │ ◀──── event: stage ────── │  emits()    │
│             │ ◀──── event: complete ─── │             │
└─────────────┘                           └─────────────┘
```

**Почему SSE:**
- Настоящий real-time (события по мере выполнения)
- Проще чем WebSocket (однонаправленный)
- Нативная поддержка в браузерах (EventSource API)
- Автоматический reconnect

---

## Универсальный сервис ProgressService

Сервис для переиспользования в любых длительных операциях.

### API:

```typescript
// backend/src/services/progress/progressService.ts

interface ProgressStage {
  code: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  details?: string;
  rowsProcessed?: number;
  duration_ms?: number;
  error?: string;
}

interface ProgressSession {
  id: string;
  type: 'upload' | 'export' | 'sync';  // Расширяемо
  stages: ProgressStage[];
  currentStage: number;
  startedAt: Date;
}

class ProgressService {
  // Создать сессию прогресса
  createSession(sessionId: string, type: string, stages: string[]): void;
  
  // Обновить стадию
  updateStage(sessionId: string, stageCode: string, status: string, details?: object): void;
  
  // Завершить стадию
  completeStage(sessionId: string, stageCode: string, details?: object): void;
  
  // Ошибка на стадии
  failStage(sessionId: string, stageCode: string, error: string): void;
  
  // Получить текущий прогресс
  getProgress(sessionId: string): ProgressSession | null;
  
  // Подписаться на события (для SSE)
  subscribe(sessionId: string, callback: (event: ProgressEvent) => void): () => void;
}
```

---

## Стадии загрузки

| # | Код | Название | Описание |
|---|-----|----------|----------|
| 1 | `file_received` | Файл получен | Файл сохранён на сервер |
| 2 | `file_parsed` | Файл распознан | Парсинг CSV/XLSX завершён |
| 3 | `validation_passed` | Валидация пройдена | Данные проверены |
| 4 | `loaded_to_stg` | Загружено в STG | INSERT в staging таблицу |
| 5 | `loaded_to_ods` | Загружено в ODS | Трансформация в ODS |
| 6 | `loaded_to_mart` | Загружено в MART | Трансформация в MART |

---

## Этап 1: Backend — ProgressService ✅

**Субагент**: `backend-agent`  
**Статус**: ✅ Завершено (2026-01-30)

### Задачи:
- [x] 1.1 Создать `backend/src/services/progress/progressService.ts`:
  - In-memory хранение сессий (Map)
  - EventEmitter для уведомлений
  - Методы: createSession, updateStage, completeStage, failStage
  - Автоочистка старых сессий (TTL 5 мин)
- [x] 1.2 Создать `backend/src/services/progress/types.ts` — типы
- [x] 1.3 Экспортировать из `backend/src/services/progress/index.ts`

### Структура файлов:
```
backend/src/services/progress/
├── index.ts
├── types.ts
└── progressService.ts
```

### Пример реализации:
```typescript
import { EventEmitter } from 'events';

class ProgressService {
  private sessions = new Map<string, ProgressSession>();
  private emitter = new EventEmitter();
  
  createSession(sessionId: string, type: string, stageCodes: string[]) {
    const stages = stageCodes.map(code => ({
      code,
      name: STAGE_NAMES[code] || code,
      status: 'pending' as const
    }));
    
    this.sessions.set(sessionId, {
      id: sessionId,
      type,
      stages,
      currentStage: 0,
      startedAt: new Date()
    });
  }
  
  updateStage(sessionId: string, stageCode: string, status: string, details?: object) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const stage = session.stages.find(s => s.code === stageCode);
    if (stage) {
      stage.status = status;
      Object.assign(stage, details);
      this.emitter.emit(sessionId, { type: 'stage', stage });
    }
  }
  
  subscribe(sessionId: string, callback: (event: any) => void) {
    this.emitter.on(sessionId, callback);
    return () => this.emitter.off(sessionId, callback);
  }
}

export const progressService = new ProgressService();
```

### Критерии завершения:
- [x] Сервис создан и экспортирован
- [ ] Unit-тест для progressService (опционально)

---

## Этап 2: Backend — SSE Endpoint ✅

**Субагент**: `backend-agent`  
**Зависимости**: Этап 1 ✅  
**Статус**: ✅ Завершено (2026-01-30)

### Задачи:
- [x] 2.1 Создать endpoint `GET /api/upload/progress/:sessionId`:
  ```typescript
  router.get('/progress/:sessionId', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const unsubscribe = progressService.subscribe(sessionId, (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    
    // Отправить текущий статус сразу
    const current = progressService.getProgress(sessionId);
    if (current) {
      res.write(`data: ${JSON.stringify({ type: 'init', ...current })}\n\n`);
    }
    
    req.on('close', unsubscribe);
  });
  ```
- [x] 2.2 Интегрировать progressService в uploadRoutes (28 вызовов):
  ```typescript
  // В начале обработки
  const sessionId = uploadId.toString();
  progressService.createSession(sessionId, 'upload', [
    'file_received', 'file_parsed', 'validation_passed',
    'loaded_to_stg', 'loaded_to_ods', 'loaded_to_mart'
  ]);
  
  // После каждой стадии
  progressService.completeStage(sessionId, 'file_received');
  // ... парсинг ...
  progressService.completeStage(sessionId, 'file_parsed', { rowsProcessed: rows.length });
  ```

### Файлы для изменения:
- `backend/src/routes/uploadRoutes.ts`

### Критерии завершения:
- [x] Endpoint возвращает SSE stream
- [x] События отправляются по мере выполнения
- [x] `curl http://localhost:3001/api/upload/progress/123` работает

---

## Этап 3: Frontend — useUploadProgress hook ✅

**Субагент**: `frontend-agent`  
**Зависимости**: Этап 2 ✅  
**Статус**: ✅ Завершено (2026-01-30)

### Задачи:
- [x] 3.1 Создать `src/hooks/useUploadProgress.ts`:
  ```typescript
  interface UseUploadProgressOptions {
    sessionId: string | null;
    onComplete?: () => void;
    onError?: (error: string) => void;
  }
  
  function useUploadProgress({ sessionId, onComplete, onError }: UseUploadProgressOptions) {
    const [stages, setStages] = useState<ProgressStage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    
    useEffect(() => {
      if (!sessionId) return;
      
      const eventSource = new EventSource(`/api/upload/progress/${sessionId}`);
      
      eventSource.onopen = () => setIsConnected(true);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'init') {
          setStages(data.stages);
        } else if (data.type === 'stage') {
          setStages(prev => prev.map(s => 
            s.code === data.stage.code ? data.stage : s
          ));
        } else if (data.type === 'complete') {
          onComplete?.();
        } else if (data.type === 'error') {
          onError?.(data.error);
        }
      };
      
      return () => eventSource.close();
    }, [sessionId]);
    
    return { stages, isConnected };
  }
  ```
- [x] 3.2 Типы в `src/types/progress.ts`

### Критерии завершения:
- [x] Hook работает с EventSource
- [x] Автоматический reconnect при обрыве (встроено в EventSource)

---

## Этап 4: Frontend — Компонент UploadProgress ✅

**Субагент**: `frontend-agent`  
**Зависимости**: Этап 3 ✅  
**Статус**: ✅ Завершено (2026-01-30)

### Задачи:
- [x] 4.1 Создать `src/components/upload/UploadStagesProgress.tsx`:
  ```tsx
  interface UploadProgressProps {
    sessionId: string | null;
    onComplete?: () => void;
  }
  
  function UploadProgress({ sessionId, onComplete }: UploadProgressProps) {
    const { stages, isConnected } = useUploadProgress({ sessionId, onComplete });
    
    return (
      <div className="space-y-2">
        {stages.map(stage => (
          <div key={stage.code} className="flex items-center gap-2">
            {stage.status === 'completed' && <CheckCircle className="text-green-500" />}
            {stage.status === 'in_progress' && <Loader className="animate-spin" />}
            {stage.status === 'pending' && <Circle className="text-gray-300" />}
            {stage.status === 'failed' && <XCircle className="text-red-500" />}
            <span>{stage.name}</span>
            {stage.duration_ms && <span className="text-gray-400">{stage.duration_ms}ms</span>}
          </div>
        ))}
      </div>
    );
  }
  ```
- [x] 4.2 Интегрировать в `FileUpload.tsx`
- [x] 4.3 Показывать компонент во время загрузки

### Макет:
```
┌─────────────────────────────────────────────────────┐
│  Загрузка: FinancialResults 2025 (Jan).xlsx         │
├─────────────────────────────────────────────────────┤
│  ✅ Файл получен                           50ms     │
│  ✅ Файл распознан (150 строк)             120ms    │
│  ✅ Валидация пройдена                     80ms     │
│  ⏳ Загрузка в STG...                               │
│  ⬜ Трансформация в ODS                             │
│  ⬜ Трансформация в MART                            │
└─────────────────────────────────────────────────────┘
```

### Критерии завершения:
- [x] Компонент отображает стадии в real-time
- [x] Иконки соответствуют статусам
- [x] При ошибке видно где упало

---

## Этап 5: Тестирование ⏸️

**Субагент**: `qa-agent`  
**Зависимости**: Этапы 1-4 ✅  
**Статус**: ⏸️ Ожидает

### Задачи:
- [ ] 5.1 Загрузить валидный файл — все стадии проходят в real-time
- [ ] 5.2 Загрузить файл с ошибкой — показывает где упало
- [ ] 5.3 Проверить reconnect при обрыве соединения

---

## История выполнения

| Дата | Этап | Результат | Комментарий |
|------|------|-----------|-------------|
| 2026-01-30 | Этап 1 | ✅ | ProgressService с EventEmitter |
| 2026-01-30 | Этап 2 | ✅ | SSE endpoint + интеграция в upload pipeline (28 вызовов) |
| 2026-01-30 | Этап 3 | ✅ | useUploadProgress hook с EventSource |
| 2026-01-30 | Этап 4 | ✅ | UploadStagesProgress компонент интегрирован |
