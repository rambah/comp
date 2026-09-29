import type { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';

export const SOA_BATCH_PROVIDER_OPTIONS = {
  openai: {
    // The installed SDK predates GPT-6; explicitly enable reasoning parameters.
    forceReasoning: true,
    reasoningEffort: 'medium',
    store: false,
  } satisfies OpenAIResponsesProviderOptions,
};
