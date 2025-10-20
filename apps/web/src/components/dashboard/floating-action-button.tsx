'use client';

import { Plus } from 'lucide-react';
import { Button } from '@reservasegura/ui';

interface FloatingActionButtonProps {
  onClick: () => void;
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
      size="icon"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}