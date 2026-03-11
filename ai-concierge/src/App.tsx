import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  MessageSquare, 
  Bookmark, 
  Settings, 
  Filter, 
  MoreVertical, 
  Send,
  ChevronRight,
  LayoutGrid,
  Zap,
  Cpu,
  Globe,
  Star,
  Trash2,
  Menu,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { MOCK_CHATS } from './constants';
import { Chat, AIProvider } from './types';

const PROVIDER_ICONS: Record<AIProvider, React.ReactNode> = {
  ChatGPT: <Zap className="w-4 h-4 text-emerald-500" />,
  Claude: <Cpu className="w-4 h-4 text-orange-500" />,
  Gemini: <Star className="w-4 h-4 text-blue-500" />,
  Perplexity: <Globe className="w-4 h-4 text-cyan-500" />,
};

const PROVIDER_COLORS: Record<AIProvider, string> = {
  ChatGPT: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Claude: 'bg-orange-50 text-orange-700 border-orange-100',
  Gemini: 'bg-blue-50 text-blue-700 border-blue-100',
  Perplexity: 'bg-cyan-50 text-cyan-700 border-cyan-100',
};

export default function App() {
  const [chats, setChats] = useState<Chat[]>(MOCK_CHATS);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(MOCK_CHATS[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<AIProvider | 'All'>('All');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<AIProvider | null>(null);

  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [newChatProvider, setNewChatProvider] = useState<AIProvider>('ChatGPT');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState<Record<AIProvider, boolean>>({
    ChatGPT: true,
    Claude: false,
    Gemini: false,
    Perplexity: false
  });
  const [apiKeys, setApiKeys] = useState({
    ChatGPT: '',
    Claude: '',
    Gemini: '',
    Perplexity: ''
  });

  const handleCreateChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatTitle.trim()) return;

    const newChat: Chat = {
      id: Math.random().toString(36).substr(2, 9),
      title: newChatTitle,
      provider: newChatProvider,
      lastMessage: 'New conversation started',
      timestamp: new Date().toISOString(),
      messages: [],
      isBookmarked: false
    };

    setChats([newChat, ...chats]);
    setSelectedChatId(newChat.id);
    setIsNewChatModalOpen(false);
    setNewChatTitle('');
  };

  const filteredChats = useMemo(() => {
    return chats.filter(chat => {
      const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'All' || chat.provider === activeFilter;
      return matchesSearch && matchesFilter;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [chats, searchQuery, activeFilter]);

  const selectedChat = useMemo(() => 
    chats.find(c => c.id === selectedChatId), 
    [chats, selectedChatId]
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChatId || isTyping) return;

    const userMsg = newMessage;
    setNewMessage('');
    setIsTyping(true);

    // 1. Add user message to UI
    const updatedWithUser = chats.map(chat => {
      if (chat.id === selectedChatId) {
        return {
          ...chat,
          timestamp: new Date().toISOString(),
          lastMessage: userMsg,
          messages: [
            ...chat.messages,
            {
              id: Math.random().toString(36).substr(2, 9),
              role: 'user' as const,
              content: userMsg,
              timestamp: new Date().toISOString()
            }
          ]
        };
      }
      return chat;
    });
    setChats(updatedWithUser);

    try {
      let aiResponse = "";
      const currentChat = updatedWithUser.find(c => c.id === selectedChatId);
      
      if (!currentChat) return;

      if (currentChat.provider === 'Gemini') {
        // Real Gemini Integration
        const apiKey = apiKeys.Gemini || process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
          aiResponse = "Please provide a valid Gemini API Key in Settings to enable real responses.";
        } else {
          const genAI = new GoogleGenAI({ apiKey });
          
          // Simple context: last 5 messages
          const history = currentChat.messages.slice(-5).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          }));

          const response = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: history.length > 0 ? history : [{ role: 'user', parts: [{ text: userMsg }] }]
          });
          aiResponse = response.text || "I'm sorry, I couldn't generate a response.";
        }
      } else {
        // Simulated response for other providers
        await new Promise(resolve => setTimeout(resolve, 1500));
        aiResponse = `[Simulated ${currentChat.provider} Response]: I've received your message: "${userMsg}". In a production environment with a valid ${currentChat.provider} API key or session, I would provide a real response here.`;
      }

      // 2. Add AI response to UI
      setChats(prevChats => prevChats.map(chat => {
        if (chat.id === selectedChatId) {
          return {
            ...chat,
            timestamp: new Date().toISOString(),
            lastMessage: aiResponse,
            messages: [
              ...chat.messages,
              {
                id: Math.random().toString(36).substr(2, 9),
                role: 'assistant' as const,
                content: aiResponse,
                timestamp: new Date().toISOString()
              }
            ]
          };
        }
        return chat;
      }));
    } catch (error) {
      console.error("AI Error:", error);
      const errorMsg = "Error connecting to AI. Please check your API key and connection.";
      setChats(prevChats => prevChats.map(chat => {
        if (chat.id === selectedChatId) {
          return {
            ...chat,
            messages: [...chat.messages, {
              id: 'err',
              role: 'assistant',
              content: errorMsg,
              timestamp: new Date().toISOString()
            }]
          };
        }
        return chat;
      }));
    } finally {
      setIsTyping(false);
    }
  };

  const toggleBookmark = (id: string) => {
    setChats(chats.map(c => c.id === id ? { ...c, isBookmarked: !c.isBookmarked } : c));
  };

  const deleteChat = (id: string) => {
    setChats(chats.filter(c => c.id !== id));
    if (selectedChatId === id) setSelectedChatId(null);
  };

  const handleConnectProvider = async (p: AIProvider) => {
    if (connectedProviders[p]) {
      setConnectedProviders({ ...connectedProviders, [p]: false });
      return;
    }

    setConnectingProvider(p);
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    setConnectedProviders({ ...connectedProviders, [p]: true });
    setConnectingProvider(null);
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 320 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-white border-r border-slate-200 flex flex-col h-full relative z-20"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">AI Organizer</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 hover:bg-slate-100 rounded-md lg:hidden"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
            {['All', 'ChatGPT', 'Claude', 'Gemini', 'Perplexity'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeFilter === filter 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter !== 'All' && (
                  <div className={`w-1.5 h-1.5 rounded-full ${connectedProviders[filter as AIProvider] ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                )}
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Search className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">No chats found</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`w-full text-left p-3 rounded-xl transition-all group relative ${
                  selectedChatId === chat.id 
                    ? 'bg-indigo-50 border-indigo-100' 
                    : 'hover:bg-slate-50 border-transparent'
                } border`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {PROVIDER_ICONS[chat.provider]}
                    <span className="font-semibold text-sm truncate">{chat.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                    {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-1 pr-4">
                  {chat.lastMessage}
                </p>
                {chat.isBookmarked && (
                  <Bookmark className="absolute right-2 bottom-3 w-3 h-3 text-indigo-400 fill-indigo-400" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => setIsNewChatModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-indigo-200"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
            )}
            {selectedChat && (
              <div className="flex items-center gap-3">
                <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${PROVIDER_COLORS[selectedChat.provider]}`}>
                  {selectedChat.provider}
                </div>
                <h2 className="font-bold text-slate-800 truncate max-w-[200px] sm:max-w-md">
                  {selectedChat.title}
                </h2>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedChat && (
              <>
                <button 
                  onClick={() => toggleBookmark(selectedChat.id)}
                  className={`p-2 rounded-lg transition-colors ${selectedChat.isBookmarked ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100 text-slate-500'}`}
                >
                  <Bookmark className={`w-5 h-5 ${selectedChat.isBookmarked ? 'fill-current' : ''}`} />
                </button>
                <button 
                  onClick={() => deleteChat(selectedChat.id)}
                  className="p-2 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
            <div className="w-px h-6 bg-slate-200 mx-2" />
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
              FG
            </div>
          </div>
        </header>

        {/* Chat View */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 bg-[#F8F9FA]">
          {selectedChat ? (
            <>
              <AnimatePresence mode="popLayout">
                {selectedChat.messages.map((msg, idx) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-4 shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white border border-slate-200 rounded-tl-none'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <div className={`mt-2 text-[10px] ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                      <div className="flex gap-1">
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                      </div>
                      <span className="text-xs text-slate-400 italic">Thinking...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="h-20" /> {/* Spacer for input */}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">Select a conversation</h3>
              <p className="text-sm">Choose a chat from the sidebar to start organizing</p>
            </div>
          )}
        </div>

        {/* Input Area */}
        {selectedChat && (
          <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-8 bg-gradient-to-t from-[#F8F9FA] via-[#F8F9FA] to-transparent">
            <form 
              onSubmit={handleSendMessage}
              className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-lg flex items-center p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
            >
              <button type="button" className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                <Plus className="w-5 h-5" />
              </button>
              <input 
                type="text"
                placeholder={`Message ${selectedChat.provider}...`}
                className="flex-1 bg-transparent border-none outline-none px-4 text-sm"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl transition-all shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-10 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* New Chat Modal */}
      <AnimatePresence>
        {isNewChatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-xl">New Conversation</h3>
                <button 
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleCreateChat} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Conversation Title
                  </label>
                  <input 
                    autoFocus
                    type="text"
                    placeholder="e.g. Project Brainstorming"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    value={newChatTitle}
                    onChange={(e) => setNewChatTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Select AI Provider
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['ChatGPT', 'Claude', 'Gemini', 'Perplexity'] as AIProvider[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewChatProvider(p)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${
                          newChatProvider === p 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-500/10' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200'
                        }`}
                      >
                        {PROVIDER_ICONS[p]}
                        <span className="font-medium">{p}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={!newChatTitle.trim()}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200"
                  >
                    Start Chatting
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-xl">Settings & Integrations</h3>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-4">Platform Connections</h4>
                  <p className="text-xs text-slate-500 mb-4">
                    Connect your AI accounts to sync conversations and data.
                  </p>
                  <div className="space-y-3">
                    {(['ChatGPT', 'Claude', 'Gemini', 'Perplexity'] as AIProvider[]).map((p) => (
                      <div key={p} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            {PROVIDER_ICONS[p]}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800">{p}</div>
                            <div className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full ${connectedProviders[p] ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                {connectedProviders[p] ? 'Connected' : 'Not Linked'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleConnectProvider(p)}
                          disabled={connectingProvider === p}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                            connectedProviders[p] 
                              ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100' 
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                          }`}
                        >
                          {connectingProvider === p ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            connectedProviders[p] ? 'Disconnect' : 'Log In'
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-4">Advanced: API Keys</h4>
                  <div className="space-y-3">
                    {(['ChatGPT', 'Claude', 'Gemini', 'Perplexity'] as AIProvider[]).map((p) => (
                      <div key={p} className="flex items-center gap-4">
                        <div className="w-24 shrink-0 flex items-center gap-2">
                          {PROVIDER_ICONS[p]}
                          <span className="text-xs font-semibold">{p}</span>
                        </div>
                        <div className="flex-1 relative">
                          <input 
                            type="password"
                            placeholder={`Enter ${p} API Key`}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] focus:ring-2 focus:ring-indigo-500/20 outline-none pr-16"
                            value={apiKeys[p]}
                            onChange={(e) => setApiKeys({ ...apiKeys, [p]: e.target.value })}
                          />
                          {apiKeys[p] && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[8px] font-bold">
                              <CheckCircle2 className="w-2 h-2" />
                              Linked
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <h4 className="text-xs font-bold text-indigo-800 mb-1 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> How it works
                  </h4>
                  <p className="text-[11px] text-indigo-700 leading-relaxed">
                    Once keys are provided, AI Concierge uses official SDKs to fetch your conversation history and send new messages directly to the AI providers. Your data never touches our servers.
                  </p>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
