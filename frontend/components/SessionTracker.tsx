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



// 'use client';

// import { useSession } from 'next-auth/react';
// import { useEffect } from 'react';

// export default function SessionTracker() {
//   const { data: session } = useSession();

//   useEffect(() => {
//     if (session?.user?.id) {
//       localStorage.setItem('userId', session.user.id);
//       if (session.user.name) {
//         localStorage.setItem('userName', session.user.name);
//       }
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
    if (!session?.user) return;

    const { id, name, email, image } = session.user;

    if (id) localStorage.setItem('userId', id);
    if (name) localStorage.setItem('userName', name);

    // Get backend JWT token for Google users
    const existingToken = localStorage.getItem('token');
    if (!existingToken && email) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, image }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.token) {
            localStorage.setItem('token', data.token);
            if (data.user?._id) localStorage.setItem('userId', data.user._id);
          }
        })
        .catch(err => console.error('❌ Failed to get backend token:', err));
    }
  }, [session]);

  return null;
}