
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { TweetComposer } from '@/components/tweet-composer';
import { DraftsList } from '@/components/DraftsList';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, Award, Flame } from 'lucide-react'; 
import { ThemeToggle } from '@/components/theme-toggle';
import { getUserStats } from '@/app/actions'; 

export default function HomePage() {
  const { user, loading, signOutUser } = useAuth();
  const router = useRouter();
  const [draftsRefreshKey, setDraftsRefreshKey] = useState(0);
  const [postedTweetCount, setPostedTweetCount] = useState(0);
  const [streakCount, setStreakCount] = useState(0);

  const fetchUserStats = useCallback(async () => {
    if (user) {
      try {
        const stats = await getUserStats(user.uid);
        setPostedTweetCount(stats.tweetCount);
        setStreakCount(stats.streakCount);
      } catch (error) {
        console.error("Failed to fetch user stats", error);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user) {
      fetchUserStats();
    }
  }, [user, loading, router, fetchUserStats]);

  const handleLogout = async () => {
    try {
      await signOutUser();
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleDraftSaved = useCallback(() => {
    setDraftsRefreshKey(prevKey => prevKey + 1);
  }, []);

  const handleTweetPosted = useCallback((streakInfo?: { newStreak: number; isFirstPostOfDay: boolean }) => {
    setPostedTweetCount(prev => prev + 1);
    setDraftsRefreshKey(prevKey => prevKey + 1); 
    if (streakInfo) {
      setStreakCount(streakInfo.newStreak);
    }
  }, []);

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
            <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary">Personal Notes</h1>
            {user && (
              <>
                <div className="ml-4 flex items-center gap-1 text-lg text-muted-foreground" title="Total Tweets Posted">
                  <Award className="h-5 w-5 text-amber-500" />
                  <span>{postedTweetCount}</span>
                </div>
                <div className="ml-2 flex items-center gap-1 text-lg text-muted-foreground" title="Daily Posting Streak">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <span>{streakCount}</span>
                </div>
              </>
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
      <DraftsList refreshKey={draftsRefreshKey} onTweetPosted={handleTweetPosted} />
    </div>
  );
}
