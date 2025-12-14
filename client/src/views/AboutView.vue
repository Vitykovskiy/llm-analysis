<template>
  <v-container class="py-10">
    <v-card elevation="2" class="pa-6 mx-auto" max-width="960">
      <v-card-title class="text-h5 font-weight-bold">О проекте</v-card-title>
      <v-card-text class="text-body-1">
        <p class="mb-4">
          Монорепозиторий содержит клиент на Vue 3 + Vuetify и сервер на NestJS с заготовками для
          LangChain, SQLite и Telegram-бота. Структура позволяет развивать фронтенд и backend
          независимо, оставаясь в одном репозитории.
        </p>
        <p class="mb-4">
          Приложение оформлено в виде модульных сервисов: LangChain сервис отвечает за генерацию
          ответов, Database сервис управляет SQLite, а Bot сервис подключает Telegraf. Добавьте свои
          ключи и бизнес-логику — остальное уже настроено.
        </p>
      </v-card-text>
    </v-card>
  </v-container>
</template>
