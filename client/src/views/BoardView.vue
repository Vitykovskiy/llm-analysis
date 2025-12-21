<script setup lang="ts">
import { onMounted, ref } from 'vue'

type TaskType = 'epic' | 'task' | 'subtask'
type TaskStatus =
  | 'Открыта'
  | 'Требует уточнения'
  | 'Готова к продолжению'
  | 'Декомпозирована'
  | 'Выполнена'
type Task = {
  id: number
  type: TaskType
  title: string
  description: string
  status: TaskStatus
  code: string
  createdAt: string
  parents: { id: number; code: string; title: string }[]
  children: { id: number; code: string; title: string }[]
}

const apiBaseUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000'

const statusColumns: { id: TaskStatus; title: string; tone: string }[] = [
  { id: 'Открыта', title: 'Открыта', tone: 'grey-lighten-4' },
  { id: 'Требует уточнения', title: 'Требует уточнения', tone: 'orange-lighten-4' },
  { id: 'Готова к продолжению', title: 'Готова к продолжению', tone: 'light-blue-lighten-4' },
  { id: 'Декомпозирована', title: 'Декомпозирована', tone: 'blue-grey-lighten-5' },
  { id: 'Выполнена', title: 'Выполнена', tone: 'green-lighten-5' },
]

const typeColors: Record<TaskType, string> = {
  epic: 'deep-purple-darken-2',
  task: 'blue-darken-1',
  subtask: 'brown-darken-1',
}

const typeTitles: Record<TaskType, string> = {
  epic: 'Эпик',
  task: 'Задача',
  subtask: 'Подзадача',
}

const tasks = ref<Task[]>([])
const loading = ref(false)
const error = ref('')

const fetchTasks = async (): Promise<void> => {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(`${apiBaseUrl}/tasks`)
    if (!response.ok) {
      const body = await response.text()
      throw new Error(body || 'Не удалось загрузить задачи')
    }
    tasks.value = await response.json()
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchTasks()
})
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
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              border="start"
              class="mb-2"
              density="comfortable"
            >
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
              {{ tasks.filter((task) => task.status === column.id).length }}
            </v-chip>
          </div>

          <div class="d-flex flex-column ga-3 flex-grow-1">
            <div v-if="loading" class="ga-2 d-flex flex-column">
              <v-skeleton-loader type="paragraph" />
              <v-skeleton-loader type="paragraph" />
            </div>

            <div
              v-else
              v-for="task in tasks.filter((item) => item.status === column.id)"
              :key="task.id"
              class="board-card"
            >
              <v-card elevation="2" class="h-100">
                <v-card-item>
                  <div class="d-flex align-center justify-space-between ga-3">
                    <div class="d-flex align-center ga-2">
                      <v-chip :color="typeColors[task.type]" variant="flat" size="small" class="text-white">
                        {{ typeTitles[task.type] }}
                      </v-chip>
                      <v-chip color="grey-darken-1" size="small" variant="tonal">{{ task.code }}</v-chip>
                    </div>
                  </div>
                  <div class="text-body-1 mt-3 font-weight-medium">{{ task.title }}</div>
                  <div class="text-body-2 mt-1">{{ task.description }}</div>
                </v-card-item>
                <v-divider />
                <div class="pa-3 d-flex flex-column ga-2">
                  <div v-if="task.parents.length" class="d-flex align-center ga-2 flex-wrap">
                    <span class="text-caption text-medium-emphasis">Родители:</span>
                    <v-chip
                      v-for="parent in task.parents"
                      :key="parent.id"
                      size="x-small"
                      color="grey-darken-1"
                      variant="tonal"
                    >
                      {{ parent.code }}
                    </v-chip>
                  </div>
                  <div v-if="task.children.length" class="d-flex align-center ga-2 flex-wrap">
                    <span class="text-caption text-medium-emphasis">Дочерние:</span>
                    <v-chip
                      v-for="child in task.children"
                      :key="child.id"
                      size="x-small"
                      color="grey-darken-1"
                      variant="tonal"
                    >
                      {{ child.code }}
                    </v-chip>
                  </div>
                </div>
                <v-card-actions class="justify-start">
                  <v-chip label size="small" color="primary" variant="tonal">
                    {{ column.title }}
                  </v-chip>
                </v-card-actions>
              </v-card>
            </div>

            <div
              v-if="!loading && tasks.filter((item) => item.status === column.id).length === 0"
              class="empty-column text-medium-emphasis"
            >
              В колонке пока нет задач.
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
