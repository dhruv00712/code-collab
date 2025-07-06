'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function SessionTracker() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    const userId = session.user.id || session.user.email;

    if (userId) {
      localStorage.setItem('userId', userId);
      console.log('✅ userId set in localStorage:', userId);
    } else {
      console.warn('⚠️ No userId found in session');
    }
  }, [session]);

  return null;
}
