'use client';

import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:8000'); // Adjust to your backend

export default function ChatBox() {
  const [messages, setMessages] = useState<{ user: string; message: string }[]>([]);
  const [input, setInput] = useState('');
  const [roomId, setRoomId] = useState('');
  const [user, setUser] = useState('User');

 useEffect(() => {
  const storedRoomId = window.location.pathname.split('/').pop();
  const storedUserId = localStorage.getItem('userId');

  if (storedRoomId) {
    setRoomId(storedRoomId);

    if (storedUserId) {
      const userAlias = `User-${storedUserId.slice(-4)}`;
      setUser(userAlias);

      socket.emit('join-room', {
        roomId: storedRoomId,
        userId: storedUserId,
      });
    }
  }

  socket.on('receive-message', (msg: { user: string; message: string }) => {
    setMessages((prev) => [...prev, msg]);
  });

  socket.on('load-chat-history', (msgs: { user: string; message: string }[]) => {
    setMessages(msgs);
  });

  return () => {
    socket.off('receive-message');
    socket.off('load-chat-history');
  };
}, []);


  const sendMessage = () => {
    if (!input.trim()) return;

    const msg = { roomId, user, message: input };
    socket.emit('send-message', msg);
    setMessages((prev) => [...prev, msg]);
    setInput('');
  };

  return (
    <div className="flex flex-col w-80 border-l border-gray-700 bg-[#1e1e1e] text-white p-4">
      <h2 className="text-lg font-semibold mb-2">💬 Live Chat</h2>

      <div className="flex-1 overflow-y-auto space-y-1 mb-2 max-h-[300px]">
        {messages.map((msg, i) => (
          <div key={i} className="bg-gray-700 p-2 rounded">
            <span className="font-semibold">{msg.user}:</span> {msg.message}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-2 rounded bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type message..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 px-4 py-1 rounded hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}
