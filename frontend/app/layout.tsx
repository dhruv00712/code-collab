// 'use client';

// import { usePathname } from 'next/navigation';
// import { SessionProvider } from 'next-auth/react'; 
// import './globals.css';

// import LogoutButton from '@/components/LogoutButton';
// import SessionTracker from '@/components/SessionTracker';

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   const pathname = usePathname();
//   const isPublicPage = pathname === '/' || pathname.startsWith('/auth');

//   return (
//     <html lang="en">
//       <body className="min-h-screen bg-gray-100 flex flex-col text-black dark:text-white dark:bg-[#1e1e1e]">
//         <SessionProvider> {/* ✅ Wrap the app in this provider */}
//           <SessionTracker />

//           {!isPublicPage && (
//             <header className="p-4 bg-black shadow flex justify-between items-center text-white">
//               <h1 className="text-2xl font-bold">Welcome to CodeCollab 👨‍💻</h1>
//               <LogoutButton />
//             </header>
//           )}

//           <main className="flex-1 p-6">{children}</main>

//           {!isPublicPage && (
//             <footer className="p-4 bg-white dark:bg-[#2b2b2b] text-center text-sm text-gray-500">
//               © 2025 CodeCollab. All rights reserved.
//             </footer>
//           )}
//         </SessionProvider>
//       </body>
//     </html>
//   );
// }
'use client';

import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import './globals.css';
import { Geist, Geist_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';
import LogoutButton from '@/components/LogoutButton';
import SessionTracker from '@/components/SessionTracker';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/' || pathname.startsWith('/auth');
  const isEditorPage = pathname.startsWith('/editor');

  return (
    <html lang="en" className={cn(geist.variable, geistMono.variable)}>
      <body className={cn(
        'min-h-screen bg-[#0d0d0d] text-white font-sans antialiased',
        isEditorPage && 'overflow-hidden'
      )}>
        <SessionProvider>
          <Toaster richColors position="top-right" />
          <SessionTracker />

          {!isPublicPage && !isEditorPage && (
            <header className="h-14 border-b border-white/10 bg-[#0d0d0d] flex items-center justify-between px-6">
              <span className="text-sm font-semibold tracking-tight text-white">CodeCollab</span>
              <LogoutButton />
            </header>
          )}

          <main className={cn(
            isEditorPage
              ? 'h-screen flex flex-col overflow-hidden'
              : !isPublicPage
                ? 'min-h-[calc(100vh-56px)] p-6'
                : ''
          )}>
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}