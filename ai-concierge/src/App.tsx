import * as React from 'react';
import { useState, useMemo, useEffect, Component, ReactNode } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Send,
  Loader2
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
import { Chat, AIProvider, Message } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { NewChatModal } from './components/NewChatModal';
import { SettingsModal } from './components/SettingsModal';
import { Header } from './components/Header';
import { ChatView } from './components/ChatView';

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
          <Sidebar 
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            connectedProviders={connectedProviders}
            filteredChats={filteredChats}
            selectedChatId={selectedChatId}
            setSelectedChatId={setSelectedChatId}
            setIsNewChatModalOpen={setIsNewChatModalOpen}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <Header 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          selectedChat={selectedChat}
          toggleBookmark={toggleBookmark}
          deleteChat={deleteChat}
          setIsSettingsOpen={setIsSettingsOpen}
          user={user}
          logout={logout}
        />

        <ChatView 
          selectedChat={selectedChat}
          isTyping={isTyping}
        />

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
        <NewChatModal 
          isOpen={isNewChatModalOpen}
          onClose={() => setIsNewChatModalOpen(false)}
          title={newChatTitle}
          setTitle={setNewChatTitle}
          provider={newChatProvider}
          setProvider={setNewChatProvider}
          onSubmit={handleCreateChat}
        />
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          connectedProviders={connectedProviders}
          connectingProvider={connectingProvider}
          handleConnectProvider={handleConnectProvider}
          apiKeys={apiKeys}
          setApiKeys={setApiKeys}
        />
      </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
