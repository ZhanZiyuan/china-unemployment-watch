export const HISTORY_START = '2023-01-01';
export const INITIAL_END = '2026-11-17';
export const BUSINESS_ZONE = 'Asia/Shanghai';
const shanghai = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

export function businessDate(time: Date | string): string {
  const parts = shanghai.formatToParts(new Date(time));
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function shanghaiTimestamp(time: string) {
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(new Date(time));
  return `${businessDate(time)}T${clock}+08:00`;
}

export function dayNumber(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}

export function isoDay(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function shiftDay(date: string, days: number) {
  return isoDay(dayNumber(date) + days * 86_400_000);
}

export function shiftMonth(date: string, months: number) {
  return isoDay(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1 + months, 1));
}

export function monthPeriod(year: number, month: number) {
  return {
    start: isoDay(Date.UTC(year, month - 1, 1)),
    end: isoDay(Date.UTC(year, month, 0)),
  };
}

export function endOfMonth(day: string) {
  return shiftDay(shiftMonth(day, 1), -1);
}
