
import type {Metadata} from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/auth-context'; // Import AuthProvider
import { Toaster } from "@/components/ui/toaster"; // Import Toaster globally

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Personal Notes',
  description: 'Jot down your thoughts and ideas, securely.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head />
      <body className="font-body antialiased">
        <AuthProvider> {/* Wrap children with AuthProvider */}
          {children}
          <Toaster /> {/* Add Toaster here for global access */}
        </AuthProvider>
      </body>
    </html>
  );
}
