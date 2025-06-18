import type {Metadata} from 'next';
import './globals.css';
import { Inter } from 'next/font/google'; // Import Inter font

// Configure Inter font
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter', // CSS variable for Inter font
});

export const metadata: Metadata = {
  title: 'TweetShell',
  description: 'Compose and post your tweets effortlessly.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}> {/* Apply Inter font variable to html tag */}
      <head>
        {/* Google Fonts link for Inter is not needed if using next/font */}
      </head>
      <body className="font-body antialiased">{children}</body> {/* font-body will use --font-inter */}
    </html>
  );
}
