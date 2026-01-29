import { defineConfig } from 'vitepress'
import { readdirSync } from 'fs'
import { join } from 'path'

// Функция для автоматического сканирования файлов в папке
function getMarkdownFiles(dir: string, basePath: string): Array<{ text: string; link: string }> {
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    const files = entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md')
      .map(entry => {
        const fileName = entry.name.replace('.md', '')
        // Преобразуем имя файла в читаемый формат (заменяем подчеркивания на пробелы)
        const displayName = fileName.replace(/_/g, ' ')
        return {
          text: displayName,
          link: `${basePath}/${fileName}`
        }
      })
      .sort((a, b) => a.text.localeCompare(b.text))
    return files
  } catch (error) {
    console.warn(`Не удалось прочитать директорию ${dir}:`, error)
    return []
  }
}

// Функция для автоматического обнаружения всех подпапок в plans/ и создания структуры навигации
function getPlansSidebar() {
  const plansDir = join(__dirname, '../plans')
  const items: any[] = [
    { text: 'Обзор', link: '/plans/' },
    { text: 'Roadmap', link: '/plans/ROADMAP' },
    { text: 'Статус', link: '/plans/STATUS' }
  ]

  try {
    const entries = readdirSync(plansDir, { withFileTypes: true })
    const subdirs = entries
      .filter(entry => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))

    for (const subdir of subdirs) {
      const subdirPath = join(plansDir, subdir.name)
      const files = getMarkdownFiles(subdirPath, `/plans/${subdir.name}`)
      
      if (files.length > 0) {
        // Преобразуем имя папки в читаемый формат
        const displayName = subdir.name.replace(/_/g, ' ')
        items.push({
          text: displayName,
          collapsed: false,
          items: files
        })
      }
    }
  } catch (error) {
    console.warn(`Не удалось прочитать директорию plans:`, error)
  }

  return items
}

export default defineConfig({
  title: 'Bank Insights Hub',
  description: 'Документация проекта Bank Insights Hub - дашборд для визуализации банковских метрик и аналитики',
  
  // Базовый URL для деплоя (измените при необходимости)
  base: '/',
  
  // Язык
  lang: 'ru',
  
  // Настройки темы
  themeConfig: {
    // Логотип (опционально)
    // logo: '/logo.svg',
    
    // Навигация в шапке
    nav: [
      { text: 'Главная', link: '/' },
      { text: 'Начало работы', link: '/getting-started/' },
      { text: 'Архитектура', link: '/architecture/' },
      { text: 'API', link: '/api/' },
      { text: 'Разработка', link: '/development/' },
      { text: 'База данных', link: '/database/' },
      { text: 'Context', link: '/context/' },
      { text: 'Планы', link: '/plans/' },
      { text: 'Деплой', link: '/deployment/' }
    ],
    
    // Боковое меню
    sidebar: {
      '/getting-started/': [
        {
          text: 'Начало работы',
          items: [
            { text: 'Обзор', link: '/getting-started/' },
            { text: 'Установка', link: '/getting-started/installation' },
            { text: 'Быстрый старт', link: '/getting-started/quick-start' },
            { text: 'Структура проекта', link: '/getting-started/project-structure' }
          ]
        }
      ],
      
      '/architecture/': [
        {
          text: 'Архитектура',
          items: [
            { text: 'Обзор', link: '/architecture/' },
            { text: 'Общая архитектура', link: '/architecture/overview' },
            { text: 'Frontend', link: '/architecture/frontend' },
            {
              text: 'Backend',
              collapsed: false,
              items: [
                { text: 'Обзор', link: '/architecture/backend/' },
                { text: 'Структура приложения', link: '/architecture/backend/structure' },
                { text: 'Архитектурные слои', link: '/architecture/backend/layers' },
                { text: 'Сервисы', link: '/architecture/backend/services' },
                { text: 'Middleware', link: '/architecture/backend/middleware' },
                { text: 'Data Mart Pattern', link: '/architecture/backend/data-mart' },
                { text: 'Обработка запросов', link: '/architecture/backend/request-processing' },
                { text: 'Безопасность', link: '/architecture/backend/security' },
                { text: 'Оптимизация', link: '/architecture/backend/optimization' },
                { text: 'Миграции', link: '/architecture/backend/migrations' }
              ]
            },
            { text: 'База данных', link: '/architecture/database' },
            { text: 'Поток данных', link: '/architecture/data-flow' },
            {
              text: 'Архитектурные решения',
              items: [
                { text: 'Обзор ADR', link: '/architecture/decisions/' }
              ]
            }
          ]
        }
      ],
      
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Обзор API', link: '/api/' },
            { text: 'Все Endpoints', link: '/api/endpoints' },
            { text: 'Get Data API', link: '/api/get-data' },
            { text: 'Upload API', link: '/api/upload-api' },
            { text: 'Модели данных', link: '/api/data-models' },
            { text: 'Примеры использования', link: '/api/examples' }
          ]
        }
      ],
      
      '/development/': [
        {
          text: 'Разработка',
          items: [
            { text: 'Обзор', link: '/development/' },
            { text: 'Настройка окружения', link: '/development/setup' },
            { text: 'Руководящие принципы', link: '/development/guidelines' },
            { text: 'Стандарты кодирования', link: '/development/coding-standards' },
            { text: 'Тестирование', link: '/development/testing' },
            { text: 'Отладка', link: '/development/debugging' }
          ]
        }
      ],
      
      '/database/': [
        {
          text: 'База данных',
          items: [
            { text: 'Обзор', link: '/database/' },
            { text: 'Схемы БД', link: '/database/schemas' },
            { text: 'Миграции', link: '/database/migrations' },
            { text: 'Data Marts', link: '/database/data-marts' }
          ]
        }
      ],
      
      '/deployment/': [
        {
          text: 'Деплой',
          items: [
            { text: 'Обзор', link: '/deployment/' },
            { text: 'CI/CD Pipeline', link: '/deployment/ci-cd' },
            { text: 'Переменные окружения', link: '/deployment/environment' },
            { text: 'Production Deployment', link: '/deployment/production' }
          ]
        }
      ],
      
      '/guides/': [
        {
          text: 'Руководства',
          items: [
            { text: 'Обзор', link: '/guides/' },
            { text: 'Добавление нового источника данных', link: '/guides/adding-data-source' },
            { text: 'Загрузка файлов', link: '/guides/file-upload' },
            { text: 'Загрузка данных и валидация', link: '/guides/file-upload-validation' },
            { text: 'Восстановление файлов', link: '/guides/restoration' },
            { text: 'Сравнение Layout API', link: '/guides/layout-comparison' },
            { text: 'Решение проблем', link: '/guides/troubleshooting' }
          ]
        }
      ],
      
      '/context/': [
        {
          text: 'Context',
          items: [
            { text: 'Обзор', link: '/context/' },
            { text: 'Backend', link: '/context/backend' },
            { text: 'Frontend', link: '/context/frontend' },
            { text: 'Database', link: '/context/database' }
          ]
        }
      ],
      
      '/plans/': [
        {
          text: 'Планы',
          items: getPlansSidebar()
        }
      ],
      
      '/reference/': [
        {
          text: 'Справочник',
          items: [
            { text: 'Обзор', link: '/reference/' },
            { text: 'Команды', link: '/reference/commands' },
            { text: 'Структура файлов', link: '/reference/file-structure' },
            { text: 'Глоссарий', link: '/reference/glossary' }
          ]
        }
      ]
    },
    
    // Поиск
    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: 'Поиск',
            buttonAriaLabel: 'Поиск в документации'
          },
          modal: {
            noResultsText: 'Ничего не найдено',
            resetButtonTitle: 'Сбросить',
            footer: {
              selectText: 'выбрать',
              navigateText: 'перейти'
            }
          }
        }
      }
    },
    
    // Социальные ссылки (опционально)
    socialLinks: [
      // { icon: 'github', link: 'https://github.com/...' }
    ],
    
    // Футер
    footer: {
      message: 'Документация Bank Insights Hub',
      copyright: 'Copyright © 2024'
    },
    
    // Редактирование на GitHub (опционально)
    // editLink: {
    //   pattern: 'https://github.com/.../edit/main/docs/:path',
    //   text: 'Редактировать эту страницу на GitHub'
    // },
    
    // Последнее обновление
    lastUpdated: {
      text: 'Последнее обновление',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    }
  },
  
  // Markdown настройки
  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  }
})
