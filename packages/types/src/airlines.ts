export const AIRLINES = {
  AZUL: {
    code: 'AD',
    name: 'Azul',
    color: '#0080FF',
  },
  LATAM: {
    code: 'LA',
    name: 'LATAM',
    color: '#E2007E',
  },
  GOL: {
    code: 'G3',
    name: 'GOL',
    color: '#FF6600',
  },
} as const;

export const AIRPORTS = {
  BSB: { code: 'BSB', name: 'Brasília', city: 'Brasília' },
  GRU: { code: 'GRU', name: 'Guarulhos', city: 'São Paulo' },
  CGH: { code: 'CGH', name: 'Congonhas', city: 'São Paulo' },
  GIG: { code: 'GIG', name: 'Galeão', city: 'Rio de Janeiro' },
  SDU: { code: 'SDU', name: 'Santos Dumont', city: 'Rio de Janeiro' },
  CNF: { code: 'CNF', name: 'Confins', city: 'Belo Horizonte' },
  REC: { code: 'REC', name: 'Recife', city: 'Recife' },
  FOR: { code: 'FOR', name: 'Fortaleza', city: 'Fortaleza' },
  SSA: { code: 'SSA', name: 'Salvador', city: 'Salvador' },
  POA: { code: 'POA', name: 'Porto Alegre', city: 'Porto Alegre' },
  CWB: { code: 'CWB', name: 'Curitiba', city: 'Curitiba' },
  MAO: { code: 'MAO', name: 'Manaus', city: 'Manaus' },
  BEL: { code: 'BEL', name: 'Belém', city: 'Belém' },
  VCP: { code: 'VCP', name: 'Viracopos', city: 'Campinas' },
  FLN: { code: 'FLN', name: 'Florianópolis', city: 'Florianópolis' },
  XAP: { code: 'XAP', name: 'Chapecó', city: 'Chapecó' },
} as const;

export type AirlineCode = keyof typeof AIRLINES;
export type AirportCode = keyof typeof AIRPORTS;