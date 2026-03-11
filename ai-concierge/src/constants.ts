import { Chat } from './types';

export const MOCK_CHATS: Chat[] = [
  {
    id: '1',
    title: 'React Hooks Best Practices',
    provider: 'ChatGPT',
    lastMessage: 'Sure, I can help you with that. React hooks like useEffect...',
    timestamp: '2026-03-11T10:30:00Z',
    messages: [
      { id: 'm1', role: 'user', content: 'What are the best practices for React hooks?', timestamp: '2026-03-11T10:29:00Z' },
      { id: 'm2', role: 'assistant', content: 'Sure, I can help you with that. React hooks like useEffect should always have a stable dependency array...', timestamp: '2026-03-11T10:30:00Z' }
    ],
    isBookmarked: true
  },
  {
    id: '2',
    title: 'Business Strategy for SaaS',
    provider: 'Claude',
    lastMessage: 'Let\'s look at the freemium model and conversion rates.',
    timestamp: '2026-03-10T15:45:00Z',
    messages: [
      { id: 'm3', role: 'user', content: 'How should I structure my SaaS pricing?', timestamp: '2026-03-10T15:40:00Z' },
      { id: 'm4', role: 'assistant', content: 'Let\'s look at the freemium model and conversion rates. A typical conversion rate is 2-5%...', timestamp: '2026-03-10T15:45:00Z' }
    ]
  },
  {
    id: '3',
    title: 'Quantum Computing Explained',
    provider: 'Gemini',
    lastMessage: 'Quantum entanglement is a phenomenon where particles...',
    timestamp: '2026-03-09T09:12:00Z',
    messages: [
      { id: 'm5', role: 'user', content: 'Explain quantum entanglement simply.', timestamp: '2026-03-09T09:10:00Z' },
      { id: 'm6', role: 'assistant', content: 'Quantum entanglement is a phenomenon where particles become connected in such a way that the state of one...', timestamp: '2026-03-09T09:12:00Z' }
    ]
  },
  {
    id: '4',
    title: 'Latest AI News March 2026',
    provider: 'Perplexity',
    lastMessage: 'Several new models were released this week, including...',
    timestamp: '2026-03-11T08:00:00Z',
    messages: [
      { id: 'm7', role: 'user', content: 'What\'s the latest in AI this week?', timestamp: '2026-03-11T07:55:00Z' },
      { id: 'm8', role: 'assistant', content: 'Several new models were released this week, including Gemini 3 and updates to Claude...', timestamp: '2026-03-11T08:00:00Z' }
    ]
  },
  {
    id: '5',
    title: 'Tailwind CSS v4 Features',
    provider: 'ChatGPT',
    lastMessage: 'Tailwind v4 introduces a new engine and better performance.',
    timestamp: '2026-03-08T14:20:00Z',
    messages: [
      { id: 'm9', role: 'user', content: 'What\'s new in Tailwind v4?', timestamp: '2026-03-08T14:15:00Z' },
      { id: 'm10', role: 'assistant', content: 'Tailwind v4 introduces a new engine and better performance, along with simplified configuration...', timestamp: '2026-03-08T14:20:00Z' }
    ]
  }
];
