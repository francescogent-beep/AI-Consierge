export type AIProvider = 'ChatGPT' | 'Claude' | 'Gemini' | 'Perplexity';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  title: string;
  provider: AIProvider;
  lastMessage: string;
  timestamp: string;
  messages: Message[];
  isBookmarked?: boolean;
}
