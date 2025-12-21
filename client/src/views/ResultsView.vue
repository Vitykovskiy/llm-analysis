<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { marked } from 'marked'
import { encode } from 'plantuml-encoder'
import { getResults, isDemoMode, type ResultEntry } from '../services/api'

const loading = ref(false)
const error = ref('')
const results = ref<ResultEntry[]>([])
const demoMode = isDemoMode
const viewMode = ref<Record<number, 'preview' | 'source'>>({})

marked.setOptions({
  breaks: true,
})

const fetchResults = async (): Promise<void> => {
  loading.value = true
  error.value = ''
  try {
    results.value = await getResults()
  } catch (err) {
    error.value = (err as Error).message
    results.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchResults()
})

const formatLabel = (item: ResultEntry): string =>
  item.format === 'plantuml' ? 'PlantUML' : 'Markdown'

const isPreview = (id: number): boolean => (viewMode.value[id] ?? 'preview') === 'preview'
const toggleMode = (id: number): void => {
  const current = viewMode.value[id] ?? 'preview'
  viewMode.value = { ...viewMode.value, [id]: current === 'preview' ? 'source' : 'preview' }
}

const renderMarkdown = (content: string): string => marked.parse(content ?? '')
const plantUmlUrl = (content: string): string => `https://www.plantuml.com/plantuml/svg/${encode(content)}`
</script>

<template>
  <v-container class="py-10">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card elevation="3">
          <v-card-title class="d-flex align-center justify-space-between flex-wrap ga-4">
            <div class="text-h5 font-weight-bold">Результаты</div>
            <div class="d-flex ga-2">
              <v-btn color="primary" :loading="loading" :disabled="loading" prepend-icon="mdi-refresh"
                @click="fetchResults">
                Обновить
              </v-btn>
            </div>
          </v-card-title>

          <v-divider />

          <v-card-text class="d-flex flex-column ga-4">
            <!--             <v-alert
              v-if="demoMode"
              type="info"
              variant="tonal"
              border="start"
              density="comfortable"
            >
              Демо режим включён. Показаны пример markdown и PlantUML-файлы.
            </v-alert> -->

            <v-alert v-if="error" type="error" variant="tonal" border="start" density="comfortable">
              {{ error }}
            </v-alert>

            <div v-if="loading" class="d-flex flex-column ga-2">
              <v-skeleton-loader type="paragraph" />
              <v-skeleton-loader type="paragraph" />
            </div>

            <div v-else class="d-flex flex-column ga-4">
              <div v-if="!results.length" class="text-medium-emphasis text-body-2">
                Нет данных для отображения.
              </div>

              <v-card v-for="item in results" :key="item.id" variant="outlined" class="pa-4">
                <div class="d-flex align-center justify-space-between ga-3 mb-3 flex-wrap">
                  <div class="text-subtitle-1 font-weight-bold">{{ item.title }}</div>
                  <div class="d-flex align-center ga-2">
                    <v-chip color="primary" variant="tonal" size="small">
                      {{ formatLabel(item) }}
                    </v-chip>
                    <v-btn size="small" variant="tonal" color="primary" @click="toggleMode(item.id)">
                      {{ isPreview(item.id) ? 'Показать исходник' : 'Показать превью' }}
                    </v-btn>
                  </div>
                </div>

                <div v-if="item.format === 'plantuml'">
                  <div v-if="isPreview(item.id)" class="uml-preview">
                    <img :src="plantUmlUrl(item.content)" alt="PlantUML diagram" />
                  </div>
                  <div v-else class="code-block">
                    <pre>{{ item.content }}</pre>
                  </div>
                </div>

                <div v-else>
                  <div v-if="isPreview(item.id)" class="markdown-block" v-html="renderMarkdown(item.content)" />
                  <div v-else class="code-block">
                    <pre>{{ item.content }}</pre>
                  </div>
                </div>
              </v-card>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.code-block,
.markdown-block,
.uml-preview {
  background: rgba(0, 0, 0, 0.04);
  border-radius: 8px;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Fira Code', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  margin: 0;
}

pre {
  margin: 0;
}

.markdown-block {
  font-family: inherit;
  white-space: normal;
}

.uml-preview img {
  width: auto;
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}

.uml-preview {
  overflow-x: auto;
}
</style>
