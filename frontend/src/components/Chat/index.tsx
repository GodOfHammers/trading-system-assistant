import { useState, useRef, useEffect } from 'react';
import { Sun, Share, Send } from 'lucide-react';

interface Message {
  type: 'user' | 'assistant';
  content: string;
  metadata?: {
    type?: 'chart' | 'text';
    title?: string;
    description?: string;
  };
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('claude-3-sonnet-20240229');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:8000/ws');
    
    websocket.onopen = () => {
      console.log('Connected to WebSocket');
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        content: data.response,
        metadata: data.metadata 
      }]);
      setIsLoading(false);
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    setWs(websocket);
    
    return () => {
      websocket.close();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { 
      type: 'user', 
      content: userMessage,
      metadata: { type: 'text' }
    }]);
    setIsLoading(true);

    try {
      ws?.send(JSON.stringify({
        message: userMessage,
        model: selectedModel
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-white flex">
      {/* Left Sidebar */}
      <div className="w-[300px] border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <h1 className="font-bold text-xl tracking-tight">ANTHROPIC</h1>
        </div>
        
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">AI</span>
            </div>
            <div>
              <h2 className="font-semibold">Trading Assistant</h2>
              <p className="text-sm text-gray-500">Powered by Claude</p>
            </div>
          </div>
          
          <div className="relative">
            <select 
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-2 pr-8 rounded-lg border border-gray-200 bg-white text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="claude-3-opus-20240229">Claude 3 Opus</option>
              <option value="claude-3-sonnet-20240229">Claude 3.5 Sonnet</option>
              <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
            </select>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((message, index) => (
            <div 
              key={index}
              className={`p-3 mb-2 rounded-lg cursor-pointer hover:bg-gray-100 text-sm ${
                message.type === 'user' ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              {message.content.slice(0, 50)}...
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-semibold">Analysis & Visualizations</h2>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Share size={20} />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Sun size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 space-y-6">
            {messages.map((message, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-8 h-8 shrink-0 rounded-full bg-gray-900 flex items-center justify-center">
                  <span className="text-white text-sm">
                    {message.type === 'user' ? 'U' : 'AI'}
                  </span>
                </div>
                <div className="flex-1">
                  {message.type === 'assistant' && message.metadata?.type === 'chart' && (
                    <div className="mb-4 p-6 border rounded-xl bg-white">
                      <h3 className="font-semibold mb-1">{message.metadata.title}</h3>
                      <p className="text-sm text-gray-600 mb-4">{message.metadata.description}</p>
                      {/* Chart would be rendered here */}
                    </div>
                  )}
                  <div className={`p-4 rounded-xl ${
                    message.type === 'user' 
                      ? 'bg-gray-100' 
                      : 'bg-white border border-gray-200'
                  }`}>
                    <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 shrink-0 rounded-full bg-gray-900 flex items-center justify-center">
                  <span className="text-white text-sm">AI</span>
                </div>
                <div className="flex-1 p-4 rounded-xl border border-gray-200">
                  <p className="text-gray-500">Thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Claude..."
              className="w-full p-4 pr-20 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 focus:outline-none disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App