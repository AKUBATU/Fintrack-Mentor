import type { ExpenseTransaction } from '../contexts/DataContext';

export function downloadTransactionsCsv(
  transactions: ExpenseTransaction[],
  periodKey: string,
  fundSourceLabels: Record<string, string>,
) {
  const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const content = [
    ['Tanggal', 'Jenis', 'Kategori', 'Sumber/Merchant', 'Metode', 'Sumber Saldo', 'Jumlah', 'Catatan'].map(escapeCsv).join(','),
    ...transactions.map((transaction) => [
      transaction.date,
      transaction.transactionType,
      transaction.category,
      transaction.merchant,
      transaction.paymentMethod,
      fundSourceLabels[transaction.fundSource] || transaction.fundSource,
      transaction.amount,
      transaction.notes,
    ].map(escapeCsv).join(',')),
  ].join('\n');

  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `fintrack-transaksi-${periodKey}.csv`;
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
