import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage } from "@langchain/core/messages";
import { config } from "./config";

export class FallbackChatOpenAI {
  private primaryModel: ChatOpenAI;
  private fallbackModel: ChatOpenAI;

  constructor(private temperature: number) {
    this.primaryModel = new ChatOpenAI({
      model: config.openai.chatModel,
      temperature,
      configuration: {
        baseURL: config.openai.baseURL,
        apiKey: config.openai.apiKey,
      },
    });

    this.fallbackModel = new ChatOpenAI({
      model: config.openrouter.chatModel,
      temperature,
      configuration: {
        baseURL: config.openrouter.baseURL,
        apiKey: config.openrouter.apiKey,
      },
    });
  }

  async invoke(messages: BaseMessage[] | any[], options?: any): Promise<any> {
    try {
      if (!config.openai.apiKey) {
        throw new Error("Primary OpenAI/Mistral API key is not configured.");
      }
      return await this.primaryModel.invoke(messages, options);
    } catch (error) {
      console.warn(`[LLM] Primary model invocation failed. Falling back to OpenRouter (${config.openrouter.chatModel}). Error:`, error);
      return await this.fallbackModel.invoke(messages, options);
    }
  }

  withStructuredOutput(schema: any, options?: any) {
    const primaryStructured = this.primaryModel.withStructuredOutput(schema, options);
    const fallbackStructured = this.fallbackModel.withStructuredOutput(schema, options);

    return {
      invoke: async (messages: BaseMessage[] | any[], invokeOptions?: any): Promise<any> => {
        try {
          if (!config.openai.apiKey) {
            throw new Error("Primary OpenAI/Mistral API key is not configured.");
          }
          return await primaryStructured.invoke(messages, invokeOptions);
        } catch (error) {
          console.warn(`[LLM] Primary structured model invocation failed. Falling back to OpenRouter (${config.openrouter.chatModel}). Error:`, error);
          return await fallbackStructured.invoke(messages, invokeOptions);
        }
      }
    };
  }
}

export function getLLM(temperature: number): FallbackChatOpenAI {
  return new FallbackChatOpenAI(temperature);
}
