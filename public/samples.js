const base = {
  status: "active",
  favorite: false,
  isExample: true,
  username: "",
  password: "",
  pin: "",
  email: "",
  accountNumber: "",
  currentPlan: "",
  url: "",
  memo: "This is a demo only. Edit it with your own information and save it to create an actual record.",
  renewalDate: "",
  expiryDate: "",
  paymentStatus: "unpaid",
  providerHistory: "",
};
export function exampleRecords(date = new Date().toISOString().slice(0, 10)) {
  const future = new Date(date + "T00:00:00Z");
  future.setUTCDate(future.getUTCDate() + 14);
  return [
    {
      ...base,
      id: crypto.randomUUID(),
      sampleKey: "internet",
      recordType: "bill",
      name: "Demo — Home Internet bill",
      provider: "Verizon (example)",
      category: "Internet",
      group: "Home",
      tags: "Demo, internet, home",
      amount: 79.99,
      frequency: "monthly",
      dueDate: future.toISOString().slice(0, 10),
      currentPlan: "Home internet",
      providerHistory:
        "2026-01-01 — Comcast → Verizon — provider history",
    },
    {
      ...base,
      id: crypto.randomUUID(),
      sampleKey: "insurance",
      recordType: "bill",
      name: "Demo — Car insurance",
      provider: "Example Insurance",
      category: "Insurance",
      group: "Finance",
      tags: "Demo, insurance, car",
      amount: 1200,
      frequency: "yearly",
      dueDate: future.toISOString().slice(0, 10),
    },
    {
      ...base,
      id: crypto.randomUUID(),
      sampleKey: "email",
      recordType: "account",
      name: "Demo — Personal Email account",
      provider: "Example Mail",
      category: "Account",
      group: "Family",
      tags: "Demo, email",
      username: "demo@example.com",
      email: "demo@example.com",
      url: "https://example.com",
      amount: 0,
      frequency: "none",
      dueDate: "",
    },
  ];
}
export function addExamples(value, date) {
  const next = structuredClone(value),
    existing = new Set(
      next.records
        .filter((r) => r.isExample === true)
        .map((r) => r.sampleKey)
        .filter(Boolean),
    );
  for (const sample of exampleRecords(date))
    if (!existing.has(sample.sampleKey)) next.records.push(sample);
  for (const g of ["Home", "Finance", "Family"])
    if (!next.groups.includes(g)) next.groups.push(g);
  next.settings.examplesAdded = true;
  return next;
}

export function resetExamples(value, date) {
  const next = structuredClone(value);
  next.records = next.records.filter((record) => record.isExample !== true);
  return addExamples(next, date);
}
