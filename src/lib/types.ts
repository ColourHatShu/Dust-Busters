export const ROLES = ["customer", "cleaner", "admin"] as const;
export type Role = (typeof ROLES)[number];

export interface Profile {
  id: string;
  role: Role;
  name: string;
  phone: string | null;
  created_at: string;
}

export interface Settings {
  id: number;
  hourly_rate: number;
  deposit_percent: number;
  currency: string;
}

// Overloaded: with depositPercent returns a breakdown, otherwise the total.
export function computePrice(rate: number, hours: number): number;
export function computePrice(
  rate: number,
  hours: number,
  depositPercent: number
): { total: number; deposit: number; balance: number };
export function computePrice(rate: number, hours: number, depositPercent?: number) {
  const total = rate * hours;
  if (depositPercent === undefined) return total;
  const deposit = Math.round((total * depositPercent) / 100);
  return { total, deposit, balance: total - deposit };
}
