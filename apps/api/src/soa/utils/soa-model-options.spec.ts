import { createOpenAI } from '@ai-sdk/openai';
import { SOA_BATCH_MODEL } from './constants';
import { SOA_BATCH_PROVIDER_OPTIONS } from './soa-model-options';

describe('SOA reasoning model compatibility', () => {
  it('sends supported reasoning options through the installed Responses SDK', async () => {
    let requestBody: Record<string, unknown> | undefined;
    const provider = createOpenAI({
      apiKey: 'test-key',
      fetch: Object.assign(
        async (
          _url: Parameters<typeof fetch>[0],
          init?: Parameters<typeof fetch>[1],
        ) => {
          requestBody = JSON.parse(String(init?.body)) as Record<
            string,
            unknown
          >;
          return new Response(
            JSON.stringify({
              id: 'resp_test',
              created_at: 1,
              model: SOA_BATCH_MODEL,
              status: 'completed',
              output: [
                {
                  type: 'message',
                  id: 'msg_test',
                  role: 'assistant',
                  status: 'completed',
                  content: [
                    {
                      type: 'output_text',
                      text: 'INSUFFICIENT_DATA',
                      annotations: [],
                    },
                  ],
                },
              ],
              usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
            }),
            { headers: { 'Content-Type': 'application/json' } },
          );
        },
        { preconnect: () => {} },
      ),
    });

    const response = await provider(SOA_BATCH_MODEL).doGenerate({
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Evaluate the evidence.' }],
        },
      ],
      providerOptions: SOA_BATCH_PROVIDER_OPTIONS,
    });

    expect(requestBody).toMatchObject({
      model: 'gpt-6.1-sol',
      reasoning: { effort: 'medium' },
      store: false,
    });
    expect(requestBody).not.toHaveProperty('temperature');
    expect(response.content).toContainEqual(
      expect.objectContaining({ type: 'text', text: 'INSUFFICIENT_DATA' }),
    );
  });
});
