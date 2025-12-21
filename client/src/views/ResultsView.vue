<script setup lang="ts">
import { ref } from 'vue'

type SimilarEntry = {
  content: string
  metadata: Record<string, unknown>
  score: number
}

const apiBaseUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000'
const query = ref('')
const limit = ref(3)
const loading = ref(false)
const error = ref('')
const results = ref<SimilarEntry[]>([])

const formatMetadata = (metadata: Record<string, unknown>): string => {
  try {
    return JSON.stringify(metadata, null, 2)
  } catch {
    return ''
  }
}

const fetchResults = async (): Promise<void> => {
  const payload = query.value.trim()
  if (!payload || loading.value) return

  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({
      query: payload,
      limit: String(limit.value || 3),
    })
    const response = await fetch(`${apiBaseUrl}/messages/similar?${params.toString()}`)
    if (!response.ok) {
      const body = await response.text()
      throw new Error(body || 'Не удалось получить результаты')
    }
    results.value = await response.json()
  } catch (err) {
    error.value = (err as Error).message
    results.value = []
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-container class="py-10">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card elevation="3">
          <v-card-title class="d-flex align-center justify-space-between flex-wrap ga-4">
            <div class="text-h5 font-weight-bold">Результаты векторного поиска</div>
            <div class="d-flex ga-2">
              <v-text-field
                v-model="query"
                label="Запрос"
                density="comfortable"
                variant="outlined"
                hide-details
                class="results-query"
                @keydown.enter.prevent="fetchResults"
              />
              <v-text-field
                v-model.number="limit"
                label="Лимит"
                type="number"
                min="1"
                max="10"
                density="comfortable"
                variant="outlined"
                hide-details
                style="max-width: 120px"
                @keydown.enter.prevent="fetchResults"
              />
              <v-btn
                color="primary"
                :disabled="!query.trim() || loading"
                :loading="loading"
                prepend-icon="mdi-magnify"
                @click="fetchResults"
              >
                Искать
              </v-btn>
            </div>
          </v-card-title>

          <v-divider />

          <v-card-text class="d-flex flex-column ga-4">
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              border="start"
              density="comfortable"
            >
              {{ error }}
            </v-alert>

            <div v-if="loading" class="d-flex flex-column ga-2">
              <v-skeleton-loader type="list-item" />
              <v-skeleton-loader type="list-item" />
            </div>

            <div v-else class="d-flex flex-column ga-3">
              <div v-if="!results.length" class="text-medium-emphasis text-body-2">
                Нет результатов. Введите запрос и нажмите «Искать».
              </div>
              <v-card
                v-for="(item, index) in results"
                :key="index"
                variant="outlined"
                class="pa-3"
              >
                <div class="d-flex align-center justify-space-between ga-2 mb-2">
                  <div class="text-subtitle-2 font-weight-medium">Схожесть: {{ item.score.toFixed(4) }}</div>
                  <v-chip size="x-small" color="primary" variant="tonal">
                    #{{ index + 1 }}
                  </v-chip>
                </div>
                <div class="text-body-1 mb-2">
                  {{ item.content }}
                </div>
                <pre v-if="Object.keys(item.metadata || {}).length" class="metadata-block">
{{ formatMetadata(item.metadata) }}
                </pre>
              </v-card>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.results-query {
  min-width: 240px;
}

.metadata-block {
  background: rgba(0, 0, 0, 0.04);
  border-radius: 8px;
  padding: 8px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  margin: 0;
}
</style>
