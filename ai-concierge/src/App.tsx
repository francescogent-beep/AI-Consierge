import * as React from 'react';
import { useState, useMemo, useEffect, Component, ReactNode } from 'react';
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
  AlertCircle,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  doc, 
  deleteDoc, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logout, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { MOCK_CHATS } from './constants';
import { Chat, AIProvider, Message } from './types';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.errorInfo || '{}');
        if (parsed.error) displayMessage = `Permission Error: ${parsed.error}`;
      } catch {
        displayMessage = this.state.errorInfo || displayMessage;
      }

      return (
        <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Application Error</h2>
          <p className="text-red-600 mb-6 max-w-md">{displayMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
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

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync
  useEffect(() => {
    if (!isAuthReady || !user) {
      setChats([]);
      return;
    }

    const q = query(
      collection(db, 'chats'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChats(prev => {
        const chatList: Chat[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const existingChat = prev.find(c => c.id === doc.id);
          chatList.push({
            ...data,
            id: doc.id,
            timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
            messages: existingChat ? existingChat.messages : []
          } as Chat);
        });
        return chatList;
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedChatId || !user) return;

    const q = query(
      collection(db, 'chats', selectedChatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
        } as Message);
      });

      setChats(prev => prev.map(c => c.id === selectedChatId ? { ...c, messages: msgs } : c));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${selectedChatId}/messages`);
    });

    return () => unsubscribe();
  }, [selectedChatId, user]);

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatTitle.trim() || !user) return;

    try {
      const chatId = Math.random().toString(36).substr(2, 9);
      const chatData = {
        id: chatId,
        userId: user.uid,
        title: newChatTitle,
        provider: newChatProvider,
        lastMessage: 'New conversation started',
        timestamp: serverTimestamp(),
        isBookmarked: false
      };

      await setDoc(doc(db, 'chats', chatId), chatData);
      setSelectedChatId(chatId);
      setIsNewChatModalOpen(false);
      setNewChatTitle('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chats');
    }
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
    if (!newMessage.trim() || !selectedChatId || isTyping || !user) return;

    const userMsg = newMessage;
    setNewMessage('');
    setIsTyping(true);

    try {
      // 1. Save user message to Firestore
      const userMsgId = Math.random().toString(36).substr(2, 9);
      await addDoc(collection(db, 'chats', selectedChatId, 'messages'), {
        id: userMsgId,
        chatId: selectedChatId,
        role: 'user',
        content: userMsg,
        timestamp: serverTimestamp()
      });

      // Update chat last message
      await setDoc(doc(db, 'chats', selectedChatId), {
        lastMessage: userMsg,
        timestamp: serverTimestamp()
      }, { merge: true });

      let aiResponse = "";
      const currentChat = chats.find(c => c.id === selectedChatId);
      
      if (!currentChat) return;

      if (currentChat.provider === 'Gemini') {
        const apiKey = apiKeys.Gemini || process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
          aiResponse = "Please provide a valid Gemini API Key in Settings to enable real responses.";
        } else {
          try {
            const genAI = new GoogleGenAI({ apiKey });
            const history = currentChat.messages.slice(-5).map(m => ({
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }]
            }));

            const response = await genAI.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: history.length > 0 ? history : [{ role: 'user', parts: [{ text: userMsg }] }]
            });
            aiResponse = response.text || "I'm sorry, I couldn't generate a response.";
          } catch (err: any) {
            console.error("Gemini Error:", err);
            aiResponse = `Error from Gemini: ${err.message || "Unknown error"}. Please check your API key.`;
          }
        }
      } else if (currentChat.provider === 'ChatGPT' && apiKeys.ChatGPT.trim()) {
        try {
          const response = await fetch('/api/ai/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: userMsg,
              apiKey: apiKeys.ChatGPT.trim(),
              history: currentChat.messages.slice(-5)
            })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          aiResponse = data.text;
        } catch (err: any) {
          console.error("OpenAI Error:", err);
          aiResponse = `Error from OpenAI: ${err.message || "Unknown error"}. Please check your API key.`;
        }
      } else if (currentChat.provider === 'Claude' && apiKeys.Claude.trim()) {
        try {
          const response = await fetch('/api/ai/anthropic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: userMsg,
              apiKey: apiKeys.Claude.trim(),
              history: currentChat.messages.slice(-5)
            })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          aiResponse = data.text;
        } catch (err: any) {
          console.error("Anthropic Error:", err);
          aiResponse = `Error from Anthropic: ${err.message || "Unknown error"}. Please check your API key.`;
        }
      } else if (currentChat.provider === 'Perplexity' && apiKeys.Perplexity.trim()) {
        try {
          const response = await fetch('/api/ai/perplexity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: userMsg,
              apiKey: apiKeys.Perplexity.trim(),
              history: currentChat.messages.slice(-5)
            })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          aiResponse = data.text;
        } catch (err: any) {
          console.error("Perplexity Error:", err);
          aiResponse = `Error from Perplexity: ${err.message || "Unknown error"}. Please check your API key.`;
        }
      } else if (connectedProviders[currentChat.provider] || apiKeys[currentChat.provider]) {
        // "Functional" mock response for connected providers
        await new Promise(resolve => setTimeout(resolve, 1500));
        aiResponse = `[${currentChat.provider} Connected]: I've received your message: "${userMsg}". Since you've successfully connected your ${currentChat.provider} account, I can now process your request using your personal context and history. (Note: This is a functional demo response acknowledging your connection).`;
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
        aiResponse = `[Simulated ${currentChat.provider} Response]: I've received your message: "${userMsg}". To enable real responses from ${currentChat.provider}, please log in or provide an API key in the Settings menu.`;
      }

      // 2. Save AI response to Firestore
      const aiMsgId = Math.random().toString(36).substr(2, 9);
      await addDoc(collection(db, 'chats', selectedChatId, 'messages'), {
        id: aiMsgId,
        chatId: selectedChatId,
        role: 'assistant',
        content: aiResponse,
        timestamp: serverTimestamp()
      });

      await setDoc(doc(db, 'chats', selectedChatId), {
        lastMessage: aiResponse,
        timestamp: serverTimestamp()
      }, { merge: true });

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${selectedChatId}`);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleBookmark = async (id: string) => {
    const chat = chats.find(c => c.id === id);
    if (!chat) return;
    try {
      await setDoc(doc(db, 'chats', id), { isBookmarked: !chat.isBookmarked }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${id}`);
    }
  };

  const deleteChat = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'chats', id));
      if (selectedChatId === id) setSelectedChatId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chats/${id}`);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        // In a real app, you'd refresh the session or fetch user data
        // For this demo, we'll just mark the provider as connected
        if (connectingProvider) {
          setConnectedProviders(prev => ({ ...prev, [connectingProvider]: true }));
          setConnectingProvider(null);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [connectingProvider]);

  const handleConnectProvider = async (p: AIProvider) => {
    if (connectedProviders[p]) {
      setConnectedProviders({ ...connectedProviders, [p]: false });
      return;
    }

    setConnectingProvider(p);
    
    try {
      const origin = window.location.origin;
      const response = await fetch(`/api/auth/url?provider=${p}&origin=${encodeURIComponent(origin)}`);
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      window.open(
        url,
        `auth_${p}`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
      );
    } catch (error) {
      console.error("Auth error:", error);
      setConnectingProvider(null);
      alert("Failed to initiate login. Please try again.");
    }
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-4">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-200">
          <MessageSquare className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome to AI Organizer</h1>
        <p className="text-slate-500 mb-8 text-center max-w-sm">
          Your unified workspace for all AI conversations. Sign in to start organizing.
        </p>
        <button 
          onClick={loginWithGoogle}
          className="flex items-center gap-3 px-8 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-[#F8F9FA] text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <>
            {/* Mobile Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside 
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed lg:relative inset-y-0 left-0 w-[280px] sm:w-[320px] bg-white border-r border-slate-200 flex flex-col h-full z-50 lg:z-20 shadow-2xl lg:shadow-none"
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
    </>
  )}
</AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title={isSidebarOpen ? "Close Menu" : "Open Menu"}
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
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
            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
              ) : (
                user.displayName?.charAt(0) || 'U'
              )}
            </div>
            <button 
              onClick={logout}
              className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
              title="Sign Out"
            >
              <X className="w-5 h-5" />
            </button>
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
