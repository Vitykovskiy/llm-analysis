<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import TaskCreateDialog from '../components/TaskCreateDialog.vue'

type TaskType = 'epic' | 'task' | 'subtask'
type TaskStatus =
  | 'Open'
  | 'Drafted'
  | 'RequiresClarification'
  | 'Ready'
  | 'Done'
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
  { id: 'Open', title: 'Новая', tone: 'grey-lighten-4' },
  { id: 'Drafted', title: 'В работе', tone: 'blue-grey-lighten-5' },
  {
    id: 'RequiresClarification',
    title: 'Требует уточнений',
    tone: 'orange-lighten-4',
  },
  { id: 'Ready', title: 'Готово к продолжению', tone: 'light-blue-lighten-4' },
  { id: 'Done', title: 'Завершена', tone: 'green-lighten-5' },
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
const saving = ref(false)
const error = ref('')
const draggingId = ref<number | null>(null)

const createDialog = ref(false)
const editDialog = ref(false)
const relationTypeEdit = ref<'child' | 'parent'>('child')
const editForm = reactive<{
  id: number | null
  type: TaskType
  title: string
  description: string
  status: TaskStatus
  parentIds: any[]
  childIds: any[]
}>({
  id: null,
  type: 'task',
  title: '',
  description: '',
  status: 'Open',
  parentIds: [],
  childIds: [],
})

const tasksByStatus = (status: TaskStatus): Task[] =>
  tasks.value.filter((task) => task.status === status)

const taskOptions = computed(() =>
  tasks.value.map((task) => ({
    value: task.id,
    title: `${task.code} — ${task.title}`,
  })),
)

const editOptions = computed(() =>
  taskOptions.value.filter((option) => option.value !== editForm.id),
)

const relationTargetsEdit = computed({
  get: () =>
    relationTypeEdit.value === 'child' ? editForm.childIds : editForm.parentIds,
  set: (value) => {
    if (relationTypeEdit.value === 'child') {
      editForm.childIds = value as any[]
    } else {
      editForm.parentIds = value as any[]
    }
  },
})

const normalizeIds = (ids?: unknown[]): number[] =>
  (ids ?? [])
    .map((item) => {
      if (typeof item === 'number') return item
      if (typeof item === 'object' && item && 'value' in item) {
        return Number((item as { value: unknown }).value)
      }
      return Number(item)
    })
    .filter((num) => Number.isFinite(num) && num > 0)
    .map((num) => Number(num))

const fetchTasks = async (): Promise<void> => {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(`${apiBaseUrl}/tasks`)
    if (!response.ok) {
      const body = await response.text()
      throw new Error(body || 'Failed to load tasks')
    }
    tasks.value = await response.json()
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

const updateTask = async (
  taskId: number,
  payload: Partial<{
    type: TaskType
    title: string
    description: string
    status: TaskStatus
    parentIds: any[]
    childIds: any[]
  }>,
): Promise<void> => {
  saving.value = true
  error.value = ''
  try {
    const response = await fetch(`${apiBaseUrl}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        parentIds: payload.parentIds ? normalizeIds(payload.parentIds) : undefined,
        childIds: payload.childIds ? normalizeIds(payload.childIds) : undefined,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(body || 'Failed to update task')
    }

    const updated: Task = await response.json()
    const index = tasks.value.findIndex((task) => task.id === taskId)
    if (index === -1) {
      tasks.value.push(updated)
    } else {
      tasks.value.splice(index, 1, updated)
    }
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    saving.value = false
  }
}

const createTask = async (payload: {
  type: TaskType
  title: string
  description: string
  status: TaskStatus
  parentIds: any[]
  childIds: any[]
}): Promise<void> => {
  if (saving.value) return

  saving.value = true
  error.value = ''
  try {
    const response = await fetch(`${apiBaseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        parentIds: normalizeIds(payload.parentIds),
        childIds: normalizeIds(payload.childIds),
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(body || 'Failed to create task')
    }

    const created: Task = await response.json()
    tasks.value = [created, ...tasks.value]
    createDialog.value = false
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    saving.value = false
  }
}

const moveTask = async (taskId: number, status: TaskStatus): Promise<void> => {
  const task = tasks.value.find((item) => item.id === taskId)
  if (!task || task.status === status) {
    return
  }
  await updateTask(taskId, { status })
}

const openEdit = (task: Task): void => {
  editForm.id = task.id
  editForm.type = task.type
  editForm.title = task.title
  editForm.description = task.description
  editForm.status = task.status
  editForm.parentIds = task.parents.map((item) => item.id)
  editForm.childIds = task.children.map((item) => item.id)
  relationTypeEdit.value = 'child'
  editDialog.value = true
}

const saveEdit = async (): Promise<void> => {
  if (!editForm.id) return
  await updateTask(editForm.id, {
    type: editForm.type,
    title: editForm.title,
    description: editForm.description.trim(),
    status: editForm.status,
    parentIds: editForm.parentIds,
    childIds: editForm.childIds,
  })
  if (!error.value) {
    editDialog.value = false
  }
}

const handleDrop = async (status: TaskStatus): Promise<void> => {
  const taskId = draggingId.value
  draggingId.value = null
  if (!taskId) return
  await moveTask(taskId, status)
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
            <div>
              <div class="text-h5 font-weight-bold">Доска задач</div>
            </div>
            <div class="d-flex ga-2">
              <v-btn color="primary" prepend-icon="mdi-plus" :disabled="saving" @click="createDialog = true">
                Создать задачу
              </v-btn>
              <v-btn icon="mdi-refresh" variant="tonal" color="primary" :disabled="loading || saving" @click="fetchTasks" />
            </div>
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
        <v-sheet
          rounded="lg"
          :color="column.tone"
          class="pa-4 h-100 d-flex flex-column ga-4 drop-zone"
          @dragover.prevent
          @dragenter.prevent
          @drop.prevent="handleDrop(column.id)"
        >
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-subtitle-1 font-weight-bold">{{ column.title }}</div>
            </div>
            <v-chip color="primary" variant="flat" size="small">
              {{ tasksByStatus(column.id).length }}
            </v-chip>
          </div>

          <div class="d-flex flex-column ga-3 flex-grow-1">
            <div v-if="loading" class="ga-2 d-flex flex-column">
              <v-skeleton-loader type="paragraph" />
              <v-skeleton-loader type="paragraph" />
            </div>

            <div
              v-else
              v-for="task in tasksByStatus(column.id)"
              :key="task.id"
              class="board-card"
            >
              <v-card
                :elevation="draggingId === task.id ? 8 : 2"
                class="h-100"
                draggable="true"
                @dragstart="draggingId = task.id"
                @dragend="draggingId = null"
              >
                <v-card-item>
                  <div class="d-flex align-center justify-space-between ga-3">
                    <div class="d-flex align-center ga-2">
                      <v-chip :color="typeColors[task.type]" variant="flat" size="small" class="text-white">
                        {{ typeTitles[task.type] }}
                      </v-chip>
                      <v-chip color="grey-darken-1" size="small" variant="tonal">{{ task.code }}</v-chip>
                    </div>
                    <v-btn
                      icon="mdi-pencil"
                      variant="text"
                      size="small"
                      @click="openEdit(task)"
                      :disabled="saving"
                    />
                  </div>
                  <div class="text-body-1 mt-3 font-weight-medium">{{ task.title }}</div>
                  <div class="text-body-2 mt-1">{{ task.description }}</div>
                </v-card-item>
                <v-divider />
                <div class="pa-3 d-flex flex-column ga-2">
                  <div v-if="task.parents.length" class="d-flex align-center ga-2 flex-wrap">
                    <span class="text-caption text-medium-emphasis">Родительские:</span>
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
                <v-card-actions class="justify-space-between">
                  <v-chip
                    label
                    size="small"
                    color="primary"
                    variant="tonal"
                  >
                    {{ column.title }}
                  </v-chip>
                  <div class="d-flex ga-2 align-center">
                    <v-menu>
                      <template #activator="{ props }">
                        <v-btn icon="mdi-swap-horizontal" variant="text" size="small" v-bind="props" />
                      </template>
                      <v-list>
                        <v-list-item
                          v-for="status in statusColumns"
                          :key="status.id"
                          :disabled="status.id === task.status || saving"
                          @click="moveTask(task.id, status.id)"
                        >
                          <v-list-item-title>{{ status.title }}</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </div>
                </v-card-actions>
              </v-card>
            </div>

            <div v-if="!loading && tasksByStatus(column.id).length === 0" class="empty-column text-medium-emphasis">
              Нет задач в этой колонке.
            </div>
          </div>
        </v-sheet>
      </div>
    </div>

    <v-dialog v-model="editDialog" max-width="520">
      <v-card>
        <v-card-title class="text-h6 font-weight-bold">Редактирование задачи</v-card-title>
        <v-card-text class="d-flex flex-column ga-4">
          <v-text-field
            v-model="editForm.title"
            label="Название"
            variant="outlined"
            density="comfortable"
          />
          <v-select
            v-model="editForm.type"
            label="Тип"
            :items="[
              { title: 'Эпик', value: 'epic' },
              { title: 'Задача', value: 'task' },
              { title: 'Подзадача', value: 'subtask' },
            ]"
            density="comfortable"
            variant="outlined"
          />
          <v-select
            v-model="editForm.status"
            label="Статус"
            :items="[
              { title: 'Новая', value: 'Open' },
              { title: 'В работе', value: 'Drafted' },
              { title: 'Требует уточнений', value: 'RequiresClarification' },
              { title: 'Готово к продолжению', value: 'Ready' },
              { title: 'Завершена', value: 'Done' },
            ]"
            density="comfortable"
            variant="outlined"
          />
          <div class="d-flex flex-wrap ga-3">
            <v-select
              v-model="relationTypeEdit"
              :items="[
                { title: 'Дочерние', value: 'child' },
                { title: 'Родительские', value: 'parent' },
              ]"
              label="Связи"
              density="comfortable"
              variant="outlined"
              class="flex-1-1"
            />
            <v-combobox
              v-model="relationTargetsEdit"
              :items="editOptions"
              label="Связанные задачи"
              multiple
              item-title="title"
              item-value="value"
              chips
              clearable
              variant="outlined"
              density="comfortable"
              class="flex-2-1"
            />
          </div>
          <v-textarea
            v-model="editForm.description"
            label="Описание"
            rows="3"
            auto-grow
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>
        <v-card-actions class="justify-end ga-2">
          <v-btn variant="text" @click="editDialog = false">Отмена</v-btn>
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="!editForm.description.trim() || !editForm.title.trim()"
            @click="saveEdit"
          >
            Сохранить
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <TaskCreateDialog
      v-model="createDialog"
      :loading="saving"
      :task-options="taskOptions"
      @submit="createTask"
    />
  </v-container>
</template>

<style scoped>
.board-card {
  cursor: grab;
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

.flex-1-1 {
  flex: 1 1 220px;
}
</style>
