import test from "node:test";
import assert from "node:assert/strict";
import { seasonalEvent } from "../public/seasonal-core.js";

test("fixed seasonal dates use the visitor's local calendar date", () => {
  assert.equal(seasonalEvent(new Date(2026, 6, 4)).name, "Independence Day");
  assert.equal(seasonalEvent(new Date(2026, 11, 25)).name, "Christmas Day");
  assert.equal(seasonalEvent(new Date(2026, 8, 20)), null);
});

test("US floating holidays are calculated for each year", () => {
  assert.equal(seasonalEvent(new Date(2026, 8, 7)).name, "Labor Day");
  assert.equal(seasonalEvent(new Date(2026, 10, 26)).name, "Thanksgiving Day");
  assert.equal(seasonalEvent(new Date(2027, 10, 25)).name, "Thanksgiving Day");
});
