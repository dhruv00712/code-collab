'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSession } from 'next-auth/react';

export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [joinRoomId, setJoinRoomId] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const nameFromStorage = localStorage.getItem('userName');
    if (session?.user?.name) {
      setUserName(session.user.name);
    } else if (nameFromStorage) {
      setUserName(nameFromStorage);
    }
  }, [session]);

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
    <main className="min-h-screen px-4 py-10 flex flex-col items-center bg-gradient-to-br from-gray-900 to-black text-white gap-10">
      {/* Hero Section */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl sm:text-5xl font-bold">
          👋 Welcome{userName ? `, ${userName}` : ''}!
        </h1>
        <p className="text-gray-400">Collaborate on code in real-time with your team.</p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
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
      </div>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mt-10 w-full text-center">
        <div className="p-6 border rounded-lg bg-gray-800 hover:shadow-md transition">
          <h2 className="text-xl font-semibold mb-2">🧠 Real-Time Sync</h2>
          <p className="text-gray-400">All code and messages update instantly across all users.</p>
        </div>

        <div className="p-6 border rounded-lg bg-gray-800 hover:shadow-md transition">
          <h2 className="text-xl font-semibold mb-2">💬 Live Chat</h2>
          <p className="text-gray-400">Discuss ideas and code without switching tabs.</p>
        </div>

        <div className="p-6 border rounded-lg bg-gray-800 hover:shadow-md transition">
          <h2 className="text-xl font-semibold mb-2">🧪 Code Runner</h2>
          <p className="text-gray-400">Run code in multiple languages with one click.</p>
        </div>
      </section>

    </main>
  );
}
