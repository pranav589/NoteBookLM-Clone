import { BaseMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { config } from "../../lib/config";

export class FallbackChatOpenAI {
  private primaryMistral: ChatOpenAI;
  private fallbackMistral: ChatOpenAI | null = null;
  private openrouterModel: ChatOpenAI;

  constructor(private temperature: number) {
    this.primaryMistral = new ChatOpenAI({
      modelName: config.openai.chatModel,
      temperature,
      configuration: {
        baseURL: config.openai.baseURL,
        apiKey: config.openai.apiKey,
      },
    });

    if (config.openai.fallbackApiKey) {
      this.fallbackMistral = new ChatOpenAI({
        modelName: config.openai.chatModel,
        temperature,
        configuration: {
          baseURL: config.openai.baseURL,
          apiKey: config.openai.fallbackApiKey,
        },
      });
    }

    this.openrouterModel = new ChatOpenAI({
      modelName: config.openrouter.fallbackChatModel,
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
        throw new Error("Primary Mistral API key is not configured.");
      }
      return await this.primaryMistral.invoke(messages, options);
    } catch (primaryError) {
      console.warn(
        "[LLM] Primary Mistral API call failed. Error:",
        primaryError,
      );

      if (this.fallbackMistral && config.openai.fallbackApiKey) {
        try {
          console.warn("[LLM] Falling back to Secondary Mistral API Key...");
          return await this.fallbackMistral.invoke(messages, options);
        } catch (fallbackError) {
          console.warn(
            "[LLM] Secondary Mistral API call failed. Error:",
            fallbackError,
          );
        }
      }
      console.warn(
        `[LLM] Falling back to OpenRouter (${config.openrouter.fallbackChatModel})...`,
      );
      if (!config.openrouter.apiKey) {
        throw new Error("OpenRouter API key is not configured for fallback.");
      }
      return await this.openrouterModel.invoke(messages, options);
    }
  }

  withStructuredOutput(schema: any, options?: any) {
    const primaryStructured = this.primaryMistral.withStructuredOutput(
      schema,
      options,
    );
    const fallbackStructured = this.fallbackMistral
      ? this.fallbackMistral.withStructuredOutput(schema, options)
      : null;
    const openrouterStructured = this.openrouterModel.withStructuredOutput(
      schema,
      options,
    );

    return {
      invoke: async (
        messages: BaseMessage[] | any[],
        invokeOptions?: any,
      ): Promise<any> => {
        try {
          if (!config.openai.apiKey) {
            throw new Error("Primary Mistral API key is not configured.");
          }
          return await primaryStructured.invoke(messages, invokeOptions);
        } catch (primaryError) {
          console.warn(
            "[LLM] Primary structured Mistral API call failed. Error:",
            primaryError,
          );

          if (fallbackStructured && config.openai.fallbackApiKey) {
            try {
              console.warn(
                "[LLM] Falling back to Secondary structured Mistral API Key...",
              );
              return await fallbackStructured.invoke(messages, invokeOptions);
            } catch (fallbackError) {
              console.warn(
                "[LLM] Secondary structured Mistral API call failed. Error:",
                fallbackError,
              );
            }
          }

          console.warn(
            `[LLM] Falling back to OpenRouter structured (${config.openrouter.fallbackChatModel})...`,
          );
          if (!config.openrouter.apiKey) {
            throw new Error(
              "OpenRouter API key is not configured for fallback.",
            );
          }
          return await openrouterStructured.invoke(messages, invokeOptions);
        }
      },
    };
  }
}

const llmCache = new Map<number, FallbackChatOpenAI>();

export function getLLM(temperature: number): FallbackChatOpenAI {
  if (!llmCache.has(temperature)) {
    llmCache.set(temperature, new FallbackChatOpenAI(temperature));
  }
  return llmCache.get(temperature)!;
}

let visionLLMInstance: ChatOpenAI | null = null;

export function getVisionLLM(): ChatOpenAI {
  if (visionLLMInstance) return visionLLMInstance;
  visionLLMInstance = new ChatOpenAI({
    modelName: config.openrouter.visionChatModel,
    temperature: 0.0,
    configuration: {
      baseURL: config.openrouter.baseURL,
      apiKey: config.openrouter.apiKey,
    },
  });
  return visionLLMInstance;
}
