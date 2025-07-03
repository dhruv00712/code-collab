'use client';

import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react'; // ✅ import this
import './globals.css';

import LogoutButton from '@/components/LogoutButton';
import SessionTracker from '@/components/SessionTracker';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/' || pathname.startsWith('/auth');

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-100 flex flex-col text-black dark:text-white dark:bg-[#1e1e1e]">
        <SessionProvider> {/* ✅ Wrap the app in this provider */}
          <SessionTracker />

          {!isPublicPage && (
            <header className="p-4 bg-black shadow flex justify-between items-center text-white">
              <h1 className="text-2xl font-bold">Welcome to CodeCollab 👨‍💻</h1>
              <LogoutButton />
            </header>
          )}

          <main className="flex-1 p-6">{children}</main>

          {!isPublicPage && (
            <footer className="p-4 bg-white dark:bg-[#2b2b2b] text-center text-sm text-gray-500">
              © 2025 CodeCollab. All rights reserved.
            </footer>
          )}
        </SessionProvider>
      </body>
    </html>
  );
}
