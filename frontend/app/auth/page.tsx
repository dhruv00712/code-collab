'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import AuthForm from '@/components/AuthForm';

export default  function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-6">
        {isRegister ? 'Register' : 'Login'}
      </h1>

      <AuthForm isRegister={isRegister} />

      <button
        onClick={() => signIn('google')}
        className="mt-6 px-4 py-2 border rounded flex items-center gap-2 hover:bg-gray-100 transition"
      >
        <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
        Continue with Google
      </button>

      <p className="mt-4">
        {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          onClick={() => setIsRegister(!isRegister)}
          className="text-blue-600 underline"
        >
          {isRegister ? 'Login' : 'Register'}
        </button>
      </p>
    </main>
  );
}
