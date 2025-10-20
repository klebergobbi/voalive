'use client';

import { Input } from '@reservasegura/ui';
import { Search, Filter } from 'lucide-react';
import { AIRLINES } from '@reservasegura/types';

interface FlightFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedAirline: string | null;
  onAirlineChange: (airline: string | null) => void;
}

export function FlightFilters({
  searchTerm,
  onSearchChange,
  selectedAirline,
  onAirlineChange,
}: FlightFiltersProps) {
  return (
    <div className="flex items-center space-x-4 py-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Pesquisar por nome, localizador ou destino..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <select
          value={selectedAirline || ''}
          onChange={(e) => onAirlineChange(e.target.value || null)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Todas as empresas</option>
          {Object.entries(AIRLINES).map(([key, airline]) => (
            <option key={key} value={key}>
              {airline.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}