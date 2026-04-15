export const BUSINESS_GROUPS = [
  'Grupo Norte',
  'Grupo Sul',
  'Grupo Leste',
  'Grupo Oeste',
  'Grupo Central',
] as const;

export const BUSINESS_UNITS = [
  'Unit 1000 - Divisão Norte'.normalize('NFC'),
  'Unit 2000 - Divisão Sul'.normalize('NFC'),
  'Unit 3000 - Divisão Leste'.normalize('NFC'),
  'Unit 4000 - Divisão Oeste'.normalize('NFC'),
] as const;

export type BusinessGroup = (typeof BUSINESS_GROUPS)[number];
export type BusinessUnit = (typeof BUSINESS_UNITS)[number];
