import OpenAI from 'openai';

export const MODEL_CHAT     = 'deepseek-chat';
export const MODEL_REASONER = 'deepseek-reasoner';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Lazily create the client so DEEPSEEK_API_KEY is read after dotenv.config() runs
function getClient(): OpenAI {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set — add it to .env');
  return new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: key });
}

// Simple non-streaming chat call
export async function chat(
  messages: Message[],
  model: typeof MODEL_CHAT | typeof MODEL_REASONER = MODEL_CHAT,
  maxTokens = 4096,
): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
  });
  const message = response.choices[0]?.message as any;
  // deepseek-reasoner: reasoning_content is the thinking chain, content is the final structured answer.
  // In practice content is always empty for the reasoner — use reasoning_content as fallback.
  if (model === MODEL_REASONER) {
    return message?.content || message?.reasoning_content || '';
  }
  return message?.content ?? '';
}
