export function todayLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function formatDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function dueLabel(dueDate: string, done: boolean): string {
  if (!dueDate) return '';
  const today = todayLocal();
  if (!done && dueDate < today) return `Atrasada · ${formatDate(dueDate)}`;
  if (!done && dueDate === today) return 'Vence hoje';
  return `Prazo: ${formatDate(dueDate)}`;
}
