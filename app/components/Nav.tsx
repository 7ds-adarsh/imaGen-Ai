'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function Nav() {
  const { data: session, status } = useSession();

  return (
    <nav className="glass-effect sticky top-0 z-50 animate-slide-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center animate-pulse-slow">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              ImagenAI
            </h1>
          </div>
          <div className="hidden md:flex space-x-8 items-center">
            <a href="#home" className="text-white hover:text-purple-200 transition-colors">Home</a>
            <a href="#features" className="text-white hover:text-purple-200 transition-colors">Features</a>
            <a href="#about" className="text-white hover:text-purple-200 transition-colors">About</a>
            {status === 'loading' ? (
              <div className="text-white">Loading...</div>
            ) : session ? (
              <div className="flex items-center space-x-4">
                <span className="text-white">Welcome, {session.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="bg-white text-gray-900 px-4 py-2 rounded font-semibold hover:bg-gray-100 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
