import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SessionProvider } from "next-auth/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Image Generator",
  description: "Generate images using AI with Hugging Face API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen gradient-bg`}
      >
        <Providers>
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
                <div className="hidden md:flex space-x-8">
                  <a href="#home" className="text-white hover:text-purple-200 transition-colors">Home</a>
                  <a href="#features" className="text-white hover:text-purple-200 transition-colors">Features</a>
                  <a href="#about" className="text-white hover:text-purple-200 transition-colors">About</a>
                </div>
              </div>
            </div>
          </nav>

          <main className="flex-1">
            {children}
          </main>

          <footer className="glass-effect mt-16 animate-fade-in">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center space-x-2 mb-4 md:mb-0">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xs">AI</span>
                  </div>
                  <span className="text-white font-semibold">ImagenAI</span>
                </div>
                <div className="flex space-x-6 text-sm text-white/70">
                  <a href="#" className="hover:text-white transition-colors">Privacy</a>
                  <a href="#" className="hover:text-white transition-colors">Terms</a>
                  <a href="#" className="hover:text-white transition-colors">Support</a>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-white/10 text-center text-white/50 text-sm">
                © 2024 ImagenAI. Powered by Hugging Face & Next.js.
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
