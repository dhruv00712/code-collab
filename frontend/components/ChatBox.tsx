// 'use client';

// import { useEffect, useState } from 'react';
// import { useSession } from 'next-auth/react';
// import io from 'socket.io-client';

// const socket = io(process.env.NEXT_PUBLIC_API_URL!, {
//   transports: ['websocket'],
//   withCredentials: true,
// });

// export default function ChatBox() {
//   const { data: session } = useSession(); //  get session from Google login
//   const [messages, setMessages] = useState<{ user: string; message: string }[]>([]);
//   const [input, setInput] = useState('');
//   const [roomId, setRoomId] = useState('');
//   const [user, setUser] = useState('User');

//   useEffect(() => {
//     const storedRoomId = window.location.pathname.split('/').pop();
//     const storedUserId = localStorage.getItem('userId');
//     const registeredName = localStorage.getItem('userName'); 

//     if (storedRoomId) {
//       setRoomId(storedRoomId);

//       // Set user name from session (Google) or registered name or fallback
//       if (session?.user?.name) {
//         setUser(session.user.name);
//       } else if (registeredName) {
//         setUser(registeredName);
//       } else if (storedUserId) {
//         setUser(`User-${storedUserId.slice(-4)}`);
//       }

//       socket.emit('join-room', {
//         roomId: storedRoomId,
//         userId: storedUserId,
//       });
//     }

//     socket.on('receive-message', (msg: { user: string; message: string }) => {
//       setMessages((prev) => [...prev, msg]);
//     });

//     socket.on('load-chat-history', (msgs: { user: string; message: string }[]) => {
//       setMessages(msgs);
//     });

//     return () => {
//       socket.off('receive-message');
//       socket.off('load-chat-history');
//     };
//   }, [session]);

//   const sendMessage = () => {
//     if (!input.trim()) return;

//     const msg = { roomId, user, message: input };
//     socket.emit('send-message', msg);
//     setMessages((prev) => [...prev, msg]);
//     setInput('');
//   };

//   return (
//     <div className="flex flex-col w-80 border-l border-gray-700 bg-[#1e1e1e] text-white p-4">
//       <h2 className="text-lg font-semibold mb-2">💬 Live Chat</h2>

//       <div className="flex-1 overflow-y-auto space-y-1 mb-2 max-h-[300px]">
//         {messages.map((msg, i) => (
//           <div key={i} className="bg-gray-700 p-2 rounded">
//             <span className="font-semibold">{msg.user}:</span> {msg.message}
//           </div>
//         ))}
//       </div>

//       <div className="flex gap-2">
//         <input
//           type="text"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           className="flex-1 p-2 rounded bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           placeholder="Type message..."
//         />
//         <button
//           onClick={sendMessage}
//           className="bg-blue-600 px-4 py-1 rounded hover:bg-blue-700"
//         >
//           Send
//         </button>
//       </div>
//     </div>
//   );
// }
'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Message {
  user: string;
  message: string;
  timestamp?: string;
}

interface ChatBoxProps {
  roomId: string;
  socket: Socket;
  onMessage?: () => void;
}

export default function ChatBox({ roomId, socket, onMessage }: ChatBoxProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  const userName = session?.user?.name
    || (typeof window !== 'undefined' ? localStorage.getItem('userName') : null)
    || 'User';

  useEffect(() => {
    socket.on('receive-message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
      onMessage?.();  // notify parent for unread badge
    });
    socket.on('load-chat-history', (msgs: Message[]) => {
      setMessages(msgs);
    });
    socket.on('user-typing', ({ user }: { user: string }) => {
      if (user === userName) return;
      setTypingUsers(prev => prev.includes(user) ? prev : [...prev, user]);
      if (typingTimeouts.current[user]) clearTimeout(typingTimeouts.current[user]);
      typingTimeouts.current[user] = setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u !== user));
      }, 2000);
    });
    return () => {
      socket.off('receive-message');
      socket.off('load-chat-history');
      socket.off('user-typing');
    };
  }, [socket, userName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    if (input.length > 2000) { toast.error('Message too long'); return; }

    const msg: Message = {
      user: userName,
      message: input.trim(),
      timestamp: new Date().toISOString(),
    };

    socket.emit('send-message', { roomId, ...msg });
    setMessages(prev => [...prev, msg]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    socket.emit('typing', { roomId, user: userName });
  };

  const formatTime = (ts?: string) =>
    ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="flex-1 flex flex-col border-l border-white/[0.06] bg-[#0d0d0d] overflow-hidden">

      {/* Header */}
      <div className="h-10 border-b border-white/[0.06] flex items-center justify-between px-4 shrink-0">
        <span className="text-xs font-medium text-white/50 tracking-wide uppercase">Chat</span>
        <span className="text-[10px] text-white/20 font-mono">{messages.length}</span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-2">
        {messages.length === 0 && (
          <p className="text-center text-white/20 text-xs mt-8">No messages yet</p>
        )}
        <div className="space-y-3">
          {messages.map((msg, i) => {
            const isOwn = msg.user === userName;
            return (
              <div key={i} className={cn('flex flex-col gap-0.5', isOwn && 'items-end')}>
                {!isOwn && (
                  <span className="text-[10px] text-white/30 px-1 font-mono">{msg.user}</span>
                )}
                <div className={cn(
                  'max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed',
                  isOwn
                    ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/20'
                    : 'bg-white/[0.05] text-white/70 border border-white/[0.06]'
                )}>
                  {msg.message}
                </div>
                {msg.timestamp && (
                  <span className="text-[10px] text-white/15 px-1 font-mono">
                    {formatTime(msg.timestamp)}
                  </span>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Typing indicator */}
      <div className="h-5 px-4 flex items-center">
        {typingUsers.length > 0 && (
          <span className="text-[10px] text-white/25 animate-pulse font-mono">
            {typingUsers.join(', ')} typing...
          </span>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.06] flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          maxLength={2000}
          className="flex-1 bg-white/[0.05] border border-white/10 rounded px-3 py-1.5 text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all font-mono"
        />
        <button onClick={sendMessage}
          className="w-8 h-8 flex items-center justify-center bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/30 text-indigo-400 rounded transition-all">
          <Send size={12} />
        </button>
      </div>
    </div>
  );
}