<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

export type TaskType = 'epic' | 'task' | 'subtask'
export type TaskStatus = 'backlog' | 'in_progress' | 'done'

const props = defineProps<{
  modelValue: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', payload: { type: TaskType; status: TaskStatus; title: string; description: string }): void
}>()

const form = reactive<{ type: TaskType; status: TaskStatus; title: string; description: string }>({
  type: 'task',
  status: 'backlog',
  title: '',
  description: '',
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
  })
}
</script>

<template>
  <v-dialog v-model="open" max-width="520">
    <v-card>
      <v-card-title class="text-h6 font-weight-bold">Новая задача</v-card-title>
      <v-card-text class="d-flex flex-column ga-4">
        <v-text-field
          v-model="form.title"
          label="Название"
          placeholder="Короткое имя задачи"
          variant="outlined"
          density="comfortable"
        />
        <v-select
          v-model="form.type"
          label="Тип"
          :items="[
            { title: 'Epic', value: 'epic' },
            { title: 'Task', value: 'task' },
            { title: 'Subtask', value: 'subtask' },
          ]"
          density="comfortable"
          variant="outlined"
        />
        <v-select
          v-model="form.status"
          label="Статус"
          :items="[
            { title: 'Backlog', value: 'backlog' },
            { title: 'In Progress', value: 'in_progress' },
            { title: 'Done', value: 'done' },
          ]"
          density="comfortable"
          variant="outlined"
        />
        <v-textarea
          v-model="form.description"
          label="Описание"
          placeholder="Что нужно сделать?"
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
          :disabled="!form.description.trim()"
          @click="submit"
        >
          Создать
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
