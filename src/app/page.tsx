import { TweetComposer } from '@/components/tweet-composer';
import { Toaster } from "@/components/ui/toaster";
import { TweetShellLogo } from '@/components/icons/logo'; // Keeping original logo component name as requested

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-background text-foreground p-4 sm:p-8 pt-12 sm:pt-24">
      <header className="mb-8 sm:mb-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <TweetShellLogo className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
          <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary">Personal Notes</h1>
        </div>
        <p className="text-base sm:text-lg text-muted-foreground">Jot down your thoughts and ideas.</p>
      </header>
      <TweetComposer />
      <Toaster />
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Personal Notes. All rights reserved (sort of).</p>
        <p>Powered by AI and your brilliant thoughts.</p>
      </footer>
    </div>
  );
}
