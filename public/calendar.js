export const CALENDAR_FILTERS = ["all", "overdue", "today", "upcoming"];

export function calendarEventStatus(event, currentDate) {
  if (event.date < currentDate) return "overdue";
  if (event.date === currentDate) return "today";
  return "upcoming";
}

export function filterCalendarEvents(events, filter, currentDate) {
  if (filter === "all") return events;
  return events.filter(
    (event) => calendarEventStatus(event, currentDate) === filter,
  );
}

export function calendarKindLabel(kind) {
  return (
    {
      due: "Payment due",
      renewal: "Renewal",
      expiry: "Expiry",
      document: "Document expiry",
    }[kind] || kind
  );
}
