/**
 * Returns "YYYY-MM-DD" using the device's local calendar date.
 *
 * `date.toISOString().split('T')[0]` looks equivalent but converts to UTC first,
 * so in timezones ahead of UTC (WIB/WITA/WIT are all UTC+7/+8/+9) it silently
 * rolls back to the previous day between local midnight and the UTC offset hour
 * (e.g. 00:00-06:59 WIB). This is the local-date-safe replacement.
 */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
