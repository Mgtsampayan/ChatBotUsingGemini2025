"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Message from './components/Message';
import TypingIndicator from './components/TypingIndicator';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/toaster"; // Import `toast` directly
import { Toast } from "@/components/ui/toast"; // Import `useToast` directly
import { motion, AnimatePresence } from "framer-motion";

type MessageType = {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
};

type ApiResponse = { message: string } | { error: string };

export default function Home() {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageSound = useRef<HTMLAudioElement | null>(null);

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

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;

      const userMessage: MessageType = {
        sender: 'user',
        text: input.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setLoading(true);
      playMessageSound();

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: input, userId: 'user-123' }),
        });

        const data: ApiResponse = await response.json();

        if (response.ok) {
          const botMessage: MessageType = {
            sender: 'bot',
            text: (data as { message: string }).message,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, botMessage]);
          playMessageSound();
        } else {
          const errorMessage = (data as { error: string }).error || 'Failed to get response, please try again.';
          Toast({
            variant: "destructive",
            title: "Error",
            description: errorMessage
          });
        }
      } catch (error) {
        console.error('Error sending request:', error);
        Toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to get response, please try again.",
        });
      } finally {
        setLoading(false);
      }
    },
    [input, playMessageSound]
  );

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
        <div className="bg-primary p-6">
          <h1 className="text-2xl font-bold text-primary-foreground">AI Chatbot</h1>
          <p className="text-sm text-primary-foreground/80">Ask me anything!</p>
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