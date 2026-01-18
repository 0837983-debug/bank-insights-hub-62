# Welcome to your Lovable project

<!-- Sync trigger -->

## Project info

**URL**: https://lovable.dev/projects/801c9de2-8c29-44ca-ab84-3e4bcf91ede2

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/801c9de2-8c29-44ca-ab84-3e4bcf91ede2) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/801c9de2-8c29-44ca-ab84-3e4bcf91ede2) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Функции

### Загрузка файлов (XLSX/CSV)

Система поддерживает загрузку данных из CSV и XLSX файлов для импорта в базу данных.

**Поддерживаемые форматы:**
- CSV (разделитель `;`)
- XLSX (Excel 2007+)

**Поддерживаемые таблицы:**
- `balance` - Баланс (активы, пассивы, капитал)

**Процесс загрузки:**
1. Парсинг файла
2. Валидация структуры и данных
3. Загрузка в STG (Staging)
4. Трансформация STG → ODS (Operational Data Store)
5. Трансформация ODS → MART (Data Mart)

**Документация:**
- [Руководство по загрузке файлов](/docs/guides/file-upload.md)
- [Upload API](/docs/api/upload-api.md)

## Восстановление файлов

Если при работе с проектом вы столкнулись с отсутствием какого-либо файла:

1. **Сначала проверьте** наличие файла в списке неиспользуемых файлов: `docs/unused-files.txt`
2. **Попытайтесь восстановить** файл из архива `archive/` с сохранением полной структуры путей
3. **Только в случае неудачи** восстановления или необнаружения файла в списке - создавайте новый файл

Подробная инструкция: [docs/RESTORATION_GUIDE.md](docs/RESTORATION_GUIDE.md)
