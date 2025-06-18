import { TweetComposer } from '@/components/tweet-composer';
import { Toaster } from "@/components/ui/toaster";
import { TweetShellLogo } from '@/components/icons/logo';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-background text-foreground p-4 sm:p-8 pt-12 sm:pt-24">
      <header className="mb-8 sm:mb-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <TweetShellLogo className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
          <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary">TweetShell</h1>
        </div>
        <p className="text-base sm:text-lg text-muted-foreground">Compose and post your tweets effortlessly.</p>
      </header>
      <TweetComposer />
      <Toaster />
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TweetShell. All rights reserved (sort of).</p>
        <p>Powered by AI and your brilliant thoughts.</p>
      </footer>
    </div>
  );
}
