// 'use client';

// import MonacoEditor from '@/components/CodeEditor';
// import ChatBox from '@/components/ChatBox';
// import { useRouter } from 'next/navigation';
// import { use } from 'react';

// export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
//   const { roomId } = use(params);
//   const router = useRouter();

//   const copyLinkToClipboard = () => {
//     const fullUrl = window.location.href;
//     navigator.clipboard.writeText(fullUrl)
//       .then(() => alert('🔗 Room link copied to clipboard!'))
//       .catch((err) => console.error('❌ Failed to copy link:', err));
//   };

//   const leaveRoom = () => {
//     router.push('/home');
//   };

//   return (
//     <div className="flex flex-col h-screen">
//       <div className="p-2 bg-gray-800 text-white flex justify-between items-center">
//         <div>Room ID: {roomId}</div>
//         <div className="flex gap-2">
//           <button
//             onClick={copyLinkToClipboard}
//             className="bg-blue-500 px-3 py-1 rounded"
//           >
//             Copy Link
//           </button>
//           <button
//             onClick={leaveRoom}
//             className="bg-red-500 px-3 py-1 rounded"
//           >
//             Leave
//           </button>
//         </div>
//       </div>

//       <div className="flex flex-1">
//         <div className="flex-1">
//           <MonacoEditor roomId={roomId} />
//         </div>
//         <ChatBox />
//       </div>
//     </div>
//   );
// }
'use client';

import { useEffect, useState, useRef } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { Copy, Link, LogOut, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import MonacoEditor from '@/components/CodeEditor';
import ChatBox from '@/components/ChatBox';

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [reconnecting, setReconnecting] = useState(false);
  const reconnectingRef = useRef(false);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL!, {
      transports: ['websocket'],
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setReconnecting(false);
      reconnectingRef.current = false;

      const userId = localStorage.getItem('userId') || session?.user?.email || 'anonymous';
      const userName = localStorage.getItem('userName') || session?.user?.name || 'User';
      socket.emit('join-room', { roomId, userId, userName });
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setReconnecting(true);
      reconnectingRef.current = true;
      toast.error('Connection lost. Reconnecting...');
    });

    socket.on('connect_error', () => {
      setReconnecting(true);
    });

    socket.on('room-users', (users: string[]) => {
      setOnlineUsers(users);
    });

    return () => { socket.disconnect(); };
  }, [roomId, session]);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast.success('Room ID copied!');
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied!');
  };

  const leaveRoom = () => {
    socketRef.current?.disconnect();
    router.push('/home');
  };

  if (!socketRef.current) return (
    <div className="flex items-center justify-center h-screen bg-[#0d0d0d] text-white">
      <div className="text-sm text-white/40 animate-pulse">Connecting...</div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-[#0d0d0d] overflow-hidden">

        {/* Reconnecting banner */}
        {reconnecting && (
          <div className="h-7 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center justify-center">
            <span className="text-yellow-400 text-xs animate-pulse">
              Connection lost — reconnecting...
            </span>
          </div>
        )}

        {/* Header */}
        <header className="h-11 bg-[#111111] border-b border-white/[0.06] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white/90 tracking-tight">CodeCollab</span>
            <Separator orientation="vertical" className="h-4 bg-white/10" />

            {/* Room ID */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/30 font-mono">
                {roomId.slice(0, 8)}...
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={copyRoomId}
                    className="text-white/30 hover:text-white/70 transition-colors">
                    <Copy size={11} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Copy Room ID</TooltipContent>
              </Tooltip>
            </div>

            {/* Status dot */}
            <Circle
              size={7}
              className={connected ? 'fill-emerald-400 text-emerald-400' : 'fill-red-400 text-red-400'}
            />

            {/* Online users */}
            {onlineUsers.length > 0 && (
              <div className="flex items-center gap-1">
                {onlineUsers.slice(0, 4).map((user, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger>
                      <div className="w-6 h-6 rounded-full bg-indigo-500/80 flex items-center justify-center text-white text-[10px] font-semibold border border-white/10">
                        {user.slice(0, 1).toUpperCase()}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{user}</TooltipContent>
                  </Tooltip>
                ))}
                {onlineUsers.length > 4 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    +{onlineUsers.length - 4}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={copyRoomLink}
                  className="h-7 px-2.5 text-xs text-white/60 hover:text-white hover:bg-white/5">
                  <Link size={12} className="mr-1.5" />
                  Share
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy room link</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-4 bg-white/10" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={leaveRoom}
                  className="h-7 px-2.5 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-400/5">
                  <LogOut size={12} className="mr-1.5" />
                  Leave
                </Button>
              </TooltipTrigger>
              <TooltipContent>Leave room</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <MonacoEditor
              roomId={roomId}
              socket={socketRef.current}
              onlineUsers={onlineUsers}
            />
          </div>
          <ChatBox roomId={roomId} socket={socketRef.current} />
        </div>
      </div>
    </TooltipProvider>
  );
}