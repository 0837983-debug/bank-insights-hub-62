# CI/CD Guide - Руководство по проверке кода

## Обзор

Этот проект настроен с полным CI/CD pipeline для обеспечения качества кода перед деплоем.

## Доступные команды

### Линтинг (ESLint)

```bash
# Проверка кода на ошибки, безопасность и лучшие практики
npm run lint

# Автоматическое исправление ошибок
npm run lint:fix
```

**Что проверяется:**
- Синтаксис TypeScript/JavaScript
- React hooks правила
- Безопасность кода (eslint-plugin-security)
- Качество кода (eslint-plugin-sonarjs)
- Неиспользуемые переменные
- Лучшие практики

### Форматирование (Prettier)

```bash
# Проверка форматирования
npm run format:check

# Автоматическое форматирование
npm run format
```

**Что проверяется:**
- Единый стиль кода
- Отступы, кавычки, точки с запятой
- Переносы строк

### Тесты (Vitest)

```bash
# Запуск всех тестов
npm run test

# Запуск в режиме watch (автоперезапуск при изменениях)
npm run test:watch

# UI для тестов (в браузере)
npm run test:ui

# Тесты с покрытием кода
npm run test:coverage
```

**Что проверяется:**
- ✅ Функциональность компонентов
- ✅ Корректность рендеринга
- ✅ Обработка событий
- ✅ Покрытие кода (минимум 70%)

### E2E Тесты (Playwright)

```bash
# Запуск всех E2E тестов (UI + API)
npm run test:e2e

# Запуск только интеграционных тестов API
npm run test:e2e:api

# Запуск тестов безопасности
npm run test:e2e:security

# Запуск E2E тестов с UI (интерактивный режим)
npm run test:e2e:ui

# Запуск E2E тестов в видимом браузере
npm run test:e2e:headed

# Запуск всех тестов (unit + e2e)
npm run test:all
```

**Что проверяется:**

**UI тесты:**
- ✅ Загрузка главной страницы
- ✅ Отображение контента (KPI карточки, секции)
- ✅ Работа навигации
- ✅ Состояния загрузки и ошибок

**API интеграционные тесты:**
- ✅ Health check endpoint
- ✅ Все KPI endpoints (все, по категории, по ID)
- ✅ Layout endpoint
- ✅ Table data endpoints (с параметрами и без)
- ✅ Chart data endpoints
- ✅ Обработка ошибок (404, 500)
- ✅ Формат ответов (JSON, CORS headers)

**Тесты безопасности:**
- ✅ Защита от SQL Injection (все параметры)
- ✅ Защита от Command Injection (API команд)
- ✅ Защита от XSS (Cross-Site Scripting)
- ✅ Валидация входных данных
- ✅ Защита от Path Traversal
- ✅ Проверка Security Headers
- ✅ Проверка CORS настроек
- ✅ Обработка ошибок без утечки информации

**Важно:** API интеграционные тесты и тесты безопасности требуют запущенного бэкенда на `http://localhost:3001`

### Проверка типов (TypeScript)

```bash
# Проверка типов без компиляции
npm run type-check
```

### Комплексные проверки

```bash
# Перед коммитом (lint + format + test)
npm run pre-commit

# Полная валидация (type-check + lint + format + test)
npm run validate

# CI/CD pipeline (validate + build)
npm run ci
```

## 🚀 Workflow перед деплоем

### Вариант 1: Используя npm скрипты

```bash
# 1. Запустить полную проверку
npm run validate

# 2. Если есть ошибки - исправить
npm run lint:fix
npm run format

# 3. Запустить проверку снова
npm run validate

# 4. Если все OK - собрать production build
npm run build
```

### Вариант 2: Используя shell скрипт

```bash
# Запустить полный CI/CD pipeline одной командой
./scripts/validate.sh
```

Скрипт автоматически:
1. ✓ Проверит типы TypeScript
2. ✓ Запустит ESLint (безопасность + качество кода)
3. ✓ Проверит форматирование Prettier
4. ✓ Запустит все тесты
5. ✓ Соберет production build

## 📊 Результаты

### Успешное прохождение

```
✅ All checks passed! Ready for production.
```

**Можно деплоить!**

### Есть ошибки

```
❌ 2 check(s) failed. Please fix errors before deploying.
```

**Нельзя деплоить** - нужно исправить ошибки.

## 🔧 Исправление ошибок

### Ошибки линтера

```bash
# Автоматическое исправление (большинство ошибок)
npm run lint:fix

# Ручное исправление оставшихся
npm run lint
```

### Ошибки форматирования

```bash
# Автоматическое форматирование
npm run format
```

### Ошибки тестов

```bash
# Запустить тесты в watch режиме для отладки
npm run test:watch

# Посмотреть детали в UI
npm run test:ui
```

### Ошибки типов

```bash
# Проверить какие файлы содержат ошибки типов
npm run type-check
```

## 📝 Добавление новых тестов

### Создание теста для компонента

```typescript
// src/components/MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Запуск конкретного теста

```bash
vitest MyComponent.test.tsx
```

## 🔐 Проверки безопасности

### Статический анализ (ESLint)

ESLint настроен на выявление:
- SQL injection
- XSS (Cross-Site Scripting)
- Небезопасные регулярные выражения
- Использование eval()
- Небезопасная работа с объектами

### E2E тесты безопасности

Запуск тестов безопасности:
```bash
npm run test:e2e:security
```

**Что проверяется:**

1. **SQL Injection Protection**
   - Защита параметров `tableId`, `layout_id`, `categoryId`
   - Проверка query параметров
   - Отсутствие утечки SQL ошибок

2. **Command Injection Protection**
   - Whitelist разрешенных команд
   - Защита от инъекции через `commandKey`
   - Валидация типов входных данных

3. **XSS Protection**
   - Санитизация пользовательского ввода
   - Экранирование HTML в ответах
   - Защита фронтенда от выполнения скриптов

4. **Input Validation**
   - Валидация специальных символов
   - Ограничение размера запросов
   - Проверка структуры JSON

5. **Security Headers**
   - X-Content-Type-Options
   - X-Frame-Options
   - CORS настройки
   - Отсутствие утечки информации о сервере

6. **Error Handling**
   - Отсутствие утечки чувствительной информации
   - Консистентный формат ошибок
   - Отсутствие stack traces в продакшене

### Рекомендации по безопасности

**Критично:**
- ✅ Убрать хардкод паролей из кода (использовать только `.env`)
- ✅ Удален эндпоинт `/api/commands/run` по соображениям безопасности
- ✅ Внедрить rate limiting

**Высокий приоритет:**
- ✅ Регулярно обновлять зависимости (`npm audit`)
- ✅ Использовать HTTPS в продакшене
- ✅ Настроить Content Security Policy (CSP)

## 📈 Покрытие кода

Минимальное требование: **70%** покрытия для:
- Lines (строки кода)
- Functions (функции)
- Branches (ветки условий)
- Statements (выражения)

```bash
# Посмотреть отчет о покрытии
npm run test:coverage
open coverage/index.html
```

## 🎯 Рекомендации

1. **Перед каждым коммитом:**
   ```bash
   npm run pre-commit
   ```

2. **Перед push в main:**
   ```bash
   npm run ci
   ```

3. **При добавлении новой фичи:**
   - Написать тесты
   - Проверить покрытие
   - Запустить полную валидацию

4. **Настроить Git hooks (опционально):**
   Установить husky для автоматического запуска проверок

## ❓ FAQ

**Q: Сколько времени занимает полная проверка?**
A: 1-2 минуты (зависит от размера проекта)

**Q: Можно ли пропустить тесты для быстрого деплоя?**
A: Нет. Все проверки обязательны для production.

**Q: Как добавить исключение для линтера?**
A: Используйте `// eslint-disable-next-line rule-name` (с комментарием почему)

**Q: Тесты падают локально, но должны работать?**
A: Проверьте что установлены все зависимости: `npm install`

## 📚 Дополнительно

- ESLint configuration: `eslint.config.js`
- Prettier configuration: defaults from package tooling
- [Vitest Configuration](./vitest.config.ts)
- [Test Setup](./src/test/setup.ts)
