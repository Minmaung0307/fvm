import test from "node:test";
import assert from "node:assert/strict";
import {
  activePayments,
  groupPaymentsByMonth,
  paymentTotals,
  paymentYears,
} from "../public/payments.js";

const payments = [
  { id: "a", date: "2026-08-05", amount: 80 },
  { id: "b", date: "2026-08-20", amount: 20 },
  { id: "c", date: "2026-07-01", amount: 50 },
  { id: "d", date: "2025-12-01", amount: 10, deletedAt: "2026-01-01" },
];

test("payment history excludes removed entries and groups monthly totals", () => {
  const active = activePayments(payments);
  assert.deepEqual(active.map((payment) => payment.id), ["b", "a", "c"]);
  const groups = groupPaymentsByMonth(active);
  assert.deepEqual(
    groups.map(({ month, total }) => ({ month, total })),
    [
      { month: "2026-08", total: 100 },
      { month: "2026-07", total: 50 },
    ],
  );
});

test("payment summaries calculate year and current month values", () => {
  const active = activePayments(payments);
  assert.deepEqual(paymentYears(active), ["2026"]);
  assert.deepEqual(paymentTotals(active, "2026-08"), {
    total: 150,
    currentMonth: 100,
    count: 3,
    months: 2,
  });
});
