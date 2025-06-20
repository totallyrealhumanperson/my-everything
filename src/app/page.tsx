
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { TweetComposer } from '@/components/tweet-composer';
import { DraftsList } from '@/components/DraftsList';
import { TweetShellLogo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, Award } from 'lucide-react'; // Added Award icon
import { ThemeToggle } from '@/components/theme-toggle';
import { getPostedTweetCount } from '@/app/actions'; 

export default function HomePage() {
  const { user, loading, signOutUser } = useAuth();
  const router = useRouter();
  const [draftsRefreshKey, setDraftsRefreshKey] = useState(0);
  const [postedTweetCount, setPostedTweetCount] = useState(0);

  const fetchTweetCount = useCallback(async () => {
    if (user) {
      try {
        const count = await getPostedTweetCount(user.uid);
        setPostedTweetCount(count);
      } catch (error) {
        console.error("Failed to fetch tweet count", error);
        // Optionally show a toast error
      }
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user) {
      fetchTweetCount();
    }
  }, [user, loading, router, fetchTweetCount]);

  const handleLogout = async () => {
    try {
      await signOutUser();
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
      // Handle logout error, maybe show a toast
    }
  };

  const handleDraftSaved = useCallback(() => {
    setDraftsRefreshKey(prevKey => prevKey + 1);
  }, []);

  const handleTweetPosted = useCallback(() => {
    fetchTweetCount(); // Refresh count after a tweet is posted
    setDraftsRefreshKey(prevKey => prevKey + 1); // Also refresh drafts in case it was posted from drafts list
  }, [fetchTweetCount]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Loading your notes...</p>
      </div>
    );
  }

  if (!user) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <p className="text-lg">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-background text-foreground p-4 sm:p-8 pt-12 sm:pt-24">
      <header className="w-full max-w-xl mb-8 sm:mb-12">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center justify-start gap-3 mb-2 flex-grow">
            <TweetShellLogo className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
            <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary">Personal Notes</h1>
            {user && (
              <div className="ml-4 flex items-center gap-1 text-lg text-muted-foreground" title="Total Tweets Posted">
                <Award className="h-5 w-5 text-amber-500" />
                <span>{postedTweetCount}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 self-start">
            <ThemeToggle />
            {user && (
              <Button variant="ghost" onClick={handleLogout} size="icon" aria-label="Logout">
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>
      <TweetComposer onDraftSaved={handleDraftSaved} onTweetPosted={handleTweetPosted} />
      <DraftsList refreshKey={draftsRefreshKey} />
    </div>
  );
}
