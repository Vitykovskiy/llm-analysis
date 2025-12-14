<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

type ChatMessage = {
  id: number
  userText: string
  botReply: string
  createdAt: string
}

const apiBaseUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000'

const messages = ref<ChatMessage[]>([])
const text = ref('')
const loading = ref(false)
const sending = ref(false)
const error = ref('')

const canSend = computed(
  () => text.value.trim().length > 0 && !sending.value && !loading.value,
)

const formatDate = (value: string): string => {
  const date = new Date(value)
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const fetchMessages = async (): Promise<void> => {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(`${apiBaseUrl}/messages`)
    if (!response.ok) {
      throw new Error('Не удалось загрузить историю чата')
    }
    messages.value = await response.json()
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

const sendMessage = async (): Promise<void> => {
  const payload = text.value.trim()
  if (!payload || sending.value) return

  sending.value = true
  error.value = ''
  try {
    const response = await fetch(`${apiBaseUrl}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: payload }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(body || 'Не удалось отправить сообщение')
    }

    const savedMessage: ChatMessage = await response.json()
    messages.value.push(savedMessage)
    text.value = ''
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  await fetchMessages()
})
</script>

<template>
  <v-container class="py-10">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card elevation="3">
          <v-card-title class="d-flex align-center justify-space-between flex-wrap ga-4">
            <div>
              <div class="text-h5 font-weight-bold">Чат с нейросетью</div>
              <div class="text-body-2 text-medium-emphasis">
                История сообщений сохраняется в базе данных
              </div>
            </div>
            <v-btn
              icon="mdi-refresh"
              variant="tonal"
              color="primary"
              :disabled="loading || sending"
              @click="fetchMessages"
            />
          </v-card-title>

          <v-divider />

          <v-card-text>
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              border="start"
              class="mb-4"
              density="comfortable"
            >
              {{ error }}
            </v-alert>

            <div v-if="loading" class="ga-3 d-flex flex-column">
              <v-skeleton-loader type="paragraph" />
              <v-skeleton-loader type="paragraph" />
            </div>

            <div v-else class="chat-scroll d-flex flex-column ga-5">
              <div v-if="!messages.length" class="text-medium-emphasis text-body-2">
                Напишите первое сообщение, чтобы начать диалог.
              </div>

              <div v-for="message in messages" :key="message.id" class="d-flex flex-column ga-2">
                <div class="text-caption text-medium-emphasis">Вы</div>
                <v-sheet rounded="lg" color="blue-grey-lighten-5" class="pa-3">
                  <div class="text-body-1">{{ message.userText }}</div>
                </v-sheet>

                <div class="text-caption text-medium-emphasis mt-2">Модель</div>
                <v-sheet rounded="lg" color="primary" class="pa-3 text-white" elevation="1">
                  <div class="text-body-1">{{ message.botReply }}</div>
                </v-sheet>

                <div class="text-caption text-medium-emphasis">
                  {{ formatDate(message.createdAt) }}
                </div>
              </div>
            </div>
          </v-card-text>

          <v-divider />

          <v-card-actions class="pa-4">
            <v-form class="w-100" @submit.prevent="sendMessage">
              <v-textarea
                v-model="text"
                label="Ваше сообщение"
                placeholder="Спросите что-нибудь у модели..."
                :disabled="sending"
                :loading="sending"
                rows="2"
                auto-grow
                variant="outlined"
                color="primary"
                @keydown.enter.exact.prevent="sendMessage"
              />
              <div class="d-flex align-center justify-space-between ga-4">
                <span class="text-caption text-medium-emphasis">
                  Enter — отправить, Shift+Enter — перенос строки
                </span>
                <v-btn
                  type="submit"
                  color="primary"
                  :disabled="!canSend"
                  :loading="sending"
                  prepend-icon="mdi-send"
                >
                  Отправить
                </v-btn>
              </div>
            </v-form>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.chat-scroll {
  max-height: 480px;
  overflow-y: auto;
  padding-right: 4px;
}
</style>

