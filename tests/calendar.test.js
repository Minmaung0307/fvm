import test from "node:test";
import assert from "node:assert/strict";
import {
  calendarEventStatus,
  calendarKindLabel,
  filterCalendarEvents,
} from "../public/calendar.js";
import { advanceDate, events as vaultEvents } from "../public/vault.js";

const events = [
  { id: "past", date: "2026-09-18", kind: "due" },
  { id: "today", date: "2026-09-19", kind: "renewal" },
  { id: "future", date: "2026-10-01", kind: "document" },
];

test("calendar filters overdue, today and upcoming events", () => {
  assert.equal(calendarEventStatus(events[0], "2026-09-19"), "overdue");
  assert.equal(calendarEventStatus(events[1], "2026-09-19"), "today");
  assert.equal(calendarEventStatus(events[2], "2026-09-19"), "upcoming");
  assert.deepEqual(
    filterCalendarEvents(events, "overdue", "2026-09-19").map((e) => e.id),
    ["past"],
  );
});

test("calendar labels explain alert types", () => {
  assert.equal(calendarKindLabel("due"), "Payment due");
  assert.equal(calendarKindLabel("document"), "Document expiry");
});

test("paid one-time dues disappear and recurring dues move to the next cycle", () => {
  const oneTime = {
    id: "one",
    name: "One-time bill",
    status: "active",
    dueDate: "2026-09-19",
    paymentStatus: "paid",
    renewalDate: "2027-09-19",
  };
  assert.deepEqual(
    vaultEvents([oneTime]).map((event) => event.kind),
    ["renewal"],
  );
  const recurring = {
    id: "monthly",
    name: "Monthly bill",
    status: "active",
    dueDate: advanceDate("2026-09-19", "monthly"),
    paymentStatus: "unpaid",
  };
  assert.deepEqual(vaultEvents([recurring]), [
    {
      id: "monthly",
      name: "Monthly bill",
      kind: "due",
      date: "2026-10-19",
    },
  ]);
});
