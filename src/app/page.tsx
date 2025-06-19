
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { TweetComposer } from '@/components/tweet-composer';
import { TweetShellLogo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut } from 'lucide-react';

export default function HomePage() {
  const { user, loading, signOutUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await signOutUser();
      router.push('/login'); // Optionally redirect to login after logout
    } catch (error) {
      console.error("Logout failed", error);
      // Handle logout error, maybe show a toast
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Loading your notes...</p>
      </div>
    );
  }

  if (!user) {
    // This state should ideally be brief due to the useEffect redirect,
    // but it's a fallback or can be shown while redirecting.
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <p className="text-lg">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-background text-foreground p-4 sm:p-8 pt-12 sm:pt-24">
      <header className="w-full max-w-xl mb-8 sm:mb-12 text-center">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center gap-3 mb-2 flex-grow">
            <TweetShellLogo className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
            <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary">Personal Notes</h1>
          </div>
          {user && (
            <Button variant="ghost" onClick={handleLogout} className="ml-auto self-start">
              <LogOut className="mr-2 h-5 w-5" />
              Logout
            </Button>
          )}
        </div>
        <p className="text-base sm:text-lg text-muted-foreground">
          Welcome, {user.email}! Jot down your thoughts and ideas.
        </p>
      </header>
      <TweetComposer />
      {/* Toaster is now in RootLayout */}
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Personal Notes. All rights reserved (sort of).</p>
        <p>Powered by AI and your brilliant thoughts.</p>
      </footer>
    </div>
  );
}
