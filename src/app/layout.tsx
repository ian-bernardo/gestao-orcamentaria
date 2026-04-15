import type { Metadata } from 'next';
import '@/styles/index.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Gestao Orcamentaria Dashboard Design',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        {children}
      </body>
    </html>
  );
}
