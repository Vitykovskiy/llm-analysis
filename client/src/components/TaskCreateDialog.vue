<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

export type TaskType = 'epic' | 'task' | 'subtask'
export type TaskStatus = 'backlog' | 'in_progress' | 'done'

const props = defineProps<{
  modelValue: boolean
  loading?: boolean
  taskOptions?: { value: number; title: string }[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (
    e: 'submit',
    payload: {
      type: TaskType
      status: TaskStatus
      title: string
      description: string
      parentIds: any[]
      childIds: any[]
    },
  ): void
}>()

const form = reactive<{
  type: TaskType
  status: TaskStatus
  title: string
  description: string
  parentIds: any[]
  childIds: any[]
}>({
  type: 'task',
  status: 'backlog',
  title: '',
  description: '',
  parentIds: [],
  childIds: [],
})

const relationType = ref<'child' | 'parent'>('child')

const relationTargets = computed({
  get: () => (relationType.value === 'child' ? form.childIds : form.parentIds),
  set: (value) => {
    if (relationType.value === 'child') {
      form.childIds = value as any[]
    } else {
      form.parentIds = value as any[]
    }
  },
})

const open = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      form.type = 'task'
      form.status = 'backlog'
      form.title = ''
      form.description = ''
      form.parentIds = []
      form.childIds = []
      relationType.value = 'child'
    }
  },
)

const submit = (): void => {
  const title = form.title.trim()
  const description = form.description.trim()
  if (!title || !description || props.loading) return
  emit('submit', {
    type: form.type,
    title,
    status: form.status,
    description,
    parentIds: form.parentIds,
    childIds: form.childIds,
  })
}
</script>

<template>
  <v-dialog v-model="open" max-width="520">
    <v-card>
      <v-card-title class="text-h6 font-weight-bold">Создание задачи</v-card-title>
      <v-card-text class="d-flex flex-column ga-4">
        <v-text-field
          v-model="form.title"
          label="Название"
          placeholder="Коротко сформулируйте задачу"
          variant="outlined"
          density="comfortable"
        />
        <v-select
          v-model="form.type"
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
          v-model="form.status"
          label="Статус"
          :items="[
            { title: 'Запланировано', value: 'backlog' },
            { title: 'В работе', value: 'in_progress' },
            { title: 'Готово', value: 'done' },
          ]"
          density="comfortable"
          variant="outlined"
        />
        <div class="d-flex flex-wrap ga-3">
          <v-select
            v-model="relationType"
            :items="[
              { title: 'Подзадача', value: 'child' },
              { title: 'Родитель', value: 'parent' },
            ]"
            label="Тип связи"
            density="comfortable"
            variant="outlined"
            class="flex-1-1"
          />
          <v-combobox
            v-model="relationTargets"
            :items="taskOptions ?? []"
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
          v-model="form.description"
          label="Описание"
          placeholder="Добавьте детали, ограничения или критерии"
          rows="3"
          auto-grow
          variant="outlined"
          density="comfortable"
        />
      </v-card-text>
      <v-card-actions class="justify-end ga-2">
        <v-btn variant="text" @click="open = false">Отмена</v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!form.description.trim() || !form.title.trim()"
          @click="submit"
        >
          Создать
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.flex-1-1 {
  flex: 1 1 180px;
}
.flex-2-1 {
  flex: 2 1 220px;
}
</style>
