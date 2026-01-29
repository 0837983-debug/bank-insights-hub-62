---
title: Структура приложения
---

# Структура приложения

```
backend/
├── src/
│   ├── config/          # Конфигурация
│   │   └── database.ts  # Настройки подключения к БД
│   │
│   ├── routes/          # API routes
│   │   ├── index.ts     # Главный роутер
│   │   ├── dataRoutes.ts      # Универсальный endpoint /api/data (SQL Builder)
│   │   ├── uploadRoutes.ts    # Загрузка файлов
│   │   ├── sqlBuilderRoutes.ts # Тестирование SQL Builder
│   │   └── tableDataRoutes.ts # Table data endpoints (legacy, рекомендуется использовать /api/data)
│   │
│   ├── services/        # Бизнес-логика
│   │   ├── queryBuilder/ # SQL Builder - универсальный сервис
│   │   │   ├── builder.ts
│   │   │   ├── validator.ts
│   │   │   ├── queryLoader.ts
│   │   │   └── types.ts
│   │   ├── config/      # Сервисы для работы с config схемой
│   │   │   └── layoutService.ts  # (устаревший, используется через SQL Builder)
│   │   ├── mart/        # Data Mart сервисы (mart схема)
│   │   │   ├── balanceService.ts  # (устаревший, используется через SQL Builder)
│   │   │   ├── kpiService.ts  # (устаревший, используется через SQL Builder)
│   │   │   ├── base/    # Базовые сервисы
│   │   │   │   ├── periodService.ts
│   │   │   │   ├── calculationService.ts
│   │   │   │   ├── componentService.ts
│   │   │   │   └── rowNameMapper.ts
│   │   │   └── types.ts
│   │   └── upload/      # Сервисы загрузки файлов
│   │       ├── fileParserService.ts
│   │       ├── validationService.ts
│   │       ├── storageService.ts
│   │       ├── ingestionService.ts
│   │       └── rollbackService.ts
│   │
│   ├── middleware/      # Express middleware
│   │   └── errorHandler.ts
│   │
│   ├── migrations/      # SQL миграции
│   │   └── *.sql
│   │
│   ├── scripts/         # Утилитарные скрипты
│   │   └── ...
│   │
│   └── server.ts        # Главный файл сервера
│
└── package.json
```
