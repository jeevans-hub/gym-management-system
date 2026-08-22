const gymDateFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const gymTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

export function formatGymDate(dateKey: string): string {
  return gymDateFormatter.format(new Date(`${dateKey}T00:00:00+05:30`));
}

export function formatGymTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : gymTimeFormatter.format(date);
}

export function memberName(member: { firstName: string; lastName: string }): string {
  return `${member.firstName} ${member.lastName}`;
}
