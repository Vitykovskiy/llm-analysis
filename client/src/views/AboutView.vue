<template>
  <v-container class="py-10">
    <v-card elevation="2" class="pa-6 mx-auto" max-width="960">
      <v-card-title class="text-h5 font-weight-bold">О проекте</v-card-title>
      <v-card-text class="text-body-1 d-flex flex-column ga-4">
        <p>
          Пример монорепозитория с современным стеком: клиент на Vue 3 + Vite +
          Vuetify и сервер на NestJS с LangChain и SQLite. При запуске открывается чат с
          нейросетью, все сообщения записываются в базу данных.
        </p>
        <p>
          Основные части: LangChain для генерации ответа, SQLite хранит историю, а
          минимальный API NestJS предоставляет эндпоинты <code>/messages</code> для чтения и
          отправки сообщений. Интерфейс построен на компонентах Vuetify с адаптивной вёрсткой.
        </p>
      </v-card-text>
    </v-card>
  </v-container>
</template>

