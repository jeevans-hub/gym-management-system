export const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
export const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : dateFormatter.format(date);
}

export function durationLabel(months: number) {
  return `${months} ${months === 1 ? 'month' : 'months'}`;
}

export function expectedEndDate(startDate: string, durationMonths: number) {
  if (!startDate) return '';
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start);
  end.setMonth(end.getMonth() + durationMonths);
  return end.toISOString().slice(0, 10);
}

export function expiryLabel(endDate: string, status: string) {
  if (status === 'cancelled') return 'Membership cancelled';
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);
  if (days === 0) return 'Expires today';
  if (days > 0) return `Expires in ${days} ${days === 1 ? 'day' : 'days'}`;
  const ago = Math.abs(days);
  return `Expired ${ago} ${ago === 1 ? 'day' : 'days'} ago`;
}
