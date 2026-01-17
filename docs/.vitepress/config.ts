import { defineConfig } from 'vitepress'

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
            { text: 'Backend', link: '/architecture/backend' },
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
            { text: 'KPI API', link: '/api/kpi-api' },
            { text: 'Table Data API', link: '/api/table-data-api' },
            { text: 'Layout API', link: '/api/layout-api' },
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
            { text: 'Восстановление файлов', link: '/guides/restoration' },
            { text: 'Сравнение Layout API', link: '/guides/layout-comparison' },
            { text: 'Решение проблем', link: '/guides/troubleshooting' }
          ]
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
