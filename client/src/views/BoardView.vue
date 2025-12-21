<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { TASK_STATUS_META, getTasks, isDemoMode, type Task } from '../services/api'

const statusColumns = TASK_STATUS_META

const tasks = ref<Task[]>([])
const loading = ref(false)
const error = ref('')
const expanded = ref<Set<number>>(new Set())
const demoMode = isDemoMode

const fetchTasks = async (): Promise<void> => {
  loading.value = true
  error.value = ''
  try {
    tasks.value = await getTasks()
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchTasks()
})

const isExpanded = (taskId: number): boolean => expanded.value.has(taskId)
const toggleExpanded = (taskId: number): void => {
  const next = new Set(expanded.value)
  if (next.has(taskId)) {
    next.delete(taskId)
  } else {
    next.add(taskId)
  }
  expanded.value = next
}
</script>

<template>
  <v-container class="py-10">
    <v-row class="mb-6" justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card elevation="3">
          <v-card-title class="d-flex align-center justify-space-between flex-wrap ga-4">
            <div class="text-h5 font-weight-bold">Доска задач</div>
            <v-btn icon="mdi-refresh" variant="tonal" color="primary" :disabled="loading" @click="fetchTasks" />
          </v-card-title>
          <v-divider />
          <v-card-text class="d-flex flex-column ga-4">
            <!--             <v-alert v-if="demoMode" type="info" variant="tonal" border="start" class="mb-2" density="comfortable">
              Демо режим включен. Задачи подставлены из клиентских заглушек.
            </v-alert> -->
            <v-alert v-if="error" type="error" variant="tonal" border="start" class="mb-2" density="comfortable">
              {{ error }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <div class="board-row">
      <div v-for="column in statusColumns" :key="column.id" class="board-column">
        <v-sheet rounded="lg" :color="column.tone" class="pa-4 h-100 d-flex flex-column ga-4 drop-zone">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-subtitle-1 font-weight-bold">{{ column.title }}</div>
            </div>
            <v-chip color="primary" variant="flat" size="small">
              {{tasks.filter((task) => task.status === column.id).length}}
            </v-chip>
          </div>

          <div class="d-flex flex-column ga-3 flex-grow-1">
            <div v-if="loading" class="ga-2 d-flex flex-column">
              <v-skeleton-loader type="paragraph" />
              <v-skeleton-loader type="paragraph" />
            </div>

            <div v-else v-for="task in tasks.filter((item) => item.status === column.id)" :key="task.id"
              class="board-card">
              <v-card elevation="2" class="h-100">
                <v-card-item>
                  <div class="d-flex align-center justify-space-between ga-3">
                    <v-chip color="grey-darken-1" size="small" variant="tonal">{{ task.code }}</v-chip>
                  </div>
                  <div class="text-body-1 mt-3 font-weight-medium">{{ task.title }}</div>
                  <div class="d-flex align-center ga-2 mt-2">
                    <v-btn size="x-small" variant="tonal" color="primary" @click="toggleExpanded(task.id)">
                      {{ isExpanded(task.id) ? 'Скрыть описание' : 'Показать описание' }}
                    </v-btn>
                  </div>
                  <v-expand-transition>
                    <div v-if="isExpanded(task.id)" class="text-body-2 mt-2">
                      {{ task.description }}
                    </div>
                  </v-expand-transition>
                </v-card-item>
                <v-divider />
              </v-card>
            </div>

            <div v-if="!loading && tasks.filter((item) => item.status === column.id).length === 0"
              class="empty-column text-medium-emphasis">
              Нет задач в этом статусе.
            </div>
          </div>
        </v-sheet>
      </div>
    </div>
  </v-container>
</template>

<style scoped>
.board-card {
  cursor: default;
}

.board-row {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.board-column {
  flex: 0 0 340px;
}

.drop-zone {
  min-height: 320px;
}

.empty-column {
  border: 1px dashed rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  padding: 12px;
  text-align: center;
}
</style>
