'use client';

import {
  Home,
  Plane,
  Calendar,
  Users,
  Settings,
  CreditCard,
  BarChart,
  HelpCircle,
  Radio
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@reservasegura/ui';

const sidebarItems = [
  { icon: Home, label: 'Dashboard', href: '/' },
  { icon: Plane, label: 'Voos', href: '/flights' },
  { icon: Radio, label: 'Voos ao Vivo', href: '/live-flights' },
  { icon: Calendar, label: 'Reservas', href: '/bookings' },
  { icon: Users, label: 'Passageiros', href: '/passengers' },
  { icon: CreditCard, label: 'Pagamentos', href: '/payments' },
  { icon: BarChart, label: 'Relatórios', href: '/reports' },
  { icon: Settings, label: 'Configurações', href: '/settings' },
  { icon: HelpCircle, label: 'Ajuda', href: '/help' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-16 flex-col items-center bg-gray-900 py-4">
      <div className="mb-8">
        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
          V
        </div>
      </div>

      <nav className="flex flex-1 flex-col items-center space-y-4">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-lg transition-colors hover:bg-gray-800',
                isActive && 'bg-primary text-white'
              )}
              title={item.label}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}