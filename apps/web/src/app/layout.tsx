import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Reserva Segura - Sistema de Gerenciamento de Voos',
  description: 'Plataforma completa para gerenciamento de voos e reservas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <script src="/config.js" defer></script>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}