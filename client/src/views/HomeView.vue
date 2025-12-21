<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  clearMessages,
  createMessage,
  getMessages,
  isDemoMode,
  type ChatMessage,
} from '../services/api'

const messages = ref<ChatMessage[]>([])
const text = ref('')
const loading = ref(false)
const sending = ref(false)
const clearing = ref(false)
const error = ref('')
const demoMode = isDemoMode

const canSend = computed(
  () =>
    text.value.trim().length > 0 &&
    !sending.value &&
    !loading.value &&
    !clearing.value,
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
    messages.value = await getMessages()
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

const sendMessage = async (): Promise<void> => {
  const payload = text.value
  if (!payload.trim() || sending.value) return

  sending.value = true
  error.value = ''
  try {
    const savedMessage = await createMessage(payload)
    messages.value.push(savedMessage)
    text.value = ''
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    sending.value = false
  }
}

const clearChat = async (): Promise<void> => {
  if (clearing.value || loading.value) return

  clearing.value = true
  error.value = ''
  try {
    await clearMessages()
    messages.value = []
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    clearing.value = false
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
              <div class="text-h5 font-weight-bold">Диалог с агентом</div>
            </div>
            <div class="d-flex ga-2 align-center">
              <v-btn icon="mdi-refresh" variant="tonal" color="primary" :disabled="loading || sending || clearing"
                @click="fetchMessages" />

            </div>
          </v-card-title>

          <v-divider />

          <v-card-text>
            <!--             <v-alert v-if="demoMode" type="info" variant="tonal" border="start" class="mb-4" density="comfortable">
              Demo mode is ON. Data comes from client stubs.
            </v-alert> -->

            <v-alert v-if="error" type="error" variant="tonal" border="start" class="mb-4" density="comfortable">
              {{ error }}
            </v-alert>

            <div v-if="loading" class="ga-3 d-flex flex-column">
              <v-skeleton-loader type="paragraph" />
              <v-skeleton-loader type="paragraph" />
            </div>

            <div v-else class="chat-scroll d-flex flex-column ga-5">
              <div v-if="!messages.length" class="text-medium-emphasis text-body-2">
                Сообщений пока нет.
              </div>

              <div v-for="message in messages" :key="message.id" class="d-flex flex-column ga-2">
                <div class="text-caption text-medium-emphasis">Вы</div>
                <v-sheet rounded="lg" color="primary" class="pa-3 text-white" elevation="1">
                  <div class="text-body-1 message-text">{{ message.userText }}</div>
                </v-sheet>

                <div class="text-caption text-medium-emphasis mt-2">Модель</div>
                <v-sheet rounded="lg" color="blue-grey-lighten-5" class="pa-3">
                  <div class="text-body-1 message-text">{{ message.botReply }}</div>
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
              <v-textarea v-model="text" label="Ваше сообщение" placeholder="Спросите что-нибудь у модели..."
                :disabled="sending || clearing" :loading="sending" rows="2" auto-grow variant="outlined" color="primary"
                @keydown.enter.exact.prevent="sendMessage" />
              <div class="d-flex align-center justify-end ga-4">
                <v-btn type="submit" color="primary" :disabled="!canSend" :loading="sending" prepend-icon="mdi-send">
                  Отправить</v-btn>
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

.message-text {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
