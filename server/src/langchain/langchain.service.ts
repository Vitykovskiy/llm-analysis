import { Injectable, Logger } from '@nestjs/common';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { Task, TasksService } from '../tasks/tasks.service';

@Injectable()
export class LangchainService {
  private readonly logger = new Logger(LangchainService.name);

  private readonly model: ChatOpenAI;

  private readonly echoChain: RunnableSequence<{ input: string }, string>;

  private readonly taskTools: DynamicStructuredTool[];

  constructor(private readonly tasksService: TasksService) {
    const apiKey = process.env.LLM_API_TOKEN;
    if (!apiKey) {
      throw new Error('LLM_API_TOKEN is not set');
    }

    this.model = new ChatOpenAI({
      apiKey,
      model: process.env.LLM_MODEL ?? 'gpt-4o-mini',
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
    const messages = [
      new SystemMessage(
        'You are a task assistant. Use the available tools to list, create, update, or delete tasks when the user asks about work items. Respond concisely.',
      ),
      new HumanMessage(input),
    ];

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
        const tool = this.taskTools.find((item) => item.name === call.name);
        if (!tool) {
          messages.push(
            new ToolMessage({
              content: `Tool ${call.name} is not available`,
              tool_call_id: call.id,
            }),
          );
          continue;
        }

        try {
          const result = await tool.invoke(call.args);
          messages.push(
            new ToolMessage({
              content: result,
              tool_call_id: call.id,
            }),
          );
        } catch (err) {
          messages.push(
            new ToolMessage({
              content: `Tool error: ${(err as Error).message}`,
              tool_call_id: call.id,
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
    const statusEnum = z.enum(['backlog', 'in_progress', 'done']);
    const typeEnum = z.enum(['epic', 'task', 'subtask']);
    const idArray = z
      .array(z.number().int().positive())
      .describe('List of task ids');

    return [
      new DynamicStructuredTool({
        name: 'list_tasks',
        description:
          'List tasks with codes, statuses, types, and relations. Use it to understand current work items.',
        schema: z.object({
          status: statusEnum.optional().describe('Optional status filter'),
        }),
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
      }),
      new DynamicStructuredTool({
        name: 'create_task',
        description:
          'Create a new task or epic with optional parent/child links. Always provide a clear title and description.',
        schema: z.object({
          type: typeEnum,
          title: z.string().min(1),
          description: z.string().min(1),
          status: statusEnum.optional(),
          parentIds: idArray.optional(),
          childIds: idArray.optional(),
        }),
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
      }),
      new DynamicStructuredTool({
        name: 'update_task',
        description:
          'Update an existing task fields or relations. Provide task id and only fields that should change.',
        schema: z.object({
          id: z.number().int().positive(),
          type: typeEnum.optional(),
          title: z.string().min(1).optional(),
          description: z.string().min(1).optional(),
          status: statusEnum.optional(),
          parentIds: idArray.optional(),
          childIds: idArray.optional(),
        }),
        func: async ({ id, ...payload }) => {
          const updated = await this.tasksService.update(id, payload);
          return `Updated task ${id}:\n${this.formatTask(updated)}`;
        },
      }),
      new DynamicStructuredTool({
        name: 'delete_task',
        description:
          'Delete a task by id. Use after confirming the task should be removed from the board.',
        schema: z.object({
          id: z.number().int().positive(),
        }),
        func: async ({ id }) => {
          await this.tasksService.delete(id);
          return `Deleted task ${id}`;
        },
      }),
    ];
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
}
