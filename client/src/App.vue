<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <v-app>
    <v-app-bar color="primary" density="comfortable" elevate-on-scroll>
      <v-app-bar-title class="font-weight-bold">LLM Analysis</v-app-bar-title>
      <v-spacer />
      <v-btn to="/" variant="text" class="text-white" exact>Chat</v-btn>
      <v-btn to="/board" variant="text" class="text-white">Board</v-btn>
      <v-btn to="/about" variant="text" class="text-white">About</v-btn>
    </v-app-bar>

    <v-main class="bg-grey-lighten-4">
      <RouterView />
    </v-main>

    <v-footer class="bg-grey-darken-4 text-white">
      <v-container class="py-4 d-flex align-center justify-space-between flex-wrap ga-4">
        <span class="text-subtitle-2">Monorepo: Vue 3 + Vuetify / NestJS + LangChain</span>
        <span class="text-caption">Demo stack: client + API + SQLite</span>
      </v-container>
    </v-footer>
  </v-app>
</template>
