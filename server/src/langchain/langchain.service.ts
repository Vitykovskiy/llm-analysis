import { Injectable, Logger } from '@nestjs/common';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { Task, TasksService } from '../tasks/tasks.service';
import { DatabaseService } from '../database/database.service';
import { VectorStoreService } from './vector-store.service';

@Injectable()
export class LangchainService {
  private readonly logger = new Logger(LangchainService.name);

  private readonly model: ChatOpenAI;

  private readonly echoChain: RunnableSequence<{ input: string }, string>;

  private readonly taskTools: DynamicStructuredTool[];

  constructor(
    private readonly tasksService: TasksService,
    private readonly databaseService: DatabaseService,
    private readonly vectorStoreService: VectorStoreService,
  ) {
    const apiKey = process.env.LLM_API_TOKEN;
    if (!apiKey) {
      throw new Error('LLM_API_TOKEN is not set');
    }

    this.model = new ChatOpenAI({
      apiKey,
      model: process.env.LLM_MODEL ?? 'gpt-4.1',
      temperature: 0.2,
    });

    this.echoChain = RunnableSequence.from([
      PromptTemplate.fromTemplate('Echo from LangChain: {input}'),
      this.model,
      new StringOutputParser(),
    ]);

    this.taskTools = this.buildTaskTools();
  }

  async generateEcho(input: string): Promise<string> {
    this.logger.debug('Sending prompt to OpenAI');
    return this.echoChain.invoke({ input });
  }

  /**
   * Main entry point for chat interactions with task tools.
   * Executes a simple tool-calling loop so the model can act on tasks.
   */
  async generateTaskAwareReply(input: string): Promise<string> {
    const toolModel = this.model.bindTools(this.taskTools);
    const messages: BaseMessage[] = [
      new SystemMessage(`Ты - LLM-агент, выполняющий функцию сбора и уточнения требований к автоматизации.

Твоя единственная задача - пошагово собирать информацию от пользователя.
Ты НЕ формируешь решения, требования, диаграммы, выводы или рекомендации.
Ты НЕ объясняешь пользователю, что и зачем будет сделано.

Правила работы:
1. Ты работаешь в режиме диалога и задаёшь ТОЛЬКО уточняющие вопросы.
2. За один шаг ты задаёшь не более 1–3 логически связанных вопросов.
3. Каждый вопрос должен быть направлен на уточнение фактов, а не предположений.
4. Если информации достаточно по текущему блоку — переходи к следующему блоку.
5. Не интерпретируй ответы пользователя вслух.
6. Не суммируй и не пересказывай полученную информацию пользователю.
7. Не предлагай вариантов решений, автоматизации или архитектуры.

Обработка информации:
— после каждого ответа пользователя извлекай факты;
— сохраняй извлечённую информацию во внутреннее хранилище;
— структурируй данные по категориям (процесс, роли, данные, события, проблемы, ограничения);
- информация должна быть пригодна для последующего векторного поиска.

Стиль общения:
— нейтральный, деловой;
— короткие, понятные вопросы;
— без терминов, если пользователь их не использовал.

Последовательность сбора информации:
1. Цель автоматизации.
2. Описание текущего процесса («как есть»).
3. Участники процесса и их действия.
4. Входные и выходные данные.
5. Проблемы и узкие места.
6. Ограничения и допущения.
7. Критерии завершённости процесса (когда считается, что всё выполнено).

Если пользователь уходит в рассуждения - мягко возвращай его к фактам.
`),
    ];
    const history = await this.loadRecentHistory();
    messages.push(...history, new HumanMessage(input));

    for (let step = 0; step < 6; step += 1) {
      const response = (await toolModel.invoke(messages)) as AIMessage;
      messages.push(response);

      if (!response.tool_calls?.length) {
        const content =
          typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);
        return content;
      }

      for (const call of response.tool_calls) {
        const toolCallId = call.id ?? 'tool-call';
        const tool = this.taskTools.find((item) => item.name === call.name);
        if (!tool) {
          messages.push(
            new ToolMessage({
              content: `Tool ${call.name} is not available`,
              tool_call_id: toolCallId,
            }),
          );
          continue;
        }

        try {
          const result = await tool.invoke(call.args);
          messages.push(
            new ToolMessage({
              content: result,
              tool_call_id: toolCallId,
            }),
          );
        } catch (err) {
          messages.push(
            new ToolMessage({
              content: `Tool error: ${(err as Error).message}`,
              tool_call_id: toolCallId,
            }),
          );
        }
      }
    }

    return 'Could not complete the request with available tools.';
  }

  getTaskTools(): DynamicStructuredTool[] {
    return this.taskTools;
  }

  private buildTaskTools(): DynamicStructuredTool[] {
    const statusEnum = z.enum([
      'Открыта',
      'Требует уточнения',
      'Готова к продолжению',
      'Декомпозирована',
      'Выполнена',
    ]);
    const typeEnum = z.enum(['epic', 'task', 'subtask']);
    const idArray = z
      .array(z.number().int().positive())
      .describe('List of task ids');
    const vectorMetadata = z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Optional metadata object');
    const addVectorSchema = z
      .object({
        content: z.string().min(1),
        metadata: vectorMetadata,
        id: z.string().min(1).optional(),
      })
      .describe('Add a document to the vector store') as z.ZodTypeAny;
    const searchVectorSchema = z
      .object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(10).optional(),
      })
      .describe('Search similar documents') as z.ZodTypeAny;
    const getVectorSchema = z
      .object({
        id: z.string().min(1),
      })
      .describe('Get a document by id') as z.ZodTypeAny;
    const updateVectorSchema = z
      .object({
        id: z.string().min(1),
        content: z.string().min(1).optional(),
        metadata: vectorMetadata,
      })
      .describe('Update a document content and/or metadata') as z.ZodTypeAny;
    const deleteVectorSchema = z
      .object({
        id: z.string().min(1),
      })
      .describe('Delete a document by id') as z.ZodTypeAny;
    const listTasksSchema = z
      .object({
        status: statusEnum.optional().describe('Optional status filter'),
      })
      .describe('List tasks input') as z.ZodTypeAny;
    const createTaskSchema = z
      .object({
        type: typeEnum,
        title: z.string().min(1),
        description: z.string().min(1),
        status: statusEnum.optional(),
        parentIds: idArray.optional(),
        childIds: idArray.optional(),
      })
      .describe('Create task input') as z.ZodTypeAny;
    const updateTaskSchema = z
      .object({
        id: z.number().int().positive(),
        type: typeEnum.optional(),
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        status: statusEnum.optional(),
        parentIds: idArray.optional(),
        childIds: idArray.optional(),
      })
      .describe('Update task input') as z.ZodTypeAny;
    const deleteTaskSchema = z
      .object({
        id: z.number().int().positive(),
      })
      .describe('Delete task input') as z.ZodTypeAny;

    const tools: DynamicStructuredTool[] = [
      new DynamicStructuredTool<any>({
        name: 'list_tasks',
        description:
          'List tasks with codes, statuses, types, and relations. Use it to understand current work items.',
        schema: listTasksSchema,
        func: async ({ status }) => {
          const tasks = await this.tasksService.list();
          const filtered = status
            ? tasks.filter((task) => task.status === status)
            : tasks;

          if (!filtered.length) {
            return 'No tasks found for the given filter.';
          }

          return filtered.map((task) => this.formatTask(task)).join('\n---\n');
        },
      }) as unknown as DynamicStructuredTool,
      new DynamicStructuredTool<any>({
        name: 'create_task',
        description:
          'Create a new task or epic with optional parent/child links. Always provide a clear title and description.',
        schema: createTaskSchema,
        func: async ({
          type,
          title,
          description,
          status,
          parentIds,
          childIds,
        }) => {
          const created = await this.tasksService.create({
            type,
            title,
            description,
            status,
            parentIds,
            childIds,
          });
          return `Created task:\n${this.formatTask(created)}`;
        },
      }) as unknown as DynamicStructuredTool,
      new DynamicStructuredTool<any>({
        name: 'update_task',
        description:
          'Update an existing task fields or relations. Provide task id and only fields that should change.',
        schema: updateTaskSchema,
        func: async ({ id, ...payload }) => {
          const updated = await this.tasksService.update(id, payload);
          return `Updated task ${id}:\n${this.formatTask(updated)}`;
        },
      }) as unknown as DynamicStructuredTool,
      new DynamicStructuredTool<any>({
        name: 'delete_task',
        description:
          'Delete a task by id. Use after confirming the task should be removed from the board.',
        schema: deleteTaskSchema,
        func: async ({ id }) => {
          await this.tasksService.delete(id);
          return `Deleted task ${id}`;
        },
      }) as unknown as DynamicStructuredTool,
      new DynamicStructuredTool<any>({
        name: 'vector_add_document',
        description:
          'Add a document to Chroma vector store. Include content and optional metadata/id.',
        schema: addVectorSchema,
        func: async ({ content, metadata, id }) => {
          const result = await this.vectorStoreService.addDocument({
            content,
            metadata,
            id,
          });
          return `Added vector document with id ${result.id}`;
        },
      }) as unknown as DynamicStructuredTool,
      new DynamicStructuredTool<any>({
        name: 'vector_search',
        description:
          'Search similar documents in the vector store. Provide query text and optional limit (1-10).',
        schema: searchVectorSchema,
        func: async ({ query, limit }) => {
          const results = await this.vectorStoreService.similaritySearch(
            query,
            limit ?? 3,
          );
          if (!results.length) return 'No similar documents found.';
          return JSON.stringify(results, null, 2);
        },
      }) as unknown as DynamicStructuredTool,
      new DynamicStructuredTool<any>({
        name: 'vector_get',
        description: 'Fetch a vector document by id.',
        schema: getVectorSchema,
        func: async ({ id }) => {
          const doc = await this.vectorStoreService.getDocument(id);
          if (!doc) return `Document ${id} not found.`;
          return JSON.stringify(doc, null, 2);
        },
      }) as unknown as DynamicStructuredTool,
      new DynamicStructuredTool<any>({
        name: 'vector_update',
        description:
          'Update vector document content and/or metadata. Provide id and fields to change.',
        schema: updateVectorSchema,
        func: async ({ id, content, metadata }) => {
          const result = await this.vectorStoreService.updateDocument({
            id,
            content,
            metadata,
          });
          return `Updated vector document ${result.id}`;
        },
      }) as unknown as DynamicStructuredTool,
      new DynamicStructuredTool<any>({
        name: 'vector_delete',
        description: 'Delete a vector document by id.',
        schema: deleteVectorSchema,
        func: async ({ id }) => {
          await this.vectorStoreService.deleteDocument(id);
          return `Deleted vector document ${id}`;
        },
      }) as unknown as DynamicStructuredTool,
    ];

    return tools;
  }

  private formatTask(task: Task): string {
    const parents = task.parents.map((item) => `${item.code} (${item.title})`);
    const children = task.children.map(
      (item) => `${item.code} (${item.title})`,
    );

    const lines = [
      `${task.code} [${task.type}] (${task.status})`,
      `Title: ${task.title}`,
      `Description: ${task.description}`,
      `Created: ${task.createdAt}`,
    ];

    if (parents.length) {
      lines.push(`Parents: ${parents.join(', ')}`);
    }
    if (children.length) {
      lines.push(`Children: ${children.join(', ')}`);
    }

    return lines.join('\n');
  }

  private async loadRecentHistory(): Promise<BaseMessage[]> {
    try {
      const recent = await this.databaseService.getRecentMessages(10);
      const history: BaseMessage[] = [];
      recent.forEach((item) => {
        history.push(new HumanMessage(item.userText));
        history.push(new AIMessage(item.botReply));
      });
      return history;
    } catch (err) {
      this.logger.warn(
        `Could not load recent messages for context: ${(err as Error).message}`,
      );
      return [];
    }
  }
}
