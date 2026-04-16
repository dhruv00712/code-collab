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
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Link, LogOut, Circle, Code2, MessageSquare, X } from 'lucide-react';
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
  const [mobileTab, setMobileTab] = useState<'editor' | 'chat'>('editor');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

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
      // Reconnecting state shown in header pill — no toast needed
    });

    socket.on('connect_error', () => {
      setReconnecting(true);
    });

    socket.on('room-users', (users: string[]) => {
      setOnlineUsers(users);
    });

    // Track unread chat messages on mobile when editor tab is active
    socket.on('receive-message', () => {
      setUnreadCount(c => c + 1);
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


        {/* Header */}
        <header className="h-11 bg-[#111111] border-b border-white/[0.06] flex items-center justify-between px-3 sm:px-4 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Logo */}
            <span className="text-sm font-bold tracking-tight flex-shrink-0">
              <span className="text-white">Code</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Ship</span>
            </span>
            <Separator orientation="vertical" className="h-4 bg-white/10 flex-shrink-0" />

            {/* Room ID — hidden on xs */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-xs text-white/30 font-mono">{roomId.slice(0, 8)}…</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={copyRoomId} className="text-white/30 hover:text-white/70 transition-colors">
                    <Copy size={11} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Copy Room ID</TooltipContent>
              </Tooltip>
            </div>

            {/* Status dot */}
            <Circle size={7} className={connected ? 'fill-emerald-400 text-emerald-400 flex-shrink-0' : 'fill-red-400 text-red-400 flex-shrink-0'} />

            {/* Online users — hidden on xs */}
            {onlineUsers.length > 0 && (
              <div className="hidden sm:flex items-center gap-1">
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
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">+{onlineUsers.length - 4}</Badge>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">

            {/* Reconnecting indicator — inline pill */}
            <AnimatePresence>
              {reconnecting && (
                <motion.div
                  initial={{ opacity: 0, x: 8, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 8, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[11px] font-medium mr-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="hidden sm:inline">Reconnecting…</span>
                  <span className="sm:hidden">…</span>
                </motion.div>
              )}
            </AnimatePresence>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={copyRoomLink}
                  className="h-7 px-2 sm:px-2.5 text-xs text-white/60 hover:text-white hover:bg-white/5">
                  <Link size={12} className="sm:mr-1.5" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy room link</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-4 bg-white/10" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => setShowLeaveConfirm(true)}
                  className="h-7 px-2 sm:px-2.5 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-400/5">
                  <LogOut size={12} className="sm:mr-1.5" />
                  <span className="hidden sm:inline">Leave</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Leave room</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Editor — full width on mobile when editor tab, hidden when chat tab */}
          <div className={`flex-1 overflow-hidden ${mobileTab === 'chat' ? 'hidden md:flex md:flex-1' : 'flex flex-col'
            }`}>
            <MonacoEditor
              roomId={roomId}
              socket={socketRef.current}
              onlineUsers={onlineUsers}
            />
          </div>

          {/* Chat — full screen on mobile when chat tab, sidebar on desktop */}
          <div className={`flex flex-col overflow-hidden ${mobileTab === 'editor'
            ? 'hidden md:flex md:w-72'
            : 'flex-1 md:flex-none md:w-72'
            }`}>
            <ChatBox roomId={roomId} socket={socketRef.current}
              onMessage={() => mobileTab === 'editor' && setUnreadCount(c => c + 1)}
            />
          </div>
        </div>

        {/* Mobile bottom tab bar */}
        <div className="md:hidden h-14 border-t border-white/[0.06] bg-[#111111] flex shrink-0">
          <button
            id="mobile-tab-editor"
            onClick={() => setMobileTab('editor')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${mobileTab === 'editor' ? 'text-indigo-400' : 'text-white/30 hover:text-white/50'
              }`}>
            <Code2 size={18} />
            Editor
          </button>
          <button
            id="mobile-tab-chat"
            onClick={() => { setMobileTab('chat'); setUnreadCount(0); }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors relative ${mobileTab === 'chat' ? 'text-indigo-400' : 'text-white/30 hover:text-white/50'
              }`}>
            <div className="relative">
              <MessageSquare size={18} />
              {unreadCount > 0 && mobileTab === 'editor' && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            Chat
          </button>
        </div>
      </div>

      {/* ── Leave Confirmation Modal ─────────────────────────────── */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            key="leave-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={() => setShowLeaveConfirm(false)}
          >
            <motion.div
              key="leave-dialog"
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#141418] shadow-2xl shadow-black/60 overflow-hidden"
            >
              {/* Red accent bar */}
              <div className="h-[3px] bg-gradient-to-r from-red-500 to-orange-500" />

              <div className="p-6">
                {/* Icon + close */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <LogOut size={18} className="text-red-400" />
                  </div>
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="text-white/25 hover:text-white/60 transition-colors p-1 rounded-lg hover:bg-white/5">
                    <X size={15} />
                  </button>
                </div>

                {/* Text */}
                <h2 className="text-base font-semibold text-white mb-1">Leave this room?</h2>
                <p className="text-sm text-white/45 leading-relaxed mb-1">
                  You'll be taken back to the home page.
                </p>
                <p className="text-xs text-white/25 font-mono mb-6">
                  Room: {roomId.slice(0, 16)}…
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    id="leave-cancel-btn"
                    onClick={() => setShowLeaveConfirm(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white text-sm font-medium transition-all">
                    Stay
                  </button>
                  <button
                    id="leave-confirm-btn"
                    onClick={leaveRoom}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20">
                    <LogOut size={14} /> Leave Room
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}