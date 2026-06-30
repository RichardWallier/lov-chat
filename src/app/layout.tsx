import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../styles/tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'LOV Voice',
  description: 'Audio voice rooms for LOV.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-base text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
