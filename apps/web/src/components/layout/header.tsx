'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@reservasegura/ui';
import { Bell, Search } from 'lucide-react';

export function Header() {
  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-4">
      <div className="flex items-center space-x-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src="/avatar.png" alt="User" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold">Usuário</p>
          <p className="text-xs text-muted-foreground">usuario@email.com</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button className="relative p-2 text-gray-600 hover:text-gray-900">
          <Search className="h-5 w-5" />
        </button>
        <button className="relative p-2 text-gray-600 hover:text-gray-900">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
        </button>
      </div>
    </header>
  );
}