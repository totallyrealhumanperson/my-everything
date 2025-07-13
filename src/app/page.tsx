
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { TweetComposer } from '@/components/tweet-composer';
import { DraftsList } from '@/components/DraftsList';
import { Loader2 } from 'lucide-react'; 
import { getUserStats } from '@/app/actions'; 
import { useSidebar } from '@/hooks/use-sidebar';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [draftsRefreshKey, setDraftsRefreshKey] = useState(0);
  const [postedTweetCount, setPostedTweetCount] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const { setOpen } = useSidebar();

  useEffect(() => {
    // This correctly keeps the sidebar open on the home page.
    setOpen(true);
  }, [setOpen]);
  
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

      <TweetComposer onDraftSaved={handleDraftSaved} onTweetPosted={handleTweetPosted} />
      <DraftsList refreshKey={draftsRefreshKey} onTweetPosted={handleTweetPosted} />
    </div>
  );
}
