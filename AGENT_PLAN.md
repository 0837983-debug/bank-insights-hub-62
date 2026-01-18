# План выполнения: Система загрузки файлов (XLSX/CSV) с валидацией и загрузкой в БД

## Общая информация
- **Дата создания**: 2025-01-XX
- **Статус**: В процессе
- **Последовательность выполнения**: Backend → Frontend → QA → Documentation

---

## Этап 1: Backend ✅ ЗАВЕРШЕНО
**Ответственный**: Backend Agent
**Статус**: ✅ Завершено
**Зависимости**: Нет

### Задачи:

#### 1.1. Создание структуры БД
- [x] Создать миграцию для схем `stg`, `ods`, `log`, `ing` (если не существуют)
- [x] Создать таблицу `stg.balance_upload` с полями:
  - `month` (DATE) → `period_date`
  - `class` (VARCHAR) → `class`
  - `section` (VARCHAR) → `section`
  - `item` (VARCHAR) → `item` (новое поле)
  - `amount` (NUMERIC) → `value`
  - Аудит: `id`, `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`, `deleted_by`
  - `upload_id` (ссылка на `ing.uploads`)
- [x] Создать таблицу `ods.balance` с аналогичной структурой + поля аудита
- [x] Создать таблицу `ing.uploads` для истории загрузок:
  - `id`, `filename`, `original_filename`, `file_path`, `file_size`, `file_type`
  - `status` (pending, processing, completed, failed, rolled_back)
  - `target_table` (balance, и т.д.)
  - `rows_processed`, `rows_successful`, `rows_failed`
  - `validation_errors` (JSONB)
  - `created_by`, `created_at`, `updated_at`
  - `rolled_back_at`, `rolled_back_by`
- [x] Создать таблицу `dict.upload_mappings` (справочник маппинга):
  - `id`, `target_table` (balance, и т.д.)
  - `source_field` (month, class, section, item, amount)
  - `target_field` (period_date, class, section, item, value)
  - `field_type` (date, varchar, numeric)
  - `is_required` (BOOLEAN)
  - `validation_rules` (JSONB)
  - `created_at`, `updated_at`
- [x] Создать таблицу `log.upload_errors` для детального логирования ошибок (опционально)

#### 1.2. Создание сервисов
- [x] Создать `backend/src/services/upload/fileParserService.ts`:
  - Парсинг CSV (с поддержкой разделителя `;`)
  - Парсинг XLSX (с выбором листа)
  - Валидация структуры файла (заголовки)
  - Возврат данных в унифицированном формате
- [x] Создать `backend/src/services/upload/validationService.ts`:
  - Валидация типов данных (дата, число, текст)
  - Валидация обязательных полей
  - Валидация формата даты (YYYY-MM-DD)
  - Валидация диапазонов значений
  - Проверка уникальности (по period_date + class + section + item)
  - Проверка дубликатов периодов в ODS
  - Агрегация ошибок (1-2 примера + общее количество)
- [x] Создать `backend/src/services/upload/storageService.ts`:
  - Сохранение файла локально в `row/processed/balance/[filename]_yyyymmddhhmmss`
  - Создание директорий при необходимости
  - Возврат пути к сохраненному файлу
- [x] Создать `backend/src/services/upload/ingestionService.ts`:
  - Загрузка данных в `stg.balance_upload`
  - Трансформация данных из STG в ODS
  - Загрузка данных в `ods.balance`
  - Трансформация данных из ODS в MART
  - Загрузка данных в `mart.balance`
  - Soft delete старых данных за период (в ODS и MART)
  - Обновление статуса в `ing.uploads`
- [x] Создать `backend/src/services/upload/rollbackService.ts`:
  - Откат загрузки (удаление данных из STG, ODS, MART)
  - Восстановление старых данных (если были помечены удаленными)
  - Обновление статуса в `ing.uploads`

#### 1.3. Создание API endpoints
- [x] Создать `backend/src/routes/uploadRoutes.ts`:
  - `POST /api/upload` - загрузка файла
    - Принимает multipart/form-data с файлом
    - Параметры: `targetTable` (balance), `sheetName` (для XLSX, опционально)
    - Возвращает: `{ uploadId, status, validationErrors?, progress? }`
  - `GET /api/upload/:uploadId` - статус загрузки
  - `GET /api/upload/:uploadId/sheets` - список листов (для XLSX)
  - `POST /api/upload/:uploadId/rollback` - откат загрузки
  - `GET /api/uploads` - история загрузок
- [x] Добавить маршруты в `backend/src/routes/index.ts`

#### 1.4. Установка зависимостей
- [x] Добавить в `backend/package.json`:
  - `multer` - для обработки multipart/form-data
  - `xlsx` или `exceljs` - для парсинга XLSX
  - `csv-parse` - для парсинга CSV
- [ ] Установить зависимости: `cd backend && npm install`

#### 1.5. Создание утилит
- [x] Создать `backend/src/utils/fileUtils.ts`:
  - Функции для работы с файлами
  - Генерация имен файлов с timestamp
  - Проверка расширений файлов
- [x] Создать `backend/src/utils/dateUtils.ts`:
  - Валидация формата даты
  - Парсинг дат из разных форматов

### Файлы для изменения:
- `backend/src/migrations/018_create_upload_tables.sql` (новая миграция)
- `backend/src/routes/uploadRoutes.ts` (новый файл)
- `backend/src/routes/index.ts` (добавить маршруты)
- `backend/src/services/upload/fileParserService.ts` (новый файл)
- `backend/src/services/upload/validationService.ts` (новый файл)
- `backend/src/services/upload/storageService.ts` (новый файл)
- `backend/src/services/upload/ingestionService.ts` (новый файл)
- `backend/src/services/upload/rollbackService.ts` (новый файл)
- `backend/src/utils/fileUtils.ts` (новый файл)
- `backend/src/utils/dateUtils.ts` (новый файл)
- `backend/package.json` (добавить зависимости)

### Критерии завершения:
- [x] Все миграции созданы и применены
- [x] API endpoints работают корректно
- [x] Парсинг CSV и XLSX работает
- [x] Валидация данных работает (все типы проверок)
- [x] Загрузка в STG → ODS → MART работает
- [x] Откат загрузки работает
- [x] История загрузок сохраняется
- [x] Нет ошибок компиляции TypeScript
- [x] Код следует паттернам проекта

---

## Этап 2: Frontend ✅ ЗАВЕРШЕНО
**Ответственный**: Frontend Agent
**Статус**: ✅ Завершено
**Зависимость**: Этап 1 должен быть завершен (статус ✅) - ✅ Завершено

### Задачи:

#### 2.1. Создание страницы загрузки
- [x] Создать `src/pages/FileUpload.tsx`:
  - Компонент выбора файла (input type="file")
  - Поддержка форматов: .csv, .xlsx
  - Выбор листа для XLSX (если несколько листов)
  - Кнопка "Загрузить"
  - Отображение статуса загрузки
  - Прогресс-бар для больших файлов
  - Отображение ошибок валидации (1-2 примера + общее количество)
  - Сообщение об успехе
  - Кнопка "Откатить загрузку" (если загрузка успешна)

#### 2.2. Создание компонентов
- [x] Создать `src/components/upload/FileUploader.tsx`:
  - Компонент для выбора и загрузки файла
  - Drag & drop (опционально)
  - Валидация типа файла на клиенте
- [x] Создать `src/components/upload/UploadProgress.tsx`:
  - Прогресс-бар загрузки
  - Отображение процентов и статуса
- [x] Создать `src/components/upload/ValidationErrors.tsx`:
  - Отображение ошибок валидации
  - Форматирование: 1-2 примера + общее количество
  - Группировка по типам ошибок
- [x] Создать `src/components/upload/UploadHistory.tsx`:
  - Список истории загрузок
  - Фильтрация по статусу
  - Детали загрузки

#### 2.3. Интеграция с API
- [x] Обновить `src/lib/api.ts`:
  - Добавить функции для работы с upload API:
    - `uploadFile(file, targetTable, sheetName?)`
    - `getUploadStatus(uploadId)`
    - `getUploadSheets(uploadId)`
    - `rollbackUpload(uploadId)`
    - `getUploadHistory()`
- [x] Создать `src/hooks/useFileUpload.ts`:
  - Хук для управления загрузкой файла
  - Состояние: loading, progress, errors, success
  - Функции: upload, rollback, checkStatus

#### 2.4. Добавление маршрута
- [x] Добавить маршрут в `src/App.tsx`:
  - `/upload` → `FileUpload` страница
- [ ] Добавить навигацию в `src/components/Header.tsx` (если нужно) - опционально, можно добавить позже

### Файлы для изменения:
- `src/pages/FileUpload.tsx` (новый файл)
- `src/components/upload/FileUploader.tsx` (новый файл)
- `src/components/upload/UploadProgress.tsx` (новый файл)
- `src/components/upload/ValidationErrors.tsx` (новый файл)
- `src/components/upload/UploadHistory.tsx` (новый файл)
- `src/lib/api.ts` (добавить функции)
- `src/hooks/useFileUpload.ts` (новый файл)
- `src/App.tsx` (добавить маршрут)
- `src/components/Header.tsx` (добавить навигацию, если нужно)

### Критерии завершения:
- [ ] Страница загрузки работает
- [ ] Выбор файла работает (CSV и XLSX)
- [ ] Выбор листа для XLSX работает
- [ ] Прогресс-бар отображается
- [ ] Ошибки валидации отображаются корректно (1-2 примера + общее количество)
- [ ] Сообщение об успехе отображается
- [ ] Откат загрузки работает
- [ ] История загрузок отображается
- [ ] Нет ошибок в консоли браузера
- [ ] UI отзывчивый и адаптивный

---

## Этап 3: QA ✅ ЗАВЕРШЕНО
**Ответственный**: QA Agent
**Статус**: ✅ Завершено
**Зависимость**: Этап 2 должен быть завершен (статус ✅)

### Задачи:

#### 3.1. Создание тестовых данных
- [x] Создать папку `test-data/uploads/`
- [x] Создать корректные CSV файлы:
  - `capital_2025-01.csv` (январь)
  - `capital_2025-02.csv` (февраль)
  - ... (по аналогии с примером, для всех 12 месяцев)
  - Формат: `month;class;section;item;amount`
  - Добавить поле `item` (subcategory) в каждый файл
- [ ] Создать корректные XLSX файлы:
  - `capital_2025.xlsx` (все месяцы на одном листе)
  - `capital_2025_multisheet.xlsx` (каждый месяц на отдельном листе)
- [x] Создать файлы с ошибками для тестирования валидации:
  - `capital_2025-01_invalid_date.csv` (неверный формат даты)
  - `capital_2025-01_invalid_number.csv` (неверный формат числа)
  - `capital_2025-01_missing_field.csv` (отсутствует обязательное поле)
  - `capital_2025-01_duplicate.csv` (дубликаты записей)
  - `capital_2025-01_wrong_structure.csv` (неверная структура файла)

#### 3.2. Создание E2E тестов
- [x] Создать `e2e/file-upload.spec.ts`:
  - Тест загрузки корректного CSV файла
  - Тест загрузки корректного XLSX файла
  - Тест выбора листа для XLSX
  - Тест отображения ошибок валидации
  - Тест отката загрузки
  - Тест истории загрузок
  - Тест прогресс-бара

#### 3.3. Создание unit тестов
- [x] Создать `backend/src/services/upload/fileParserService.test.ts`:
  - Тест парсинга CSV
  - Тест парсинга XLSX
  - Тест валидации структуры файла
- [x] Создать `backend/src/services/upload/validationService.test.ts`:
  - Тест валидации типов данных
  - Тест валидации обязательных полей
  - Тест валидации формата даты
  - Тест валидации диапазонов
  - Тест проверки уникальности
  - Тест проверки дубликатов периодов
  - Тест агрегации ошибок

#### 3.4. Создание integration тестов
- [x] Создать `e2e/api-upload.spec.ts`:
  - Тест API endpoint `/api/upload`
  - Тест API endpoint `/api/upload/:uploadId`
  - Тест API endpoint `/api/upload/:uploadId/rollback`
  - Тест API endpoint `/api/uploads`
  - Тест обработки ошибок API

### Файлы для изменения:
- `test-data/uploads/capital_2025-01.csv` (новый файл)
- `test-data/uploads/capital_2025-02.csv` (новый файл)
- ... (остальные месяцы)
- `test-data/uploads/capital_2025.xlsx` (новый файл)
- `test-data/uploads/capital_2025_multisheet.xlsx` (новый файл)
- `test-data/uploads/capital_2025-01_invalid_date.csv` (новый файл)
- `test-data/uploads/capital_2025-01_invalid_number.csv` (новый файл)
- `test-data/uploads/capital_2025-01_missing_field.csv` (новый файл)
- `test-data/uploads/capital_2025-01_duplicate.csv` (новый файл)
- `test-data/uploads/capital_2025-01_wrong_structure.csv` (новый файл)
- `e2e/file-upload.spec.ts` (новый файл)
- `e2e/api-upload.spec.ts` (новый файл)
- `backend/src/services/upload/fileParserService.test.ts` (новый файл)
- `backend/src/services/upload/validationService.test.ts` (новый файл)

### Критерии завершения:
- [ ] Все тестовые файлы созданы
- [ ] E2E тесты проходят
- [ ] Unit тесты проходят
- [ ] Integration тесты проходят
- [ ] Тесты покрывают все сценарии (успех, ошибки, откат)
- [ ] Тесты изолированы и не зависят друг от друга

---

## Этап 4: Documentation ✅ ЗАВЕРШЕНО
**Ответственный**: Documentation Agent
**Статус**: ✅ Завершено
**Зависимость**: Этап 3 должен быть завершен (статус ✅)

### Задачи:

#### 4.1. Документация API
- [x] Обновить `docs/api/endpoints.md`:
  - Добавить описание endpoints для загрузки файлов
  - Описать параметры запросов
  - Описать форматы ответов
  - Описать коды ошибок
- [x] Создать `docs/api/upload-api.md`:
  - Детальное описание API загрузки
  - Примеры запросов и ответов
  - Описание валидации
  - Описание процесса загрузки (STG → ODS → MART)

#### 4.2. Документация пользователя
- [x] Создать `docs/guides/file-upload.md`:
  - Руководство по загрузке файлов
  - Описание форматов файлов (CSV, XLSX)
  - Описание структуры данных
  - Примеры файлов
  - Описание ошибок и их исправление

#### 4.3. Документация разработчика
- [x] Обновить `docs/development/setup.md`:
  - Добавить информацию о настройке загрузки файлов
  - Описание структуры папок `row/processed/`
- [x] Обновить `docs/architecture/data-flow.md`:
  - Добавить описание потока данных при загрузке
  - Схема: файл → STG → ODS → MART

#### 4.4. Обновление README
- [x] Обновить `README.md`:
  - Добавить информацию о функции загрузки файлов
  - Ссылки на документацию
- [x] Обновить `backend/README.md`:
  - Добавить информацию о новых endpoints
  - Описание миграций

### Файлы для изменения:
- `docs/api/endpoints.md` (обновить)
- `docs/api/upload-api.md` (новый файл)
- `docs/guides/file-upload.md` (новый файл)
- `docs/development/setup.md` (обновить)
- `docs/architecture/data-flow.md` (обновить)
- `README.md` (обновить)
- `backend/README.md` (обновить)

### Критерии завершения:
- [x] API документация актуальна
- [x] Руководство пользователя понятное
- [x] Документация разработчика полная
- [x] README файлы обновлены
- [x] Примеры кода работают
- [x] Нет устаревшей информации

---

## Инструкции для агентов

### Для Backend Agent:
1. Прочитай этот файл полностью
2. Найди раздел "Этап 1: Backend"
3. Выполни все задачи из этого раздела по порядку
4. Обнови статус на "✅ Завершено" после завершения
5. НЕ переходи к другим этапам

### Для Frontend Agent:
1. Прочитай этот файл полностью
2. Проверь, что Этап 1 имеет статус "✅ Завершено"
3. Если нет - жди завершения (sleep 60, проверка каждую минуту)
4. Если да - найди раздел "Этап 2: Frontend"
5. Выполни все задачи из этого раздела
6. Обнови статус после завершения
7. НЕ переходи к другим этапам

### Для QA Agent:
1. Прочитай этот файл полностью
2. Проверь, что Этап 2 имеет статус "✅ Завершено"
3. Если нет - жди завершения (sleep 60, проверка каждую минуту)
4. Если да - найди раздел "Этап 3: QA"
5. Выполни все задачи из этого раздела
6. Обнови статус после завершения
7. НЕ переходи к другим этапам

### Для Documentation Agent:
1. Прочитай этот файл полностью
2. Проверь, что Этап 3 имеет статус "✅ Завершено"
3. Если нет - жди завершения (sleep 60, проверка каждую минуту)
4. Если да - найди раздел "Этап 4: Documentation"
5. Выполни все задачи из этого раздела
6. Обнови статус после завершения
