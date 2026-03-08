export function toSafeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getCompetenciaMonth(value: unknown): number | null {
  if (typeof value !== 'string' || !value) return null;

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  const month = date.getMonth() + 1;
  if (month < 1 || month > 12) return null;

  return month;
}
