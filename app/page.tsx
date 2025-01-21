"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Message from './components/Message';
import TypingIndicator from './components/TypingIndicator';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/toaster"; // Import `toast` directly
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type MessageType = {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
};

type ApiResponse = {
  message: string;
  conversationId: string;
  timestamp: string;
} | {
  error: string;
  code?: string;
  timestamp: string;
};

// Add a constant for user ID management
const USER_ID = 'user-123'; // In a real app, this should come from authentication

// Add debounce utility to prevent rapid-fire submissions
const useDebounce = (callback: (...args: any[]) => void, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
};

export default function Home() {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageSound = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Initialize audio on mount
  useEffect(() => {
    messageSound.current = new Audio('/message.mp3');
    return () => {
      if (messageSound.current) {
        messageSound.current.pause();
        messageSound.current = null;
      }
    };
  }, []);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Play message sound
  const playMessageSound = useCallback(() => {
    if (messageSound.current) {
      messageSound.current.currentTime = 0;
      messageSound.current.play().catch(() => {});
    }
  }, []);

  // Add message history persistence
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatHistory');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages).map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
  }, [messages]);

  // Enhanced submit handler with error retry
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || loading) return;

      const userMessage: MessageType = {
        sender: 'user',
        text: input.trim(),
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setLoading(true);
      playMessageSound();

      let retries = 2;
      while (retries >= 0) {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: input, userId: USER_ID }),
          });

          const data: ApiResponse = await response.json();

          if (!response.ok) {
            const errorData = data as { error: string };
            throw new Error(errorData.error || 'Server error');
          }

          if ('message' in data) {
            const botMessage: MessageType = {
              sender: 'bot',
              text: data.message,
              timestamp: new Date(data.timestamp),
            };
            setMessages(prev => [...prev, botMessage]);
            playMessageSound();
            break;
          }
        } catch (error) {
          console.error('Error sending request:', error);
          if (retries === 0) {
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to connect to the server. Please try again later."
            });
          }
          retries--;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
        }
      }
      setLoading(false);
    },
    [input, loading, playMessageSound, toast]
  );

  // Add clear chat functionality
  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem('chatHistory');
  }, []);

  // Memoize messages to avoid unnecessary re-renders
  const messageList = useMemo(
    () =>
      messages.map((message, index) => (
        <Message key={`${message.timestamp.getTime()}-${index}`} message={message} />
      )),
    [messages]
  );

  return (
    <main className="flex min-h-screen bg-gradient-to-br from-background to-muted p-4 sm:p-6">
      <div className="w-full max-w-2xl mx-auto bg-card rounded-xl shadow-xl overflow-hidden flex flex-col">
        <div className="bg-primary p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary-foreground">AI Chatbot for 2025</h1>
            <p className="text-sm text-primary-foreground/80">Develop by: Gemuel Sampayan</p>
          </div>
          <Button
            variant="ghost"
            className="text-primary-foreground"
            onClick={clearChat}
            title="Clear chat history"
          >
            Clear
          </Button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <AnimatePresence initial={false}>
            {messageList}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
              >
                <TypingIndicator />
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>
        <form onSubmit={handleSubmit} className="border-t p-4 bg-card">
          <div className="flex gap-2">
            <Input
              type="text"
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1"
              aria-label="Type your message"
            />
            <Button
              type="submit"
              disabled={loading}
              size="icon"
              aria-label={loading ? "Sending message" : "Send message"}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  ⟳
                </motion.div>
              ) : (
                "Send"
              )}
            </Button>
          </div>
        </form>
      </div>
      <Toaster /> {/* Render the Toaster component */}
    </main>
  );
}