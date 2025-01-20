'use client';
import { useState } from 'react';
import Message from './components/Message';

export default function Home() {
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { sender: 'user', text: input }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, { sender: 'bot', text: data.message }]);
      } else {
        console.error("Failed to get response")
        setMessages((prev) => [...prev, { sender: 'bot', text: 'Failed to get response, please try again.' }])
      }
    }
    catch (e) {
      console.error("Error sending request", e);
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Failed to get response, please try again.' }])
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-start min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-8">AI Chatbot</h1>
      <div className="w-full max-w-2xl bg-white shadow-md rounded-lg p-4 flex-1 flex flex-col overflow-y-auto" style={{ maxHeight: '600px' }}>
        {messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}
        {loading && <div className="animate-pulse text-gray-500 self-start">Loading...</div>}
      </div>
      <form onSubmit={handleSubmit} className="w-full max-w-2xl mt-4 flex">
        <input
          type="text"
          className="flex-1 border rounded-l-md px-3 py-2 focus:outline-none focus:border-blue-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none"
          disabled={loading}
        >
          Send
        </button>
      </form>
    </main>
  );
}