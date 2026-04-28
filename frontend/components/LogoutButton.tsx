// 'use client';

// import { signOut } from 'next-auth/react';

// export default function LogoutButton() {
//   const handleLogout = () => {
//     localStorage.removeItem('userId');
//     signOut({ callbackUrl: 'https://codeship.vercel.app/auth' });
//   };


//   return (
//     <button
//       onClick={handleLogout}
//       className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
//     >
//       Logout
//     </button>
//   );
// }

'use client';

import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    // redirect: false means NextAuth won't trigger the redirect callback at all
    await signOut({ redirect: false });
    router.push('/');
  };

  return (
    <button
      id="logout-btn"
      onClick={handleLogout}
      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition"
    >
      Logout
    </button>
  );
}
