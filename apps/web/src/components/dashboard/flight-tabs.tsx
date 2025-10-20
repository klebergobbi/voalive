'use client';

import { Tabs, TabsList, TabsTrigger } from '@reservasegura/ui';
import { FlightCategoryType } from '@reservasegura/types';

interface FlightTabsProps {
  activeTab: FlightCategoryType;
  onTabChange: (tab: FlightCategoryType) => void;
  counts: {
    all: number;
    upcoming: number;
    pending: number;
    checkinOpen: number;
    checkinClosed: number;
    flown: number;
  };
}

export function FlightTabs({ activeTab, onTabChange, counts }: FlightTabsProps) {
  const tabs = [
    { value: 'ALL' as FlightCategoryType, label: 'Todos', count: counts.all },
    { value: 'UPCOMING' as FlightCategoryType, label: 'Próximos voos', count: counts.upcoming },
    { value: 'PENDING' as FlightCategoryType, label: 'Pendentes', count: counts.pending },
    { value: 'CHECKIN_OPEN' as FlightCategoryType, label: 'Check-in Aberto', count: counts.checkinOpen },
    { value: 'CHECKIN_CLOSED' as FlightCategoryType, label: 'Check-in Fechado', count: counts.checkinClosed },
    { value: 'FLOWN' as FlightCategoryType, label: 'Voados', count: counts.flown },
  ];

  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as FlightCategoryType)}>
      <TabsList className="bg-transparent h-auto p-0 space-x-6">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 pb-2"
          >
            <span className="mr-2">{tab.label}</span>
            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-primary rounded-full">
              {tab.count}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}