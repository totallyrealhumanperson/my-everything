
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-8 pt-12 sm:pt-24">
      <Card className="w-full max-w-xl shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <FileText className="h-6 w-6 text-primary" />
            About This App
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-base">
          <p>
            This is a simple application built for jotting down notes, saving them as drafts, and posting them directly to X (formerly Twitter).
          </p>
          <p>
            It features user authentication, a composer with offensive language detection, a draft management system, and post tracking with a daily streak counter to encourage consistent use.
          </p>
          <p>
            The interface is built with Next.js, React, and ShadCN UI components. The AI features are powered by Google's Gemini models through Genkit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
