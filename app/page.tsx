'use client';
import { useState } from 'react';
import Message from './components/Message';

// Define types for messages and API response
type MessageType = { sender: 'user' | 'bot'; text: string };
type ApiResponse = { message: string } | { error: string };

export default function Home() {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message to the chat
    setMessages((prev) => [...prev, { sender: 'user', text: input }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, userId: 'user-123' }), // Add a userId for session management
      });

      const data: ApiResponse = await response.json();

      if (response.ok) {
        // Add bot response to the chat
        setMessages((prev) => [...prev, { sender: 'bot', text: (data as { message: string }).message }]);
      } else {
        // Handle API errors
        const errorMessage = (data as { error: string }).error || 'Failed to get response, please try again.';
        setMessages((prev) => [...prev, { sender: 'bot', text: errorMessage }]);
      }
    } catch (error) {
      console.error('Error sending request:', error);
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Failed to get response, please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-start min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden flex flex-col h-[80vh]">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <h1 className="text-2xl font-bold text-white">AI Chatbot</h1>
          <p className="text-sm text-blue-100">Ask me anything!</p>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto">
          {messages.map((message, index) => (
            <Message key={index} message={message} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[70%] p-3 bg-gray-100 text-gray-800 rounded-lg rounded-bl-none shadow-sm">
                <p className="text-sm">Loading...</p>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
              aria-label="Type your message"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
              disabled={loading}
              aria-label="Send message"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}