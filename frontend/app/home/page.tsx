'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function HomePage() {
  const router = useRouter();
  const [joinRoomId, setJoinRoomId] = useState('');

  const createRoom = () => {
    const newRoomId = uuidv4();
    router.push(`/editor/${newRoomId}`);
  };

  const joinRoom = () => {
    if (joinRoomId.trim()) {
      router.push(`/editor/${joinRoomId.trim()}`);
    }
  };

  const goToHistory = () => {
    router.push('/history');
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 gap-6">
      <h1 className="text-4xl font-bold text-center">👨‍💻 Welcome to CodeCollab</h1>

      <button
        onClick={createRoom}
        className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 transition"
      >
        ➕ Create New Room
      </button>

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Enter Room ID to Join"
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value)}
          className="p-2 rounded border border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={joinRoom}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          🔗 Join Room
        </button>
      </div>

      <button
        onClick={goToHistory}
        className="bg-gray-800 text-white px-6 py-3 rounded hover:bg-gray-700 transition"
      >
        🕘 View History
      </button>
    </main>
  );
}
