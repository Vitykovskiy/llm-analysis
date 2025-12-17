<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <v-app>
    <v-app-bar color="primary" density="comfortable" elevate-on-scroll>
      <v-app-bar-title class="font-weight-bold">LLM Analysis</v-app-bar-title>
      <v-spacer />
      <v-btn to="/" variant="text" class="text-white" exact>Чат</v-btn>
      <v-btn to="/board" variant="text" class="text-white">Задачи</v-btn>
    </v-app-bar>

    <v-main class="bg-grey-lighten-4">
      <RouterView />
    </v-main>
  </v-app>
</template>
