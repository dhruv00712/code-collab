'use client';

import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  const handleLogout = () => {
    localStorage.removeItem('userId');
    signOut({ callbackUrl: 'https://code-collab-gules.vercel.app/auth', redirect: true });
  };

  
  return (
    <button
      onClick={handleLogout}
      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
    >
      Logout
    </button>
  );
}
