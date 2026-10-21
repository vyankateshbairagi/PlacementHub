import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { RoleProvider } from '@/context/RoleContext';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'PlacementHub - Enterprise Operating System for Campus Careers',
  description:
    'Unifying students, TPO placement cells, recruiters, faculty, and alumni into one intelligent career operating system with authentic role governance and TACIE AI.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased selection:bg-blue-500/20 selection:text-blue-500">
        <ThemeProvider>
          <RoleProvider>
            <Navbar />
            <main className="flex-1 flex flex-col">{children}</main>
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
