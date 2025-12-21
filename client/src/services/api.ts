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
  'open',
  'clarification_needed',
  'ready_to_proceed',
  'decomposed',
  'done',
] as const
export type TaskStatus = (typeof TASK_STATUS_VALUES)[number]
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Открыта',
  clarification_needed: 'Требует уточнения',
  ready_to_proceed: 'Готова к продолжению',
  decomposed: 'Декомпозирована',
  done: 'Выполнена',
}

export const TASK_STATUS_META: { id: TaskStatus; title: string; tone: string }[] = [
  { id: 'open', title: TASK_STATUS_LABELS.open, tone: 'grey-lighten-4' },
  { id: 'clarification_needed', title: TASK_STATUS_LABELS.clarification_needed, tone: 'orange-lighten-4' },
  { id: 'ready_to_proceed', title: TASK_STATUS_LABELS.ready_to_proceed, tone: 'light-blue-lighten-4' },
  { id: 'decomposed', title: TASK_STATUS_LABELS.decomposed, tone: 'blue-grey-lighten-5' },
  { id: 'done', title: TASK_STATUS_LABELS.done, tone: 'green-lighten-5' },
]

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
    userText:
      'Привет! Мне нужно разработать мобильное приложение для формирования заказа на баре кафетерия. Планируется достаточно примитивно: пользователь открывает приложение, получает меню, выбирает нужные позиции и указывает дополнительные опции, переходит в корзину и нажимает «сформировать заказ», выбирает доступный слот времени. Далее заказ получает бариста, он может подтвердить или отменить заказ. По выполнению заказа ему проставляется соответствующий статус. Пользователю приходит уведомление, он забирает заказ. Бариста отмечает заказ закрытым.',
    botReply:
      'Кратко: зафиксировал базовый сценарий и роли. Для корректного проектирования необходимо уточнить правила оформления заказа, модель статусов и взаимодействие пользователей.\nУточняющие вопросы (ответьте по пунктам):\n1. Идентификация пользователя: требуется ли регистрация или заказ без аккаунта? Как пользователь идентифицируется при выдаче заказа?\n2. Оплата: производится в приложении или при получении?\n3. Слоты времени: это интервалы или конкретное время? Кто управляет их доступностью?\n4. Статусы заказа: перечислите ожидаемые статусы и кто их устанавливает.\n5. Отмена заказа: кто может отменять и до какого момента? Нужна ли фиксация причины отмены?\n6. Интерфейс баристы: отдельное приложение, режим в общем приложении или веб-панель?',
    createdAt: '2024-12-18T10:15:00.000Z',
  },
  {
    id: 2,
    userText:
      '1. Думаем сделать доступ через Telegram-бот. Аккаунт пользователя и будет идентификатором. Чтобы избежать абьюза, бариста при первом очном заказе может подтвердить аккаунт.\n2. Оплаты в приложении пока не будет. Оплата на месте при получении.\n3. Интервалы по 10 минут. Этот момент ещё не обсуждали, нужно временное решение.\n4. Статусы: «Создан», «Подтверждён», «Отклонён», «Готов к выдаче», «Закрыт».\n5. Отменяет только бариста, с возможностью указать причину.\n6. Это будет отдельный Telegram-бот со своим веб-интерфейсом.',
    botReply:
      'Кратко: зафиксировал Telegram-идентификацию, офлайн-оплату, статусы, отмену баристой и отдельный интерфейс.\nПредлагаю временную модель слотов для MVP:\n• слоты по 10 минут в рамках рабочих часов;\n• горизонт планирования — сегодня + завтра (или ближайшие 8 часов);\n• лимит заказов на слот — фиксированное N (например, 3);\n• слот доступен, если количество заказов в статусах «Создан» и «Подтверждён» меньше N;\n• статусы «Отклонён» и «Закрыт» лимит не занимают;\n• заказ в статусе «Создан» без подтверждения старше X минут автоматически отклоняется.\nУточняющие вопросы:\n1. Как именно подтверждается аккаунт пользователя баристой?\n2. Может ли неподтверждённый пользователь создавать заказ?\n3. Рабочие часы фиксированы или настраиваются администратором?\n4. Есть ли SLA по подтверждению заказа баристой?\n5. Нужен ли отдельный статус «Выдан»?\n6. Как формируется меню и дополнительные опции?',
    createdAt: '2024-12-18T10:18:00.000Z',
  },
  {
    id: 3,
    userText:
      '1. Возможно, на баре будет QR-код, ведущий в бот.\n2. Неподтверждённый пользователь может отправить заявку на подтверждение, бариста её одобряет.\n3. Рабочие часы фиксированы, но администратор может их менять.\n4. Формального SLA нет, но баристе нужны периодические напоминания о неподтверждённых заказах.\n5. Статус «Выдан» не нужен — после выдачи заказ закрывается.\n6. Нужна отдельная форма занесения меню: группы товаров, напитки (S/M/L — обязательная опция), еда/мерч, опции. Группы допов привязываются к группам напитков.',
    botReply:
      'Кратко: зафиксировал подтверждение через QR → заявку → одобрение, напоминания баристе, настраиваемые часы и модель меню с группами, размерами и допами.\nПредлагаю уточнённую временную модель слотов для MVP:\n• слоты 10 минут в рамках текущих рабочих часов;\n• лимит на слот — N (по умолчанию 3), настраиваемо;\n• горизонт выбора — только «сегодня»;\n• слот считается занятым заказами в статусах «Создан» и «Подтверждён»;\n• напоминания баристе каждые 2 минуты по неподтверждённым заказам.\nУточняющие вопросы:\n1. QR-код — только вход в бот или также подтверждение пользователя на месте?\n2. Подтверждение аккаунта разовое или может быть отозвано?\n3. Нужны ли лимиты на заказы для одного пользователя?\n4. Влияет ли размер напитка на цену?\n5. Допы платные/бесплатные, можно ли выбрать несколько?\n6. Кто управляет меню и ценами?',
    createdAt: '2024-12-18T10:20:00.000Z',
  },
  {
    id: 4,
    userText:
      '1. QR-код даёт доступ к боту.\n2. Подтверждение разовое, навсегда, баны не нужны.\n3. Лимита на количество заказов нет. Без подтверждения заказывать нельзя.\n4. Размер влияет на стоимость.\n5. Допы могут быть платными или бесплатными, можно выбрать несколько.\n6. Меню администрирует пользователь с полными правами. Бариста может отключать доступность позиций, но не менять цены.',
    botReply:
      'Кратко: зафиксировал строгий доступ (только подтверждённые), модель ценообразования и разграничение прав.\nОстались уточнения:\n1. Лимит заказов на слот для MVP — подтверждаем?\n2. Как часто отправлять напоминания баристе и где?\n3. Заказ после нажатия «Сформировать» сразу получает статус «Создан»?\n4. Нужны ли модификаторы кроме допов?\n5. Нужно ли показывать баристе итоговую сумму заказа?',
    createdAt: '2024-12-18T10:23:00.000Z',
  },
  {
    id: 5,
    userText:
      '1. Лимит — 5 заказов на слот.\n2. Напоминания — в Telegram-боте баристы.\n3. Да.\n4. Пока только допы.\n5. Да, обязательно.',
    botReply:
      'Кратко: зафиксировал лимит слота 5, Telegram-напоминания, статус «Создан» по умолчанию, отсутствие свободных модификаторов и обязательный показ суммы.\nОстались финальные вопросы:\n1. Горизонт слотов — только сегодня или сегодня + завтра?\n2. Рабочие часы по умолчанию?\n3. Валюта, округление, скидки?',
    createdAt: '2024-12-18T10:26:00.000Z',
  },
  {
    id: 6,
    userText: '1. Только сегодня.\n2. По умолчанию 09:00–20:00, администратор может менять.\n3. Рубли, округление до целых, акций нет.',
    botReply: 'Кратко: требования полностью уточнены и согласованы.',
    createdAt: '2024-12-18T10:28:00.000Z',
  },
]

let lastMessageId = demoMessages.length

const demoTasks: Task[] = [
  {
    id: 1,
    type: 'task',
    title: 'Определение цели и границ системы',
    description:
      'Формирование общего представления о системе заказа в баре: назначение, границы автоматизации, основные участники и сценарий.',
    status: 'done',
    code: 'TASK-1',
    createdAt: '2024-12-18T09:00:00.000Z',
    parents: [],
    children: [
      { id: 2, code: 'TASK-2', title: 'Идентификация пользователей и доступ' },
      { id: 3, code: 'TASK-3', title: 'Модель оформления и обработки заказа' },
      { id: 4, code: 'TASK-4', title: 'Модель статусов заказа' },
      { id: 5, code: 'TASK-5', title: 'Модель слотов времени' },
      { id: 6, code: 'TASK-6', title: 'Уведомления и напоминания баристе' },
      { id: 7, code: 'TASK-7', title: 'Модель меню и опций' },
      { id: 9, code: 'TASK-9', title: 'Правила расчёта стоимости заказа' },
    ],
  },
  {
    id: 2,
    type: 'task',
    title: 'Идентификация пользователей и доступ',
    description:
      'Определение способа идентификации через Telegram-бот, подтверждения аккаунта баристой и ограничений для неподтверждённых пользователей.',
    status: 'ready_to_proceed',
    code: 'TASK-2',
    createdAt: '2024-12-18T09:10:00.000Z',
    parents: [{ id: 1, code: 'TASK-1', title: 'Определение цели и границ системы' }],
    children: [],
  },
  {
    id: 3,
    type: 'task',
    title: 'Модель оформления и обработки заказа',
    description: 'Описание процесса создания заказа, передачи баристе, подтверждения, отмены и закрытия.',
    status: 'done',
    code: 'TASK-3',
    createdAt: '2024-12-18T09:20:00.000Z',
    parents: [{ id: 1, code: 'TASK-1', title: 'Определение цели и границ системы' }],
    children: [],
  },
  {
    id: 4,
    type: 'task',
    title: 'Модель статусов заказа',
    description: 'Формирование перечня статусов заказа и допустимых переходов между ними.',
    status: 'clarification_needed',
    code: 'TASK-4',
    createdAt: '2024-12-18T09:30:00.000Z',
    parents: [{ id: 1, code: 'TASK-1', title: 'Определение цели и границ системы' }],
    children: [],
  },
  {
    id: 5,
    type: 'task',
    title: 'Модель слотов времени',
    description: 'Определение правил формирования слотов, лимитов заказов и учёта статусов.',
    status: 'ready_to_proceed',
    code: 'TASK-5',
    createdAt: '2024-12-18T09:40:00.000Z',
    parents: [{ id: 1, code: 'TASK-1', title: 'Определение цели и границ системы' }],
    children: [],
  },
  {
    id: 6,
    type: 'task',
    title: 'Уведомления и напоминания баристе',
    description: 'Определение механизма и периодичности напоминаний о неподтверждённых заказах.',
    status: 'open',
    code: 'TASK-6',
    createdAt: '2024-12-18T09:50:00.000Z',
    parents: [{ id: 1, code: 'TASK-1', title: 'Определение цели и границ системы' }],
    children: [],
  },
  {
    id: 7,
    type: 'task',
    title: 'Модель меню и опций',
    description: 'Формирование структуры меню, групп товаров, размеров и дополнительных опций.',
    status: 'decomposed',
    code: 'TASK-7',
    createdAt: '2024-12-18T10:00:00.000Z',
    parents: [{ id: 1, code: 'TASK-1', title: 'Определение цели и границ системы' }],
    children: [
      { id: 8, code: 'TASK-8', title: 'Структура меню' },
      { id: 10, code: 'TASK-10', title: 'Дополнительные опции и допы' },
    ],
  },
  {
    id: 8,
    type: 'task',
    title: 'Структура меню',
    description: 'Определение групп товаров, типов позиций (напитки, еда, мерч) и связей между ними.',
    status: 'open',
    code: 'TASK-8',
    createdAt: '2024-12-18T10:10:00.000Z',
    parents: [{ id: 7, code: 'TASK-7', title: 'Модель меню и опций' }],
    children: [],
  },
  {
    id: 9,
    type: 'task',
    title: 'Правила расчёта стоимости заказа',
    description: 'Определение валюты, округления, влияния размеров и допов на цену.',
    status: 'done',
    code: 'TASK-9',
    createdAt: '2024-12-18T10:20:00.000Z',
    parents: [{ id: 1, code: 'TASK-1', title: 'Определение цели и границ системы' }],
    children: [],
  },
  {
    id: 10,
    type: 'task',
    title: 'Дополнительные опции и допы',
    description:
      'Формирование правил платных и бесплатных допов, множественного выбора и привязки к группам напитков.',
    status: 'clarification_needed',
    code: 'TASK-10',
    createdAt: '2024-12-18T10:30:00.000Z',
    parents: [{ id: 7, code: 'TASK-7', title: 'Модель меню и опций' }],
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
