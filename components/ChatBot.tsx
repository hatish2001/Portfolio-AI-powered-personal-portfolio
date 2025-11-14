'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Maximize2, Minimize2, Trash2, ArrowUp, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const submitMessage = useCallback(async (messageToSend?: string) => {
    const messageContent = (messageToSend || input).trim();
    if (!messageContent || isLoading) return;

    // Open sidebar if not already open
    if (!isOpen) {
      setIsOpen(true);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    // Collapse input after sending
    setIsInputExpanded(false);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
          conversationHistory: messages,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, isOpen, messages]);

  // Keyboard shortcut: Cmd+I or Ctrl+I
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        if (isOpen) {
          setIsOpen(false);
        } else {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [isOpen]);

  // Listen for custom events to open chat with pre-filled message
  useEffect(() => {
    const handleOpenChat = (e: CustomEvent<{ message: string }>) => {
      const message = e.detail.message;
      setInput(message);
      setIsOpen(true);
      setIsInputExpanded(true);
      
      // Wait for state to update, then auto-submit
      setTimeout(() => {
        inputRef.current?.focus();
        // Auto-submit the message directly
        setTimeout(() => {
          submitMessage(message);
        }, 400);
      }, 200);
    };

    window.addEventListener('openChatWithMessage', handleOpenChat as EventListener);
    return () => window.removeEventListener('openChatWithMessage', handleOpenChat as EventListener);
  }, [submitMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitMessage();
  };

  const handleClear = () => {
    setMessages([]);
  };

  const handleInputFocus = () => {
    // If there are existing messages and sidebar is closed, reopen it
    if (messages.length > 0 && !isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Collapse if input is empty (regardless of messages)
    if (!input.trim()) {
      setIsInputExpanded(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Expand when user starts typing
    if (value) {
      setIsInputExpanded(true);
    } else {
      // Collapse when input is cleared
      setIsInputExpanded(false);
    }
    
    // If there are messages and user starts typing, reopen sidebar
    if (value && messages.length > 0 && !isOpen) {
      setIsOpen(true);
    }
  };

  // Add global style to remove all borders and outlines
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .mintlify-input,
      .mintlify-input *,
      .mintlify-input input,
      .mintlify-input textarea {
        border: none !important;
        outline: none !important;
      }
      
      .mintlify-input:focus,
      .mintlify-input:focus-within,
      .mintlify-input:active,
      .mintlify-input:focus-visible,
      .mintlify-input input:focus,
      .mintlify-input textarea:focus {
        outline: none !important;
        box-shadow: none !important;
        border: none !important;
      }
      
      /* Remove any parent container outlines */
      form:focus,
      form:focus-within,
      form:active,
      form:focus-visible {
        outline: none !important;
        box-shadow: none !important;
        border: none !important;
      }
      
      /* Override any browser defaults */
      input[type="text"]:focus {
        outline: none !important;
        box-shadow: none !important;
        border: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <>
      {/* Fixed Bottom Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pb-6">
        <div className="flex justify-center">
          <form onSubmit={handleSubmit} style={{ outline: 'none' }}>
            <motion.div 
              className="mintlify-input relative flex items-center"
              animate={{
                width: isInputExpanded || input ? '600px' : '320px',
                height: isInputExpanded || input ? '48px' : '40px',
              }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1]
              }}
              style={{
                borderRadius: '8px',
                border: 'none',
                background: '#18181b',
                outline: 'none'
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="Ask a question..."
                disabled={isLoading}
                aria-label="Ask a question..."
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  border: 'none !important',
                  outline: 'none !important',
                  boxShadow: 'none !important',
                  color: '#fff',
                  padding: isInputExpanded || input ? '0 80px 0 20px' : '0 45px 0 16px',
                  fontSize: '16px',
                  transition: 'padding 0.3s ease'
                }}
                className={`${
                  input ? 'text-white' : 'text-[#9ca3af]'
                } placeholder:text-[#9ca3af] placeholder:opacity-100`}
              />
              <div className="absolute right-2 flex items-center gap-2">
                <motion.kbd 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ 
                    opacity: isInputExpanded || input ? 0.7 : 0,
                    width: isInputExpanded || input ? 'auto' : 0
                  }}
                  transition={{ duration: 0.2 }}
                  className="hidden sm:flex items-center gap-1 px-2 py-0.5 text-[11px] text-gray-500 font-medium overflow-hidden"
                >
                  ⌘I
                </motion.kbd>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Send message"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </form>
        </div>
      </div>

      {/* Sidebar Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed top-0 right-0 z-50 bg-[#0b0b0f] border-l border-zinc-800 shadow-2xl flex flex-col ${
                isExpanded ? 'w-full' : 'w-full sm:w-[600px]'
              } h-full`}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#0b0b0f]/95 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Sparkles className="w-6 h-6 text-orange-500" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Assistant</h2>
                    <p className="text-xs text-zinc-400">Ask me about Harishraj</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    title={isExpanded ? 'Minimize' : 'Maximize'}
                  >
                    {isExpanded ? (
                      <Minimize2 className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <Maximize2 className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                  <button
                    onClick={handleClear}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Clear conversation"
                    disabled={messages.length === 0}
                  >
                    <Trash2 className="w-4 h-4 text-zinc-400" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-4">
                      <Sparkles className="w-8 h-8 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Hello! 👋
                    </h3>
                    <p className="text-zinc-400 mb-6 max-w-md">
                      I'm an AI assistant that knows everything about Harishraj Udaya Bhaskar. 
                      Ask me about his experience, projects, skills, or anything else!
                    </p>
                    <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                      {[
                        "What's Harishraj's experience with AI?",
                        "Tell me about his recent projects",
                        "What are his technical skills?",
                        "How can I contact him?"
                      ].map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInput(suggestion);
                            setTimeout(() => inputRef.current?.focus(), 100);
                          }}
                          className="text-left px-4 py-3 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm text-zinc-300 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                              : 'bg-zinc-900 text-zinc-100 border border-zinc-800'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <span className="text-xs opacity-60 mt-1 block">
                            {message.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" />
                            <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-zinc-800 bg-[#0b0b0f]/95 backdrop-blur-sm">
                <form onSubmit={handleSubmit} className="mb-3">
                  <div className="relative flex items-center bg-zinc-900 rounded-lg border border-zinc-800 focus-within:border-orange-500/50 transition-colors">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask a question..."
                      disabled={isLoading}
                      className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-zinc-500 px-4 py-3 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="mr-2 p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Send message"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  </div>
                </form>
                
                <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                  <Sparkles className="w-3 h-3" />
                  <span>Powered by AI • Answers from Harishraj's portfolio</span>
                </div>
                <div className="flex items-center justify-center gap-1 mt-2 text-xs text-zinc-600">
                  <kbd className="px-2 py-1 bg-zinc-900 rounded border border-zinc-800">⌘</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-1 bg-zinc-900 rounded border border-zinc-800">I</kbd>
                  <span className="ml-2">to close chat</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
