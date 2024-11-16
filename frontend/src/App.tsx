import { useState, useRef, useEffect } from 'react';
import { 
  Sun, Moon, Share, Send, Plus, Settings,
  MessageSquare, Download, Trash, AlertCircle,
  BarChart2, RefreshCw, ChevronDown, Share2
} from 'lucide-react';
import { useTheme } from './contexts/ThemeContext';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    type?: 'chart' | 'text';
    title?: string;
    description?: string;
    model?: string;
    tokens?: number;
  };
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  model: string;
}

interface RetryState {
  count: number;
  lastMessage: string | null;
  isRetrying: boolean;
}

function App() {
  const { theme, toggleTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('conversations');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('claude-3-sonnet-20240229');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [retryState, setRetryState] = useState<RetryState>({
    count: 0,
    lastMessage: null,
    isRetrying: false
  });
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const maxRetries = 3;

  // Save conversations to localStorage
  useEffect(() => {
    localStorage.setItem('conversations', JSON.stringify(conversations));
  }, [conversations]);

  const initializeWebSocket = () => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    
    ws.onopen = () => {
      console.log('Connected to WebSocket');
      setConnectionStatus('connected');
      setRetryState(prev => ({ ...prev, count: 0, isRetrying: false }));
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setConnectionStatus('disconnected');
      if (retryState.count < maxRetries) {
        setTimeout(() => {
          setRetryState(prev => ({
            ...prev,
            count: prev.count + 1,
            isRetrying: true
          }));
          const newWs = initializeWebSocket();
          setWs(newWs);
        }, 3000);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('disconnected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        console.error('Error from server:', data.error);
        if (retryState.count < maxRetries && retryState.lastMessage) {
          setTimeout(() => retryMessage(), 3000);
        }
        return;
      }

      if (currentConversation) {
        setConversations(prev => prev.map(conv => {
          if (conv.id === currentConversation) {
            return {
              ...conv,
              messages: [...conv.messages, {
                id: Date.now().toString(),
                type: 'assistant',
                content: data.response,
                timestamp: new Date(),
                metadata: {
                  ...data.metadata,
                  model: selectedModel
                }
              }]
            };
          }
          return conv;
        }));
      }
      setIsLoading(false);
    };

    return ws;
  };

  // Initialize WebSocket connection
  useEffect(() => {
    const ws = initializeWebSocket();
    setWs(ws);
    
    return () => {
      ws.close();
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations]);

  const sendMessage = async (content: string, model: string = selectedModel) => {
    if (!ws || !currentConversation) return;

    try {
      ws.send(JSON.stringify({
        message: content,
        model: model,
        conversationId: currentConversation
      }));
      setRetryState(prev => ({ ...prev, lastMessage: content }));
    } catch (error) {
      throw new Error('Failed to send message');
    }
  };

  const retryMessage = async () => {
    if (!retryState.lastMessage || retryState.count >= maxRetries) return;

    setRetryState(prev => ({ ...prev, isRetrying: true }));
    try {
      await sendMessage(retryState.lastMessage);
    } catch (error) {
      setRetryState(prev => ({
        ...prev,
        count: prev.count + 1,
        isRetrying: false
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !ws || !currentConversation) return;

    const newMessage = {
        id: Date.now().toString(),
        type: 'user' as const,
        content: input,
        timestamp: new Date()
    };

    // Update the conversations state instead of using setMessages
    setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversation) {
            return {
                ...conv,
                messages: [...conv.messages, newMessage]
            };
        }
        return conv;
    }));

    const userMessage = input;
    setInput('');
    setIsLoading(true);

    try {
        await sendMessage(userMessage);
    } catch (error) {
        console.error('Error sending message:', error);
        setIsLoading(false);
    }
  };

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
      model: selectedModel
    };
    setConversations(prev => [...prev, newConversation]);
    setCurrentConversation(newConversation.id);
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    if (currentConversation === id) {
      setCurrentConversation(null);
    }
  };

  const handleModelChange = async (model: string, messageId: string) => {
    if (!currentConversation) return;
    
    setSelectedModel(model);
    setShowModelSelector(false);
    setIsLoading(true);

    const conv = conversations.find(c => c.id === currentConversation);
    if (!conv) return;

    const messageIndex = conv.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const messageToRetry = conv.messages[messageIndex];
    
    try {
      await sendMessage(messageToRetry.content, model);
      setConversations(prev => prev.map(c => {
        if (c.id === currentConversation) {
          const messages = [...c.messages];
          messages[messageIndex] = {
            ...messages[messageIndex],
            metadata: { ...messages[messageIndex].metadata, model }
          };
          return { ...c, messages };
        }
        return c;
      }));
    } catch (error) {
      console.error('Error regenerating response:', error);
    }
  };

  const exportConversation = (conv: Conversation) => {
    const exportData = {
      title: conv.title,
      model: conv.model,
      createdAt: conv.createdAt,
      messages: conv.messages
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conv.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex">
      {/* Left Sidebar */}
      <div className="w-[300px] border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h1 className="font-bold text-xl tracking-tight dark:text-white">ANTHROPIC</h1>
          <button
            onClick={createNewConversation}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <Plus className="w-5 h-5 dark:text-white" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gray-900 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">AI</span>
            </div>
            <div>
              <h2 className="font-semibold dark:text-white">Trading Assistant</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Powered by Claude</p>
            </div>
          </div>
          
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm dark:text-white"
          >
            <option value="claude-3-opus-20240229">Claude 3 Opus</option>
            <option value="claude-3-sonnet-20240229">Claude 3.5 Sonnet</option>
            <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`p-3 mx-2 mb-2 flex items-center justify-between rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer ${
                currentConversation === conv.id ? 'bg-gray-100 dark:bg-gray-800' : ''
              }`}
              onClick={() => setCurrentConversation(conv.id)}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm dark:text-gray-300">{conv.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportConversation(conv);
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  <Trash className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Settings section */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button className="w-full p-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="font-semibold dark:text-white">Analysis & Visualizations</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 space-y-6">
            {currentConversation && conversations.find(c => c.id === currentConversation)?.messages.map((message, index) => (
              <div key={message.id} className="flex gap-3">
                <div className="w-8 h-8 shrink-0 rounded-full bg-gray-900 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-white text-sm">
                    {message.type === 'user' ? 'U' : 'AI'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className={`p-4 rounded-xl ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.metadata?.tokens && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {message.metadata.tokens} tokens • {message.metadata.model}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 shrink-0 rounded-full bg-gray-900 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-white text-sm">AI</span>
                </div>
                <div className="flex-1 p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
                  <p className="text-gray-500 dark:text-gray-400">Thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Claude..."
              className="w-full p-4 pr-20 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
              disabled={isLoading || !currentConversation}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !currentConversation}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
          {!currentConversation && (
            <p className="text-center mt-2 text-sm text-gray-500 dark:text-gray-400">
              Create a new conversation to start chatting
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;