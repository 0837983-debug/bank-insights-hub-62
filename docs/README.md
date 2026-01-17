# Документация Bank Insights Hub

Документация проекта построена на [VitePress](https://vitepress.dev/) - генераторе статических сайтов на основе Vite.

## Установка

```bash
npm install -D vitepress
```

## Запуск

### Dev сервер

```bash
npm run docs:dev
```

Документация будет доступна на `http://localhost:5173`

### Сборка

```bash
npm run docs:build
```

Собранные файлы будут в `docs/.vitepress/dist/`

### Preview production build

```bash
npm run docs:preview
```

## Структура

```
docs/
├── .vitepress/
│   └── config.ts          # Конфигурация VitePress
├── getting-started/       # Начало работы
├── architecture/          # Архитектура
├── api/                   # API документация
├── development/           # Разработка
├── database/              # База данных
├── deployment/            # Деплой
├── guides/                # Руководства
├── reference/            # Справочник
└── index.md              # Главная страница
```

## Добавление новой страницы

1. Создайте файл `.md` в соответствующем разделе
2. Добавьте YAML frontmatter с метаданными:

```markdown
---
title: Название страницы
description: Описание страницы
---

# Содержимое
```

3. Обновите навигацию в `.vitepress/config.ts` если нужно

## Деплой

Документация может быть задеплоена на:
- GitHub Pages
- Netlify
- Vercel
- Любой статический хостинг

См. [VitePress Deployment Guide](https://vitepress.dev/guide/deploy)
