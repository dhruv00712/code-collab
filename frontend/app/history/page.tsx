'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Room = {
  roomId: string;
  updatedAt: string;
};

export default function HistoryPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const router = useRouter();
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    if (!userId) return;

    fetch(`http://localhost:8000/api/rooms/${userId}`)
      .then((res) => res.json())
      .then((data) => setRooms(data))
      .catch((err) => console.error('Error loading history:', err));
  }, [userId]);

  const openRoom = (roomId: string) => {
    router.push(`/editor/${roomId}`);
  };

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🕘 Room History</h1>

      {rooms.length === 0 ? (
        <p>No previous rooms found.</p>
      ) : (
        <ul className="space-y-4">
          {rooms.map((room) => (
            <li
              key={room.roomId}
              onClick={() => openRoom(room.roomId)}
              className="p-4 border rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div className="font-semibold">Room ID: {room.roomId}</div>
              <div className="text-sm text-gray-500">
                Last updated: {new Date(room.updatedAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
