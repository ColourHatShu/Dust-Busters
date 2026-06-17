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

export interface BookingMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  profiles?: { name: string } | null;
}

export interface Dispute {
  id: string;
  booking_id: string;
  raised_by: string;
  category: 'no_show' | 'poor_quality' | 'property_damage' | 'payment_issue' | 'other';
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  booking_id: string | null;
  read_at: string | null;
  created_at: string;
}

export type BookingStatus =
  | 'broadcasting'
  | 'accepted'
  | 'deposit_paid'
  | 'in_progress'
  | 'completed'
  | 'disputed'
  | 'balance_paid'
  | 'closed'
  | 'cancelled'
  | 'no_cleaner_found';

export interface Booking {
  id: string;
  customer_id: string;
  cleaner_id: string | null;
  scheduled_at: string;
  hours: number;
  area: string;
  total_amount: number;
  deposit_amount: number;
  balance_amount: number;
  status: BookingStatus;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  deposit_deadline: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  type: 'deposit' | 'balance';
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  paid_at: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  broadcasting: 'Finding a cleaner near you...',
  accepted: 'Cleaner found! Confirm with your deposit.',
  deposit_paid: 'Deposit paid. Your cleaner is booked.',
  in_progress: 'Your cleaning is in progress.',
  completed: 'Cleaning complete. Please pay the balance.',
  disputed: 'Issue reported — our team is reviewing.',
  balance_paid: 'Paid in full. Thank you!',
  closed: 'Closed.',
  cancelled: 'Cancelled.',
  no_cleaner_found: 'Sorry, no cleaner was available for this slot.',
};

export const STATUS_COLOR: Record<BookingStatus, string> = {
  broadcasting: 'bg-blue-100 text-blue-700',
  accepted: 'bg-yellow-100 text-yellow-700',
  deposit_paid: 'bg-green-100 text-green-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-orange-100 text-orange-700',
  disputed: 'bg-red-100 text-red-700',
  balance_paid: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  no_cleaner_found: 'bg-red-100 text-red-700',
};
