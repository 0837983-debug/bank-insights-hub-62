# Архив неиспользуемых файлов

Эта директория содержит файлы, которые были перемещены из основного проекта, так как они не используются в текущей версии приложения.

## Структура архива

Архив сохраняет полную структуру директорий проекта:

```
archive/
├── .claude/                  # Конфигурация Claude AI (settings.json)
├── backend/
│   └── src/
│       ├── archive/          # Старые mockup данные
│       └── migrations/       # Все SQL миграции (19 файлов)
│           └── MIGRATIONS_LIST.txt  # Список всех миграций с путями
├── src/
│   ├── pages/                # Неиспользуемые страницы
│   ├── components/           # Неиспользуемые компоненты
│   ├── hooks/                # Неиспользуемые хуки
│   ├── data/                 # Неиспользуемые данные
│   ├── types/                # Неиспользуемые типы
│   ├── test/                 # Тестовые файлы
│   └── lib/                  # Тестовые файлы библиотек
├── docs/                     # Старая документация
├── scripts/                  # Неиспользуемые скрипты
├── public/                   # Неиспользуемые публичные файлы
├── playwright-report/        # Отчеты тестов
└── test-results/             # Результаты тестов
```

## Заархивированные миграции

Все 19 SQL миграций находятся в: `archive/backend/src/migrations/`

**Полный список миграций с путями:** `archive/backend/src/migrations/MIGRATIONS_LIST.txt`

Восстановление миграций:
```bash
cp archive/backend/src/migrations/[номер]_[название].sql backend/src/migrations/
```

## Заархивированные данные

- **Mockup данные:** `archive/backend/src/archive/mockups-original/`
- **Конфигурация Claude AI:** `archive/.claude/settings.json`

## Восстановление файлов

Для восстановления файлов из архива:

1. Проверьте наличие файла в `docs/unused-files-list.txt` или `archive/backend/src/migrations/MIGRATIONS_LIST.txt`
2. Восстановите файл с сохранением структуры:
   ```bash
   cp archive/src/pages/Index.tsx src/pages/Index.tsx
   ```
3. Подробная инструкция: [docs/RESTORATION_GUIDE.md](../docs/RESTORATION_GUIDE.md)

## Важно

- **Не удаляйте файлы из архива** без необходимости
- **Сохраняйте структуру директорий** при восстановлении
- **Обновляйте список** в `docs/unused-files-list.txt` при изменении статуса файлов
