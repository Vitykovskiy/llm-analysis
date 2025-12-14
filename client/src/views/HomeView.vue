<template>
  <v-container class="py-10">
    <v-row class="mb-6" align="center" justify="space-between" no-gutters>
      <v-col cols="12" md="7" class="pr-md-6 pb-6 pb-md-0">
        <v-card elevation="2" class="pa-6">
          <v-card-title class="text-h5 font-weight-bold mb-2">Готовый стартовый стенд</v-card-title>
          <v-card-text class="text-body-1">
            Клиент на Vue 3 с Vuetify и сервер на NestJS уже связаны в одном монорепозитории.
            Начинайте подключать свои фичи без лишней рутины.
          </v-card-text>
          <v-divider class="my-4" />
          <v-row class="ga-2">
            <v-chip color="primary" variant="elevated">Vue 3 + Vite</v-chip>
            <v-chip color="primary" variant="elevated">Vuetify</v-chip>
            <v-chip color="secondary" variant="flat">NestJS 11</v-chip>
            <v-chip color="secondary" variant="flat">LangChain</v-chip>
            <v-chip color="success" variant="flat">SQLite</v-chip>
          </v-row>
        </v-card>
      </v-col>
      <v-col cols="12" md="5">
        <v-card elevation="2" class="pa-6 bg-grey-lighten-5">
          <v-card-title class="text-h6 font-weight-bold">Что дальше?</v-card-title>
          <v-card-text>
            <v-list density="comfortable" lines="one">
              <v-list-item title="npm run dev --workspace client" subtitle="Запуск фронтенда" prepend-icon="mdi-vuejs" />
              <v-list-item
                title="npm run start:dev --workspace server"
                subtitle="Запуск NestJS"
                prepend-icon="mdi-server"
              />
              <v-list-item title="data/app.sqlite" subtitle="SQLite база создаётся автоматически" prepend-icon="mdi-database" />
            </v-list>
          </v-card-text>
          <v-divider class="my-4" />
          <v-alert type="info" variant="tonal" border="start" color="primary">
            LangChain уже подключён — добавьте свою модель и бизнес-логику.
          </v-alert>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
