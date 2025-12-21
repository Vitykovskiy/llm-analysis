const apiBaseUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000'

export const isDemoMode =
  String(import.meta.env.VITE_DEMO_MODE ?? '').toLowerCase() === 'true'

type WithId = { id: number }

export type ChatMessage = {
  id: number
  userText: string
  botReply: string
  createdAt: string
}

export type TaskType = 'epic' | 'task' | 'subtask'
export const TASK_STATUS_VALUES = [
  'گ?‘'گَ‘?‘<‘'گّ',
  'گ÷‘?گçگ+‘?گç‘' ‘?‘'گ?‘طگ?گçگ?گٌ‘?',
  'گ"گ?‘'گ?گ?گّ گَ گُ‘?گ?گ?گ?گ>گگçگ?گٌ‘?',
  'گ"گçگَگ?گ?گُگ?گْگٌ‘?گ?گ?گّگ?گّ',
  'گ'‘<گُگ?گ>گ?گçگ?گّ',
] as const
export type TaskStatus = (typeof TASK_STATUS_VALUES)[number]

export type Task = {
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

export type SimilarEntry = {
  content: string
  metadata: Record<string, unknown>
  score: number
}

const delay = (ms = 160): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

const cloneArray = <T extends WithId>(data: T[]): T[] =>
  data.map((item) => ({ ...item }))

const cloneResults = (data: SimilarEntry[]): SimilarEntry[] =>
  data.map((item) => ({
    ...item,
    metadata: { ...(item.metadata || {}) },
  }))

let demoMessages: ChatMessage[] = [
  {
    id: 1,
    userText: 'How do we enrich user feedback before sending it to the LLM?',
    botReply:
      'In the demo we normalize the text, attach metadata (user, feature flag), and only then hit the model.',
    createdAt: '2024-12-18T10:15:00.000Z',
  },
  {
    id: 2,
    userText: 'Show me an example of a stored conversation chunk.',
    botReply:
      'Chunks keep the original user text and the generated reply plus the vector embedding id.',
    createdAt: '2024-12-18T10:18:00.000Z',
  },
]

let lastMessageId = demoMessages.length

const demoTasks: Task[] = [
  {
    id: 1,
    type: 'epic',
    title: 'Demo: Board UX overhaul',
    description:
      'Improve readability of task cards, add quick toggles, and keep the board responsive.',
    status: TASK_STATUS_VALUES[0],
    code: 'DEMO-1',
    createdAt: '2024-12-10T12:00:00.000Z',
    parents: [],
    children: [
      { id: 2, code: 'DEMO-2', title: 'Card layout polish' },
      { id: 3, code: 'DEMO-3', title: 'Board refresh flow' },
    ],
  },
  {
    id: 2,
    type: 'task',
    title: 'Card layout polish',
    description: 'Tighten paddings, align chips, and standardize title sizes.',
    status: TASK_STATUS_VALUES[1],
    code: 'DEMO-2',
    createdAt: '2024-12-11T09:00:00.000Z',
    parents: [{ id: 1, code: 'DEMO-1', title: 'Demo: Board UX overhaul' }],
    children: [],
  },
  {
    id: 3,
    type: 'task',
    title: 'Board refresh flow',
    description: 'Make refresh lightweight and visibly indicate loading per column.',
    status: TASK_STATUS_VALUES[2],
    code: 'DEMO-3',
    createdAt: '2024-12-11T10:30:00.000Z',
    parents: [{ id: 1, code: 'DEMO-1', title: 'Demo: Board UX overhaul' }],
    children: [{ id: 4, code: 'DEMO-4', title: 'Skeletons per column' }],
  },
  {
    id: 4,
    type: 'subtask',
    title: 'Skeletons per column',
    description: 'Render skeleton loaders inside each column during fetch.',
    status: TASK_STATUS_VALUES[3],
    code: 'DEMO-4',
    createdAt: '2024-12-12T08:30:00.000Z',
    parents: [
      { id: 1, code: 'DEMO-1', title: 'Demo: Board UX overhaul' },
      { id: 3, code: 'DEMO-3', title: 'Board refresh flow' },
    ],
    children: [],
  },
  {
    id: 5,
    type: 'task',
    title: 'Release notes',
    description: 'Document how demo mode switches data to client stubs.',
    status: TASK_STATUS_VALUES[4],
    code: 'DEMO-5',
    createdAt: '2024-12-15T14:00:00.000Z',
    parents: [],
    children: [],
  },
]

const demoSimilarResults: SimilarEntry[] = [
  {
    content: 'Demo note: Each chat message stores user text, bot reply, and createdAt.',
    metadata: { source: 'demo-notes.md', section: 'chat' },
    score: 0.9421,
  },
  {
    content: 'Vector search runs on the messages collection with cosine similarity.',
    metadata: { source: 'demo-notes.md', section: 'vector' },
    score: 0.9132,
  },
  {
    content: 'Board items expose parent/child relations for quick drill-down.',
    metadata: { source: 'demo-notes.md', section: 'board' },
    score: 0.8874,
  },
]

const handleResponse = async <T>(response: Response, fallbackMessage: string): Promise<T> => {
  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || fallbackMessage)
  }
  return (await response.json()) as T
}

export const getMessages = async (): Promise<ChatMessage[]> => {
  if (isDemoMode) {
    await delay()
    return cloneArray(demoMessages)
  }

  const response = await fetch(`${apiBaseUrl}/messages`)
  return handleResponse<ChatMessage[]>(response, 'Failed to load chat messages')
}

export const createMessage = async (text: string): Promise<ChatMessage> => {
  if (!text.trim()) {
    throw new Error('Message text is empty')
  }

  if (isDemoMode) {
    await delay()
    const newMessage: ChatMessage = {
      id: ++lastMessageId,
      userText: text,
      botReply: `Demo reply generated for: "${text.slice(0, 80)}"`,
      createdAt: new Date().toISOString(),
    }
    demoMessages = [...demoMessages, newMessage]
    return { ...newMessage }
  }

  const response = await fetch(`${apiBaseUrl}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  return handleResponse<ChatMessage>(response, 'Failed to send message')
}

export const clearMessages = async (): Promise<void> => {
  if (isDemoMode) {
    await delay()
    demoMessages = []
    lastMessageId = 0
    return
  }

  const response = await fetch(`${apiBaseUrl}/messages`, { method: 'DELETE' })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || 'Failed to clear messages')
  }
}

export const getTasks = async (): Promise<Task[]> => {
  if (isDemoMode) {
    await delay()
    return demoTasks.map((task) => ({
      ...task,
      parents: task.parents.map((parent) => ({ ...parent })),
      children: task.children.map((child) => ({ ...child })),
    }))
  }

  const response = await fetch(`${apiBaseUrl}/tasks`)
  return handleResponse<Task[]>(response, 'Failed to load tasks')
}

export const getSimilarMessages = async (
  query: string,
  limit: number,
): Promise<SimilarEntry[]> => {
  if (isDemoMode) {
    await delay()
    const normalizedLimit = limit && limit > 0 ? limit : demoSimilarResults.length
    return cloneResults(demoSimilarResults.slice(0, normalizedLimit))
  }

  const params = new URLSearchParams({
    query,
    limit: String(limit || 3),
  })

  const response = await fetch(`${apiBaseUrl}/messages/similar?${params.toString()}`)
  return handleResponse<SimilarEntry[]>(response, 'Failed to search similar messages')
}
