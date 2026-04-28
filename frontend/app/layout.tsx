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
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import ClientLayout from '@/components/ClientLayout';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'CodeCollab — Real-time code collaboration',
  description: 'Collaborate and run code in real-time with your team.',
  robots: 'index, follow',
  verification: {
    google: 'ITBYHim2nmbkDR8vXiWpLVG85JTx2_wCdk4K52bSx8A',
  },
  openGraph: {
    title: 'CodeCollab',
    description: 'Real-time collaborative code editor',
    url: 'https://codeship.vercel.app',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}