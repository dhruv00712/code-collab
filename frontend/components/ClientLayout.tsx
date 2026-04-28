'use client';

import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';
import LogoutButton from '@/components/LogoutButton';
import SessionTracker from '@/components/SessionTracker';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isPublicPage = pathname === '/' || pathname.startsWith('/auth');
    const isEditorPage = pathname.startsWith('/editor');
    const isHomePage = pathname === '/home';

    return (
        <SessionProvider>
            <Toaster richColors position="top-right" />
            <SessionTracker />

            {!isPublicPage && !isEditorPage && (
                <header className="h-14 border-b border-white/[0.06] bg-[#0d0d0d]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
                    <span className="text-sm font-bold tracking-tight">
                        <span className="text-white">Code</span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Ship</span>
                    </span>
                    <LogoutButton />
                </header>
            )}

            <main className={cn(
                isEditorPage
                    ? 'h-screen flex flex-col overflow-hidden'
                    : isHomePage
                        ? 'min-h-[calc(100vh-56px)]'
                        : !isPublicPage
                            ? 'min-h-[calc(100vh-56px)] p-6'
                            : ''
            )}>
                {children}
            </main>
        </SessionProvider>
    );
}