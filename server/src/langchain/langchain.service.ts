import { Injectable } from '@nestjs/common';
import { PromptTemplate } from '@langchain/core/prompts';

@Injectable()
export class LangchainService {
  private readonly echoTemplate = PromptTemplate.fromTemplate(
    'Echo from LangChain: {input}',
  );

  async generateEcho(input: string): Promise<string> {
    return this.echoTemplate.format({ input });
  }
}
