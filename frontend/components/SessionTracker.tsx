// 'use client';

// import { useSession } from 'next-auth/react';
// import { useEffect } from 'react';

// export default function SessionTracker() {
//   const { data: session } = useSession();

//   useEffect(() => {
//     const userId = session?.user?.id;

//     if (userId) {
//       localStorage.setItem('userId', userId);
//       console.log('✅ userId set in localStorage:', userId);
//     } else {
//       console.warn('⚠️ No userId found in session');
//     }
//   }, [session]);

//   return null;
// }

'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function SessionTracker() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.id) {
      localStorage.setItem('userId', session.user.id);
      if (session.user.name) {
        localStorage.setItem('userName', session.user.name);
      }
    }
  }, [session]);

  return null;
}