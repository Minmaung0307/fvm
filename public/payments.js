export function activePayments(payments) {
  return payments
    .filter((payment) => !payment.deletedAt)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function paymentYears(payments) {
  return [...new Set(payments.map((payment) => payment.date.slice(0, 4)))]
    .filter((year) => /^\d{4}$/.test(year))
    .sort((a, b) => b.localeCompare(a));
}

export function groupPaymentsByMonth(payments) {
  const groups = new Map();
  for (const payment of payments) {
    const month = /^\d{4}-\d{2}/.test(payment.date)
      ? payment.date.slice(0, 7)
      : "Unknown";
    if (!groups.has(month)) groups.set(month, []);
    groups.get(month).push(payment);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, entries]) => ({
      month,
      entries,
      total: entries.reduce(
        (sum, payment) => sum + (Number(payment.amount) || 0),
        0,
      ),
    }));
}

export function paymentTotals(payments, currentMonth) {
  return {
    total: payments.reduce(
      (sum, payment) => sum + (Number(payment.amount) || 0),
      0,
    ),
    currentMonth: payments
      .filter((payment) => payment.date.startsWith(currentMonth))
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
    count: payments.length,
    months: new Set(payments.map((payment) => payment.date.slice(0, 7))).size,
  };
}
