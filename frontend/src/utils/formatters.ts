const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
});

const currencyFormatters = new Map<string, Intl.NumberFormat>();

export function formatCurrency(value: number): string {
  return idrFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatCurrencyCode(value: number, currency = 'IDR'): string {
  const normalized = currency || 'IDR';
  let formatter = currencyFormatters.get(normalized);
  if (!formatter) {
    formatter = new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: normalized, minimumFractionDigits: 0, maximumFractionDigits: 2,
    });
    currencyFormatters.set(normalized, formatter);
  }
  return formatter.format(Number.isFinite(value) ? value : 0);
}

export function formatLocalDate(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = value instanceof Date ? value : new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', options).format(date);
}

export function toLocalDateValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
