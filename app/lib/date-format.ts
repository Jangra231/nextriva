/**
 * UTC-safe date formatting for SSR hydration.
 * All dates are treated as UTC on both server and client.
 * Matches en-IN locale output without timezone variance.
 */

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export function formatUTCDate(value: Date | string | null): string {
  if (!value) return "To be confirmed";
  const d = new Date(value);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatUTCDateShort(value: Date | string | null): string {
  if (!value) return "Date to be confirmed";
  const d = new Date(value);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatUTCDateWithWeekday(value: Date | string | null): string {
  if (!value) return "To be confirmed";
  const d = new Date(value);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatUTCDateWeekdayShort(value: Date | string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return `${WEEKDAYS[d.getUTCDay()].slice(0, 3)}, ${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

export function formatUTCDayOfWeekShort(value: Date | string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return WEEKDAYS[d.getUTCDay()].slice(0, 3);
}

export function formatUTCDateTime(value: Date | string | null): string {
  if (!value) return "To be confirmed";
  const d = new Date(value);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const timeStr = `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${timeStr}`;
}

export function formatUTCTime(value: Date | string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

export function formatIndianCurrency(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function formatIndianCurrencyPrecise(paise: number): string {
  return `₹${(Math.max(0, paise) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatIndianNumber(value: number): string {
  return value.toLocaleString("en-IN");
}

