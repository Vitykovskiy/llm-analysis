import { Injectable, Logger } from '@nestjs/common';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI } from '@langchain/openai';

@Injectable()
export class LangchainService {
  private readonly logger = new Logger(LangchainService.name);

  private readonly model: ChatOpenAI;

  private readonly echoChain: RunnableSequence<{ input: string }, string>;

  constructor() {
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
  }

  async generateEcho(input: string): Promise<string> {
    this.logger.debug('Sending prompt to OpenAI');
    return this.echoChain.invoke({ input });
  }
}
