# Workflow: Lovable → Cursor

## Структура веток

- **`main`** - Production код, разрабатывается в Cursor
- **`prototype/lovable`** - Прототипы и макеты, генерируются в Lovable

## Настройка Lovable

1. В настройках Lovable подключите Git репозиторий:
   - Repository: `https://github.com/0837983-debug/metric-sparkle-bank.git`
   - Branch: `prototype/lovable`
   - Lovable будет автоматически коммитить изменения в эту ветку

## Процесс работы

### 1. Создание прототипа в Lovable

- Разрабатывайте макеты и прототипы в Lovable
- Lovable автоматически коммитит код в ветку `prototype/lovable`
- Все изменения сохраняются в истории Git

### 2. Перенос компонентов в production

Когда компонент из прототипа готов к использованию:

1. **Укажите компонент для переноса:**
   ```
   "Возьми компонент Button из prototype/lovable и перенеси в main"
   ```

2. **Я выполню перенос:**
   - Скопирую компонент из `prototype/lovable`
   - Адаптирую под структуру проекта
   - Проверю совместимость с существующим кодом
   - Интегрирую в production ветку

3. **Проверка:**
   - Компонент будет добавлен в `main`
   - Можно сразу использовать в production коде

## Полезные команды

### Просмотр прототипов

```bash
# Переключиться на ветку прототипов
git checkout prototype/lovable

# Посмотреть список файлов в прототипе
git ls-tree -r --name-only prototype/lovable

# Вернуться на main
git checkout main
```

### Сравнение веток

```bash
# Посмотреть различия между ветками
git diff main..prototype/lovable

# Посмотреть изменения в конкретной папке
git diff main..prototype/lovable -- frontend/src/components/

# Посмотреть конкретный файл из прототипа
git show prototype/lovable:frontend/src/components/SomeComponent.tsx
```

### Обновление прототипов

```bash
# Получить последние изменения из прототипа
git fetch origin prototype/lovable

# Посмотреть последние коммиты в прототипе
git log origin/prototype/lovable --oneline -10
```

## Структура проекта

```
BankMetricsDashboard/
├── frontend/          # Production код (main)
├── backend/           # Production код (main)
├── shared/            # Общие типы и утилиты
└── prototype/         # Прототипы (только в prototype/lovable)
    └── frontend/      # Прототипы от Lovable
```

## Правила работы

1. **Не коммитить в main напрямую из Lovable** - только через перенос компонентов
2. **Прототипы остаются в prototype/lovable** - для истории и справки
3. **Адаптация обязательна** - код из прототипа всегда адаптируется под production структуру
4. **Тестирование** - перенесённые компоненты проверяются перед коммитом в main

## Примеры запросов

- "Перенеси компонент DashboardCard из прототипа"
- "Возьми стили из Button компонента в prototype/lovable"
- "Скопируй логику из useDataHook в прототипе"
- "Адаптируй компонент Table из прототипа под нашу структуру данных"

## Troubleshooting

### Конфликты при переносе

Если компонент конфликтует с существующим кодом:
- Я предложу варианты решения
- Можно создать новый компонент с другим именем
- Или адаптировать существующий под новый функционал

### Lovable не коммитит

Проверьте:
- Правильно ли указана ветка в настройках Lovable
- Есть ли права на запись в репозиторий
- Работает ли Git integration в Lovable

