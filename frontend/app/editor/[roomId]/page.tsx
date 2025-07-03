'use client';

import MonacoEditor from '@/components/CodeEditor';
import ChatBox from '@/components/ChatBox';
import { useRouter } from 'next/navigation';
import { use } from 'react';

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params); // 👈 unwrap the promise
  const router = useRouter();

  const copyLinkToClipboard = () => {
    const fullUrl = window.location.href;
    navigator.clipboard.writeText(fullUrl)
      .then(() => alert('🔗 Room link copied to clipboard!'))
      .catch((err) => console.error('❌ Failed to copy link:', err));
  };

  const leaveRoom = () => {
    router.push('/home');
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="p-2 bg-gray-800 text-white flex justify-between items-center">
        <div>Room ID: {roomId}</div>
        <div className="flex gap-2">
          <button
            onClick={copyLinkToClipboard}
            className="bg-blue-500 px-3 py-1 rounded"
          >
            Copy Link
          </button>
          <button
            onClick={leaveRoom}
            className="bg-red-500 px-3 py-1 rounded"
          >
            Leave
          </button>
        </div>
      </div>

      <div className="flex flex-1">
        <div className="flex-1">
          <MonacoEditor roomId={roomId} />
        </div>
        <ChatBox />
      </div>
    </div>
  );
}
