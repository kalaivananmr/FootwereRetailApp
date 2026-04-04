export function formatCurrency(n: number): string {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + 'Cr';
  if (n >= 100000)   return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000)     return '₹' + (n / 1000).toFixed(1) + 'k';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export function formatCurrencyFull(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export const CHART_COLORS = ['#16a34a','#2563eb','#d97706','#dc2626','#7c3aed','#0891b2','#db2777','#65a30d'];
