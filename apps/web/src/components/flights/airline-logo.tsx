'use client';

import Image from 'next/image';
import { AIRLINES } from '@reservasegura/types';

interface AirlineLogoProps {
  airline: keyof typeof AIRLINES;
  className?: string;
}

const airlineLogos: Record<string, string> = {
  'AZUL': '/airlines/azul.png',
  'LATAM': '/airlines/latam.png',
  'GOL': '/airlines/gol.png',
};

export function AirlineLogo({ airline, className = 'h-8 w-24' }: AirlineLogoProps) {
  const airlineInfo = AIRLINES[airline];
  const logoPath = airlineLogos[airline];

  if (logoPath) {
    return (
      <div className={`relative ${className}`}>
        <Image
          src={logoPath}
          alt={`${airlineInfo.name} logo`}
          width={96}
          height={32}
          className="object-contain"
        />
      </div>
    );
  }

  // Fallback para companhias sem logo
  return (
    <div
      className={`flex items-center justify-center rounded px-2 py-1 text-white font-bold text-xs ${className}`}
      style={{ backgroundColor: airlineInfo.color }}
    >
      {airlineInfo.name}
    </div>
  );
}