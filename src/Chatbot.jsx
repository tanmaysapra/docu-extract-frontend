// src/Chatbot.jsx
import { useState } from 'react';
import axios from 'axios';

// --- CONFIGURATION ---
// Paste your API's Invoke URL (from the 'dev' stage)
const API_ENDPOINT = "https://1pnszjn9th.execute-api.us-east-1.amazonaws.com"; 
// ---------------------

export const Chatbot = () => {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hi! Ask me anything about your processed documents.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    try {
      // Send the user's question to the new /chat endpoint
      const response = await axios.post(
        `${API_ENDPOINT}/chat`,
        { userQuestion: input },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const aiMessage = { role: 'ai', content: response.data.answer };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("Error calling chat API:", error);
      const errorMessage = { role: 'ai', content: 'Sorry, I ran into an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-gray-800 p-6 rounded-lg shadow-lg mb-10">
      <h2 className="text-2xl font-semibold mb-4 text-center">AI Finance Assistant</h2>
      
      {/* Message Window */}
      <div className="h-64 overflow-y-auto bg-gray-900 rounded-md p-4 mb-4">
        {messages.map((msg, index) => (
          <div key={index} className={`mb-3 p-3 rounded-lg ${
            msg.role === 'ai' ? 'bg-blue-900 text-white' : 'bg-gray-700 text-white ml-10'
          }`}>
            <p>{msg.content}</p>
          </div>
        ))}
        {isLoading && (
          <div className="mb-3 p-3 rounded-lg bg-blue-900 text-white">
            <p className="animate-pulse">AI is thinking...</p>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., How much did I spend on food?"
            className="grow p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-500"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};