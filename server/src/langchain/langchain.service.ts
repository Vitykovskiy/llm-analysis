import { Injectable } from '@nestjs/common';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class LangchainService {
  private readonly echoChain = RunnableSequence.from([
    PromptTemplate.fromTemplate('Echo from LangChain: {input}'),
    new StringOutputParser(),
  ]);

  async generateEcho(input: string): Promise<string> {
    return this.echoChain.invoke({ input });
  }
}
