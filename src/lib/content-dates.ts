const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;

export function parseIsoTimestamp(value: unknown): number | undefined {
  const raw = typeof value === 'string' ? value.trim() : '';
  const match = ISO_DATE.exec(raw) || ISO_DATETIME.exec(raw);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) return undefined;
  const parsed = ISO_DATE.test(raw) ? Date.UTC(year, month - 1, day) : new Date(raw).valueOf();
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function isIsoDate(value: unknown): value is string {
  return parseIsoTimestamp(value) !== undefined;
}

export function dateOnly(value: string | undefined): string {
  return value ? value.slice(0, 10) : '';
}
