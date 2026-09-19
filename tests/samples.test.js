import test from "node:test";
import assert from "node:assert/strict";
import { addExamples, resetExamples } from "../public/samples.js";

const emptyVault = () => ({
  records: [],
  groups: [],
  settings: { examplesAdded: true },
});

test("samples can be added again after all samples were deleted", () => {
  const result = addExamples(emptyVault(), "2026-09-19");
  assert.equal(result.records.length, 3);
  assert.deepEqual(
    result.records.map((record) => record.sampleKey).sort(),
    ["email", "insurance", "internet"],
  );
  assert.ok(result.records.every((record) => record.name.startsWith("Demo —")));
  const email = result.records.find((record) => record.sampleKey === "email");
  assert.equal(email.username, "demo@example.com");
  assert.equal(email.email, "demo@example.com");
});

test("resetting samples preserves real records and creates three fresh samples", () => {
  const vault = emptyVault();
  vault.records = [
    { id: "old-sample", isExample: true, sampleKey: "internet" },
    { id: "converted", isExample: false, sampleKey: "insurance", name: "My bill" },
    { id: "real", name: "My account" },
  ];

  const result = resetExamples(vault, "2026-09-19");
  assert.ok(result.records.some((record) => record.id === "converted"));
  assert.ok(result.records.some((record) => record.id === "real"));
  assert.ok(!result.records.some((record) => record.id === "old-sample"));
  assert.equal(result.records.filter((record) => record.isExample === true).length, 3);
  assert.equal(new Set(result.records.map((record) => record.id)).size, 5);
});
