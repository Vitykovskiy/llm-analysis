# LLM Analysis Monorepo

Монорепозиторий с клиентом на Vue 3 + Vuetify и сервером на NestJS (LangChain + SQLite).

## Старт

- Установите зависимости один раз в корне: `npm install`
- Запуск клиента: `npm run dev:client` (workspace `client`)
- Запуск сервера: `npm run dev:server` (workspace `server`)

## Сервер

- SQLite база создаётся в `server/data/app.sqlite` автоматически вместе с таблицей `messages`.
- LangChain уже подключён и отдаёт echo-ответ. Замените логику в `server/src/langchain/langchain.service.ts`.

## Клиент

- Использует Vuetify и auto-import компонентов через `vite-plugin-vuetify`.
- Основной шаблон и навигация: `client/src/App.vue`, страницы: `client/src/views`.

## Полезные команды

- `npm run build:client` — сборка клиента
- `npm run build:server` — сборка сервера
