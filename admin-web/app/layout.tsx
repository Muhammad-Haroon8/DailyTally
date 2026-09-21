// app/layout.tsx
import type { Metadata } from 'next';
import '../styles/globals.scss';
import { AuthProvider } from '../context/AuthContext';

export const metadata: Metadata = {
  title: 'Daily Tally — Super Admin Portal',
  description: 'Platform oversight, multi-shop ledger inspection, and soft-delete audit recovery',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
