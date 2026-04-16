import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'CodeShip — Real-time collaborative coding',
    template: '%s | CodeShip',
  },
  description:
    'CodeShip is a real-time collaborative code editor with live sync, multi-cursor editing, built-in chat, and instant code execution in 14 languages.',
  keywords: ['code', 'collaboration', 'editor', 'real-time', 'pair programming', 'code runner'],
  openGraph: {
    title: 'CodeShip — Code together, ship faster.',
    description: 'Real-time collaborative coding with live sync, chat, and instant runner.',
    type: 'website',
  },
  icons: {
    icon: '/CodeShip_favicon.png',
  },
};
