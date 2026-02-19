import OpenAI from 'openai';

// DeepSeek uses OpenAI-compatible API
export const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});

export const MODEL_CHAT     = 'deepseek-chat';
export const MODEL_REASONER = 'deepseek-reasoner';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Simple non-streaming chat call
export async function chat(
  messages: Message[],
  model: typeof MODEL_CHAT | typeof MODEL_REASONER = MODEL_CHAT,
  maxTokens = 4096,
): Promise<string> {
  const response = await deepseek.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
  });
  return response.choices[0]?.message?.content ?? '';
}
