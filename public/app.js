import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  setPersistence,
  inMemoryPersistence,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { tips, guideMarkup } from "./guide.js";
import { addExamples, resetExamples } from "./samples.js";
import { categories, organize, sortedRecords } from "./organizer.js";
import { PAGE_SIZES, paginate, pageTokens } from "./pagination.js";
import {
  CALENDAR_FILTERS,
  calendarEventStatus,
  calendarKindLabel,
  filterCalendarEvents,
} from "./calendar.js";
import {
  activePayments,
  groupPaymentsByMonth,
  paymentTotals,
  paymentYears,
} from "./payments.js";
import { config } from "./config.js";
import {
  deriveKey,
  seal,
  unseal,
  events,
  advanceDate,
  sealBytes,
  unsealBytes,
  initialData,
  normalize,
  allEvents,
  to64,
  from64,
} from "./vault.js";
const $ = (s) => document.querySelector(s),
  E = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let tooltipSource = null;
let auth,
  user,
  key,
  docKey,
  googleToken = "",
  data = initialData(),
  snapshot,
  view = "records",
  generation = 0,
  busy = false,
  lastActivity = Date.now(),
  notified = new Set(),
  documentTypeFilter = "all",
  previewDocumentId = "",
  previewUrl = "",
  thumbnailUrls = new Set(),
  quickFilter = "all",
  recordPage = 1,
  documentPage = 1,
  calendarFilter = "all",
  paymentYearFilter = "all",
  paymentHistoryMode = "history",
  pageSize = (() => {
    try {
      const saved = Number(localStorage.getItem("family-vault-page-size"));
      return PAGE_SIZES.includes(saved) ? saved : 20;
    } catch {
      return 20;
    }
  })();
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const money = (n) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: config.currency,
  }).format(Number(n) || 0);
function message(s) {
  $("#message").textContent = s;
}
function paginationMarkup(pageData, collection) {
  if (!pageData.total) return "";
  const pageButton = (page, label, current = false, disabled = false) =>
    `<button type="button" data-action="page" data-collection="${collection}" data-page="${page}"${current ? ' aria-current="page"' : ""}${disabled ? ' aria-disabled="true"' : ""}>${label}</button>`;
  const numbers = pageTokens(pageData.page, pageData.pages)
    .map((token) =>
      token === "…"
        ? '<span class="page-ellipsis" aria-hidden="true">…</span>'
        : pageButton(token, token, token === pageData.page),
    )
    .join("");
  return `<nav class="pagination" aria-label="${collection === "records" ? "Records" : "Documents"} pages"><span class="page-summary">Showing ${pageData.start}–${pageData.end} of ${pageData.total}</span><label class="page-size">Show <select data-page-size="${collection}" aria-label="Items per page">${PAGE_SIZES.map((size) => `<option value="${size}"${size === pageData.size ? " selected" : ""}>${size}</option>`).join("")}</select></label><div class="page-buttons">${pageButton(pageData.page - 1, "← Previous", false, pageData.page === 1)}<span class="desktop-page-numbers">${numbers}</span><span class="mobile-page-number">Page ${pageData.page} of ${pageData.pages}</span>${pageButton(pageData.page + 1, "Next →", false, pageData.page === pageData.pages)}</div></nav>`;
}
function lock() {
  generation++;
  clearDocumentUrls();
  closeDocumentPreview();
  key = null;
  docKey = null;
  data = initialData();
  snapshot = null;
  $("#content").replaceChildren();
  $("#stats").replaceChildren();
  $("#recordForm").reset();
  $("#editor").close();
  $("#backupPrompt").close();
  $("#docEditor").close();
  $("#passEditor").close();
  $("#organizerDialog").close();
  $("#paymentDialog").close();
  $("#organizerForm").reset();
  $("#paymentForm").reset();
  $("#paymentName").textContent = "";
  $("#categoriesList").replaceChildren();
  $("#docForm").reset();
  $("#passForm").reset();
  hideTooltip();
  $("#settingsPanel").hidden = true;
  $("#groupsList").replaceChildren();
  $("#driveInfo").replaceChildren();
  $("#workspace").hidden = true;
  $("#gate").hidden = false;
  $("#unlockForm").hidden = !user;
  $("#lock").hidden = true;
  $("#passphrase").value = "";
  $("#confirmPass").value = "";
  message("Vault locked.");
}
async function api(action, extra = {}) {
  if (!user || !googleToken)
    throw Error("Google login နှင့် Drive permission လိုအပ်ပါသည်။");
  const idToken = await user.getIdToken();
  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, idToken, googleToken, ...extra }),
    redirect: "follow",
    cache: "no-store",
  });
  if (!response.ok) throw Error("Backend connection failed");
  const result = await response.json();
  if (!result.ok) throw Error(result.error || "Request failed");
  return result;
}
async function run(fn) {
  if (busy) return;
  busy = true;
  $("#workspace").setAttribute("aria-busy", "true");
  $("#busyIndicator").hidden = false;
  document.querySelectorAll("button").forEach((b) => (b.disabled = true));
  try {
    await fn();
  } catch (e) {
    message(e.message);
  } finally {
    busy = false;
    $("#workspace").setAttribute("aria-busy", "false");
    $("#busyIndicator").hidden = true;
    document.querySelectorAll("button").forEach((b) => (b.disabled = false));
  }
}
async function commit(next) {
  const g = generation;
  const box = await seal(next, key);
  if (g !== generation) return;
  const reminders = allEvents(next).map((e) => ({
    kind: e.kind,
    date: e.date,
  }));
  const result = await api("save", {
    revision: snapshot.revision,
    box,
    reminders,
    emailReminders: next.settings.emailReminders === true,
  });
  if (g !== generation) return;
  data = next;
  snapshot = { ...snapshot, box, revision: result.revision };
  render();
  message(
    result.reminderConfigured === false
      ? "Data saved; email reminder configuration failed. Retry save or contact admin."
      : "Encrypted save",
  );
}
const onlinePattern =
  /(github|vercel|firebase|godaddy|squarespace|cloudflare|netlify|hosting|domain|website|repository|developer|stripe|paypal|google cloud|aws|azure)/i;
function isOnlineAccount(r) {
  return (
    (r.recordType || "account") === "account" &&
    onlinePattern.test(
      [r.name, r.provider, r.category, r.group, r.tags, r.memo, r.url].join(
        " ",
      ),
    )
  );
}
function recordSearchText(r) {
  const frequencyTerms = {
    monthly: "monthly monthly pay every month",
    quarterly: "quarterly 3mo 3 months every 3 months",
    "four-month": "4mo 4 months every 4 months",
    semiannual: "semiannual 6mo 6 months every 6 months",
    yearly: "yearly annual every year",
    "one-time": "one time once",
  };
  return [
    r.name,
    r.provider,
    r.username,
    r.email,
    r.memo,
    r.providerHistory,
    r.tags,
    r.group,
    r.category,
    r.url,
    r.accountState,
    r.paymentStatus,
    cycleLabels[r.accountState],
    cycleLabels[r.frequency],
    frequencyTerms[r.frequency],
    r.paymentStatus === "autopay" || r.accountState === "autopay"
      ? "autopay auto pay automatic payment"
      : "",
    isOnlineAccount(r)
      ? "online account cloud hosting domain website developer"
      : "",
  ]
    .join(" ")
    .toLowerCase();
}
function smartFilterMatch(r, filter = quickFilter) {
  const now = today(),
    dates = [r.dueDate, r.renewalDate, r.expiryDate].filter(Boolean).sort(),
    next = dates[0] || "";
  if (filter === "all") return true;
  if (filter === "autopay")
    return r.paymentStatus === "autopay" || r.accountState === "autopay";
  if (filter === "monthly") return r.frequency === "monthly";
  if (filter === "quarterly") return r.frequency === "quarterly";
  if (filter === "four-month") return r.frequency === "four-month";
  if (filter === "semiannual") return r.frequency === "semiannual";
  if (filter === "yearly") return r.frequency === "yearly";
  if (filter === "one-time") return r.frequency === "one-time";
  if (filter === "online") return isOnlineAccount(r);
  if (filter === "due-soon") return next >= now && next <= addDays(now, 30);
  if (filter === "overdue") return !!next && next < now;
  if (filter === "paid-off")
    return r.accountState === "paid-off" || r.accountState === "owned-outright";
  return true;
}
const quickFilterDefinitions = [
  ["all", "All"],
  ["autopay", "Autopay"],
  ["monthly", "Monthly"],
  ["quarterly", "Every 3 mo"],
  ["four-month", "Every 4 mo"],
  ["semiannual", "Every 6 mo"],
  ["yearly", "Yearly"],
  ["one-time", "One-time"],
  ["online", "Online accounts"],
  ["due-soon", "Due soon"],
  ["overdue", "Overdue"],
  ["paid-off", "Paid off"],
];
function renderQuickFilters() {
  const base = data.records.filter(
    (r) => r.status === "active" && !r.isExample,
  );
  $("#quickFilters").innerHTML =
    '<span class="quick-filters-label">Quick</span>' +
    quickFilterDefinitions
      .map(
        ([value, label]) =>
          `<button type="button" data-quick-filter="${value}" aria-pressed="${quickFilter === value}">${E(label)}<span>${base.filter((r) => smartFilterMatch(r, value)).length}</span></button>`,
      )
      .join("");
}
function selected() {
  const q = $("#search").value.trim().toLowerCase();
  return sortedRecords(
    data.records.filter(
      (r) =>
        ($("#recordType").value === "all" ||
          (r.recordType || "account") === $("#recordType").value) &&
        ($("#groupFilter").value === "all" ||
          r.group === $("#groupFilter").value) &&
        ($("#favoriteFilter").value === "all" || r.favorite) &&
        ($("#status").value === "all" || r.status === $("#status").value) &&
        ($("#category").value === "all" ||
          r.category === $("#category").value) &&
        smartFilterMatch(r) &&
        recordSearchText(r).includes(q),
    ),
    $("#sortOrder").value,
  );
}
function monthlyAverage(record) {
  if (record.recordType !== "bill") return 0;
  const amount = Number(record.amount) || 0;
  return record.frequency === "monthly"
    ? amount
    : record.frequency === "quarterly"
      ? amount / 3
      : record.frequency === "four-month"
        ? amount / 4
        : record.frequency === "semiannual"
          ? amount / 6
          : record.frequency === "yearly"
            ? amount / 12
            : 0;
}
function addDays(date, days) {
  const value = new Date(date + "T00:00:00Z");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function paymentMonthLabel(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  return new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}
function renderPaymentHistory() {
  const allActive = activePayments(data.payments);
  const query = $("#search").value.trim().toLowerCase();
  const searched = allActive.filter((payment) =>
    [payment.name, payment.memo, payment.date, payment.amount]
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
  const years = paymentYears(searched);
  if (paymentYearFilter !== "all" && !years.includes(paymentYearFilter))
    paymentYearFilter = "all";
  const visible =
    paymentYearFilter === "all"
      ? searched
      : searched.filter((payment) =>
          payment.date.startsWith(paymentYearFilter),
        );
  const groups = groupPaymentsByMonth(visible);
  const totals = paymentTotals(allActive, today().slice(0, 7));
  const trashed = data.payments
    .filter((payment) => payment.deletedAt)
    .sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));
  $("#resultCount").textContent = `${allActive.length} payments · ${money(totals.total)} recorded`;
  const tabs = `<div class="payment-tabs" role="group" aria-label="Payment history view"><button type="button" data-action="paymentMode" data-mode="history" aria-pressed="${paymentHistoryMode === "history"}">History <span>${allActive.length}</span></button><button type="button" data-action="paymentMode" data-mode="trash" aria-pressed="${paymentHistoryMode === "trash"}">Recently removed <span>${trashed.length}</span></button></div>`;
  if (paymentHistoryMode === "trash") {
    $("#content").innerHTML = `<section class="payment-intro"><div><span class="eyebrow">PAYMENT RECORDS</span><h2>Recently removed</h2><p>Restore a payment removed by mistake, or delete it permanently.</p></div>${tabs}</section><div class="payment-trash-list">${trashed.length ? trashed.map((payment) => `<div class="payment-trash-row"><time>${E(payment.date)}</time><span><strong>${E(payment.name)}</strong><small>${E(payment.memo || "No memo")}</small></span><strong>${money(payment.amount)}</strong><div><button type="button" data-action="restorePayment" data-id="${E(payment.id)}">Restore</button><button type="button" class="danger" data-action="deletePaymentPermanent" data-id="${E(payment.id)}">Delete permanently</button></div></div>`).join("") : '<div class="payment-empty"><span aria-hidden="true">✓</span><h3>No removed payments</h3><p>Payments removed from history can be restored here.</p></div>'}</div>`;
    return;
  }
  $("#content").innerHTML = `<section class="payment-intro"><div><span class="eyebrow">PAYMENT RECORDS</span><h2>Monthly payment history</h2><p>Payments are grouped by paid month. These entries record payments; they do not transfer money.</p></div>${tabs}</section><div class="payment-summary"><div><span>Total recorded</span><strong>${money(totals.total)}</strong></div><div><span>This month</span><strong>${money(totals.currentMonth)}</strong></div><div><span>Payments</span><strong>${totals.count}</strong></div><div><span>Months tracked</span><strong>${totals.months}</strong></div></div><div class="payment-controls"><label>Year <select data-payment-year><option value="all">All years</option>${paymentYears(allActive).map((year) => `<option value="${year}"${paymentYearFilter === year ? " selected" : ""}>${year}</option>`).join("")}</select></label><span>${visible.length} payment${visible.length === 1 ? "" : "s"}</span></div><div class="payment-months">${groups.length ? groups.map((group, index) => `<details class="payment-month"${index === 0 ? " open" : ""}><summary><span><strong>${E(paymentMonthLabel(group.month))}</strong><small>${group.entries.length} payment${group.entries.length === 1 ? "" : "s"}</small></span><strong>${money(group.total)}</strong></summary><div class="payment-table-wrap"><table class="payment-table"><thead><tr><th>Paid date</th><th>Bill / service</th><th>Memo</th><th>Amount</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${group.entries.map((payment) => `<tr><td data-label="Paid date">${E(payment.date)}</td><td data-label="Bill / service"><strong>${E(payment.name)}</strong></td><td data-label="Memo">${E(payment.memo || "—")}</td><td data-label="Amount"><strong>${money(payment.amount)}</strong></td><td class="payment-actions"><button type="button" data-action="trashPayment" data-id="${E(payment.id)}">Remove</button></td></tr>`).join("")}</tbody></table></div></details>`).join("") : '<div class="payment-empty"><span aria-hidden="true">↗</span><h3>No payments found</h3><p>Record a payment from an actual Bill, or choose another year.</p></div>'}</div>`;
}
function render() {
  if (!key) return;
  refreshGroups();
  const all = allEvents(data),
    now = today(),
    soon = new Date(`${now}T00:00:00Z`);
  soon.setUTCDate(soon.getUTCDate() + 30);
  const end = soon.toISOString().slice(0, 10);
  const active = data.records.filter(
    (r) => r.status === "active" && !r.isExample,
  );
  const next30 = addDays(now, 30),
    next90 = addDays(now, 90),
    next180 = addDays(now, 180);
  const monthStart = now.slice(0, 7) + "-01",
    monthEnd = new Date(
      Date.UTC(Number(now.slice(0, 4)), Number(now.slice(5, 7)), 0),
    )
      .toISOString()
      .slice(0, 10);
  const realBills = active.filter((r) => r.recordType === "bill");
  const dashboardStats = [
    ["Active records", active.length, "stat-active"],
    ["Due today", all.filter((e) => e.date === now).length, "stat-today"],
    ["Overdue alerts", all.filter((e) => e.date < now).length, "stat-overdue"],
    [
      "Next 30 days",
      all.filter((e) => e.date > now && e.date <= next30).length,
      "stat-next30",
    ],
    [
      "Next 90 days",
      all.filter((e) => e.date > now && e.date <= next90).length,
      "stat-next90",
    ],
    [
      "Next 180 days",
      all.filter((e) => e.date > now && e.date <= next180).length,
      "stat-next180",
    ],
    [
      "Bills due this month",
      money(
        realBills
          .filter((r) => r.dueDate >= monthStart && r.dueDate <= monthEnd)
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
      ),
      "stat-month-due",
    ],
    [
      "Average / month",
      money(realBills.reduce((sum, r) => sum + monthlyAverage(r), 0)),
      "stat-average",
    ],
  ];
  $("#stats").innerHTML = dashboardStats
    .map(
      ([label, value, className]) =>
        `<div class="stat ${className}">${E(label)}<strong>${E(value)}</strong></div>`,
    )
    .join("");
  renderQuickFilters();
  const records = selected(),
    recordPages = paginate(records, recordPage, pageSize),
    ids = new Set(records.map((r) => r.id));
  recordPage = recordPages.page;
  $("#collectionTitle").textContent = {
    records: "Accounts & bills",
    documents: "Important Docs",
    calendar: "Calendar & alerts",
    history: "Payment history",
    settings: "Groups & settings",
  }[view];
  $("#resultCount").textContent =
    view === "records"
      ? `${records.length} records · sample bills estimate / alerts NOT calculated`
      : view === "documents"
        ? `${data.documents.filter(matchesDocument).length} documents`
        : "";
  $("#recordType").hidden = view === "documents";
  $("#category").hidden = view === "documents";
  $("#quickFilters").hidden = view !== "records";
  $("#filtersToggle").hidden = view === "history";
  $("#filterPanel").hidden = view === "history";
  $("#search").placeholder =
    view === "history"
      ? "Search payment name, memo, date, amount…"
      : "Name, provider, memo…";
  $("#settingsPanel").hidden = view !== "settings";
  $(".toolbar").hidden = view === "settings";
  $("#content").hidden = view === "settings";
  if (view === "settings") renderSettings();
  if (view === "documents") renderDocuments();
  if (view === "records")
    $("#content").innerHTML =
      `<div class="cards">${recordPages.items.map((r) => `<article class="card ${r.isExample ? "example-card" : ""}"><div class="record-icon" aria-hidden="true">${r.recordType === "bill" ? "↗" : "◈"}</div>${r.isExample ? '<span class="example-label">Demo</span>' : ""}<span class="tag">${E(r.category)} · ${E(r.group || "Ungrouped")} · ${E(r.status)}</span><h3>${r.favorite ? "★ " : ""}${E(r.name)}</h3><p class="muted">${E(r.tags || "")}</p><p class="muted">${E(r.provider || "—")}${r.recordType === "bill" ? ` · ${E(cycleLabels[r.frequency] || r.frequency)}` : ""}</p>${r.recordType === "bill" ? `<strong class="bill-amount">${money(r.amount)}<small> / ${E(cycleLabels[r.frequency] || r.frequency)}</small></strong>` : `<p class="muted account-identity">${E(r.username || r.email || "No username or email")}</p><p class="muted">Account record</p>${r.accountState && r.accountState !== "not-applicable" ? `<span class="account-state">${E(cycleLabels[r.accountState] || r.accountState)}</span>` : ""}`}<dl>${r.recordType === "bill" ? `<dt>Due</dt><dd>${E(r.dueDate || "—")}</dd><dt>Renewal</dt><dd>${E(r.renewalDate || "—")}</dd><dt>Payment</dt><dd>${E(r.paymentStatus || "unpaid")}</dd>` : `<dt>Renewal</dt><dd>${E(r.renewalDate || "—")}</dd><dt>Expiry</dt><dd>${E(r.expiryDate || "—")}</dd>`}</dl><details><summary>Account details</summary><dl>${["username", "email", "accountNumber", "currentPlan", "url", "expiryDate", "memo", "providerHistory"].map((k) => `<dt>${E(k)}</dt><dd>${E(r[k] || "—")}</dd>`).join("")}</dl><button data-action="reveal" data-id="${E(r.id)}">Show password</button><span class="password"></span></details><button data-action="favorite" data-id="${E(r.id)}">${r.favorite ? "★" : "☆"}</button><button data-action="edit" data-id="${E(r.id)}">Edit</button>${r.recordType === "bill" ? `<button data-action="pay" data-id="${E(r.id)}">Record payment</button>` : ""}<button data-action="duplicate" data-id="${E(r.id)}">Duplicate</button><button data-action="deleteRecord" class="danger" data-id="${E(r.id)}">Delete</button><button data-action="archive" data-id="${E(r.id)}">${r.status === "archived" ? "Activate" : "Archive"}</button></article>`).join("")}</div>${paginationMarkup(recordPages, "records")}`;
  if (view === "calendar") renderCalendar(all, ids);
  if (view === "history") renderPaymentHistory();
  if (!$("#content").textContent.trim())
    $("#content").innerHTML =
      '<div class="empty-state"><span aria-hidden="true">◈</span><h3>Save in one place.</h3><p>No records or No filter criteria match.</p><p>You can add new Accounts or Bills.</p><button data-action="emptyAdd">＋ Account</button></div>';
  attachHelp();
  updateBrowserAlertButton();
  void checkAlerts();
}
const fields = [
  ["recordType", "Record type", "select", ["account", "bill"]],
  ["group", "Group", "select", initialData().groups],
  ["tags", "Tags (comma separated)", "text"],
  ["name", "Name", "text"],
  [
    "category",
    "Category",
    "select",
    [
      "Account",
      "Phone",
      "Internet",
      "Mortgage",
      "Utilities",
      "Insurance",
      "Subscription",
      "Other",
    ],
  ],
  ["provider", "Provider", "text"],
  ["status", "Status", "select", ["active", "closed", "archived"]],
  ["username", "Username", "text"],
  ["password", "Password", "password"],
  ["pin", "PIN", "password"],
  ["currentPlan", "Current plan", "text"],
  ["url", "URL", "url"],
  ["email", "Email", "email"],
  ["accountNumber", "Account number", "text"],
  [
    "accountState",
    "Account / service status",
    "select",
    [
      "not-applicable",
      "active-current",
      "inactive",
      "financed",
      "paid-off",
      "owned-outright",
      "leased-rented",
      "sold-transferred",
      "autopay",
      "cancelled",
      "switched-provider",
      "closed",
    ],
  ],
  ["amount", "Amount", "number"],
  [
    "frequency",
    "Billing cycle",
    "select",
    [
      "none",
      "monthly",
      "quarterly",
      "four-month",
      "semiannual",
      "yearly",
      "one-time",
    ],
  ],
  ["dueDate", "Due date", "date"],
  ["expiryDate", "Expiry date", "date"],
  ["renewalDate", "Renewal date", "date"],
  [
    "paymentStatus",
    "Payment status",
    "select",
    ["unpaid", "paid", "autopay", "pending"],
  ],
  ["memo", "Memo", "text"],
];
const basicNames = [
  "name",
  "recordType",
  "group",
  "category",
  "provider",
  "status",
  "tags",
];
const credentialNames = [
  "username",
  "password",
  "pin",
  "email",
  "accountNumber",
  "currentPlan",
  "url",
  "accountState",
];
const billNames = ["amount", "frequency", "dueDate", "paymentStatus"];
const cycleLabels = {
  none: "None",
  monthly: "Monthly",
  quarterly: "Quarterly / 3 mo",
  "four-month": "Every 4 months",
  semiannual: "Semiannual / 6 mo",
  yearly: "Annual / yearly",
  "one-time": "One time",
  "not-applicable": "Not applicable",
  "active-current": "Active / current",
  inactive: "Inactive",
  financed: "Financed",
  "paid-off": "Paid off",
  "owned-outright": "Owned outright",
  "leased-rented": "Leased / rented",
  "sold-transferred": "Sold / transferred",
  autopay: "Autopay",
  cancelled: "Cancelled",
  "switched-provider": "Switched provider",
  closed: "Closed",
};
function fieldMarkup([name, label, type, options]) {
  return `<label class="field-label">${E(label)}${type === "select" ? `<select name="${name}">${options.map((o) => `<option value="${o}">${E(cycleLabels[o] || o)}</option>`).join("")}</select>` : `<input name="${name}" type="${type}" ${name === "name" ? 'required maxlength="150"' : ""} ${type === "number" ? 'min="0" step="0.01"' : ""} autocomplete="off">`}</label>`;
}
const accountStateProfiles = {
  asset: [
    "not-applicable",
    "financed",
    "paid-off",
    "owned-outright",
    "leased-rented",
    "sold-transferred",
  ],
  service: [
    "not-applicable",
    "active-current",
    "autopay",
    "cancelled",
    "switched-provider",
    "closed",
  ],
  account: ["not-applicable", "active-current", "inactive", "closed"],
};
function accountStateProfile() {
  const form = $("#recordForm"),
    category = String(form.elements.category.value || "").toLowerCase(),
    text = [
      form.elements.name.value,
      form.elements.provider.value,
      form.elements.group.value,
    ]
      .join(" ")
      .toLowerCase();
  if (
    category === "mortgage" ||
    /(car|vehicle|auto|house|home|mortgage|property|loan)/.test(text)
  )
    return "asset";
  if (
    ["phone", "internet", "utilities", "insurance", "subscription"].includes(
      category,
    ) ||
    /(verizon|wireless|utility|electric|water|internet|insurance|subscription)/.test(
      text,
    )
  )
    return "service";
  return "account";
}
function updateAccountStateOptions() {
  const select = $("#recordForm").elements.accountState,
    current = select.value || "not-applicable",
    profile = accountStateProfile(),
    options = [...accountStateProfiles[profile]];
  if (current && !options.includes(current)) options.push(current);
  select.innerHTML = options
    .map(
      (value) =>
        `<option value="${value}">${E(cycleLabels[value] || value)}</option>`,
    )
    .join("");
  select.value = options.includes(current) ? current : "not-applicable";
  select.dataset.profile = profile;
}
for (const [selector, names] of [
  ["#fields", basicNames],
  ["#credentialFields", credentialNames],
  ["#billingFields", billNames],
])
  $(selector).innerHTML = names
    .map((name) => fieldMarkup(fields.find((f) => f[0] === name)))
    .join("");
$("#dateFields").innerHTML = fields
  .filter(
    (f) =>
      !basicNames.includes(f[0]) &&
      !credentialNames.includes(f[0]) &&
      !billNames.includes(f[0]),
  )
  .map(fieldMarkup)
  .join("");
function setRecordSections() {
  const isBill = $("#recordForm").elements.recordType.value === "bill";
  $("#billingSection").hidden = !isBill;
  $("#credentialsSection").open = !isBill;
}
$("#recordForm").elements.recordType.addEventListener("change", () => {
  if (
    $("#recordForm").elements.recordType.value === "bill" &&
    $("#recordForm").elements.frequency.value === "none"
  )
    $("#recordForm").elements.frequency.value = "monthly";
  setRecordSections();
});
for (const name of ["name", "category", "provider", "group"])
  $("#recordForm").elements[name].addEventListener(
    "input",
    updateAccountStateOptions,
  );

function edit(id, type = "account", draft) {
  const r = draft ||
    data.records.find((r) => r.id === id) || {
      recordType: type,
      status: "active",
      category: type === "bill" ? "Other" : "Account",
      frequency: type === "bill" ? "monthly" : "none",
      paymentStatus: "unpaid",
      accountState: "not-applicable",
      amount: 0,
    };
  $("#recordForm").reset();
  for (const [k, v] of Object.entries(r)) {
    const el = $("#recordForm").elements.namedItem(k);
    if (el) el.value = v;
  }
  $("#delete").hidden = !id;
  $("#editorTitle").textContent = id ? "Edit record" : "Add new record";
  updateAccountStateOptions();
  setRecordSections();
  $("#editor").showModal();
  attachHelp();
}
$("#recordForm").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    const r = Object.fromEntries(new FormData(e.target));
    r.id = r.id || crypto.randomUUID();
    r.amount = Number(r.amount);
    const old = data.records.find((x) => x.id === r.id);
    r.favorite = old?.favorite || false;
    r.isExample = false;
    delete r.sampleKey;
    r.createdAt = old?.createdAt || new Date().toISOString();
    r.updatedAt = new Date().toISOString();
    const next = structuredClone(data);
    const index = next.records.findIndex((x) => x.id === r.id);
    if (index < 0) next.records.push(r);
    else next.records[index] = r;
    await commit(next);
    $("#editor").close();
    e.target.reset();
  });
};
function deleteRecord(id) {
  run(async () => {
    if (
      !confirm("Permanently delete this record? Its payment history will be retained. Proceed?")
    )
      return;
    const next = structuredClone(data);
    next.records = next.records.filter((r) => r.id !== id);
    await commit(next);
    $("#editor").close();
    $("#recordForm").reset();
  });
}
$("#delete").onclick = () => deleteRecord($("#recordForm").elements.id.value);
$("#content").onclick = (e) => {
  const b = e.target.closest("button[data-action]");
  if (!b) return;
  if (b.dataset.action === "page") {
    if (b.getAttribute("aria-disabled") === "true") return;
    const requested = Number(b.dataset.page);
    if (b.dataset.collection === "documents") documentPage = requested;
    else recordPage = requested;
    render();
    requestAnimationFrame(() =>
      $(".collection-heading")?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      }),
    );
    return;
  }
  if (b.dataset.action === "paymentMode") {
    paymentHistoryMode = b.dataset.mode === "trash" ? "trash" : "history";
    renderPaymentHistory();
    return;
  }
  if (
    ["trashPayment", "restorePayment", "deletePaymentPermanent"].includes(
      b.dataset.action,
    )
  ) {
    const payment = data.payments.find((item) => item.id === b.dataset.id);
    if (!payment) return;
    if (
      b.dataset.action === "trashPayment" &&
      !confirm("Remove this payment from the monthly history? You can restore it from Recently removed.")
    )
      return;
    if (
      b.dataset.action === "deletePaymentPermanent" &&
      !confirm("Permanently delete this payment record? This cannot be undone.")
    )
      return;
    run(async () => {
      const next = structuredClone(data);
      const target = next.payments.find((item) => item.id === b.dataset.id);
      if (b.dataset.action === "trashPayment")
        target.deletedAt = new Date().toISOString();
      if (b.dataset.action === "restorePayment") delete target.deletedAt;
      if (b.dataset.action === "deletePaymentPermanent")
        next.payments = next.payments.filter((item) => item.id !== b.dataset.id);
      await commit(next);
    });
    return;
  }
  if (b.dataset.action === "docFilter") {
    documentTypeFilter = b.dataset.kind;
    documentPage = 1;
    renderDocuments();
    return;
  }
  if (b.dataset.action === "docPurgeExpired") {
    purgeExpiredDocuments();
    return;
  }
  const r = data.records.find((r) => r.id === b.dataset.id);
  if (b.dataset.action === "deleteRecord") return deleteRecord(r.id);
  if (b.dataset.action === "duplicate") {
    const draft = { ...r, id: "", name: r.name + " (copy)" };
    delete draft.sampleKey;
    return edit(undefined, r.recordType, draft);
  }
  if (b.dataset.action === "pay") return openPayment(r);
  if (b.dataset.action === "emptyAdd") return edit();
  if (b.dataset.action === "edit") {
    if (r) return edit(r.id);
    return editDocument(b.dataset.id);
  }
  if (b.dataset.action.startsWith("doc"))
    return documentAction(b.dataset.action, b.dataset.id);
  if (b.dataset.action === "reveal") {
    const out = b.parentElement.querySelector(".password");
    out.textContent = out.textContent ? "" : r.password || "—";
    b.textContent = out.textContent ? "Hide password" : "Show password";
    return;
  }
  run(async () => {
    const next = structuredClone(data);
    const record = next.records.find((x) => x.id === b.dataset.id);
    if (b.dataset.action === "favorite") record.favorite = !record.favorite;
    if (b.dataset.action === "archive")
      record.status = record.status === "archived" ? "active" : "archived";
    if (b.dataset.action === "removePayment") {
      if (
        !confirm(
          "Delete this payment history entry? Due date will not be changed.",
        )
      )
        return;
      next.payments = next.payments.filter((p) => p.id !== b.dataset.id);
    }
    await commit(next);
  });
};
$("#content").addEventListener("change", (e) => {
  const year = e.target.closest("select[data-payment-year]");
  if (year) {
    paymentYearFilter = year.value;
    renderPaymentHistory();
    return;
  }
  const select = e.target.closest("select[data-page-size]");
  if (!select) return;
  const requested = Number(select.value);
  if (!PAGE_SIZES.includes(requested)) return;
  pageSize = requested;
  recordPage = 1;
  documentPage = 1;
  try {
    localStorage.setItem("family-vault-page-size", String(pageSize));
  } catch {}
  render();
});
$("#cancel").onclick = () => {
  $("#editor").close();
  $("#recordForm").reset();
};
$("#editor").addEventListener("close", () => $("#recordForm").reset());
$("#add").onclick = () => edit();
$("#addBill").onclick = () => edit(undefined, "bill");
$("#lock").onclick = lock;
$("#logout").onclick = () =>
  run(async () => {
    lock();
    googleToken = "";
    await signOut(auth);
  });
$("#refresh").onclick = () =>
  run(async () => {
    const g = generation;
    const fresh = await api("load");
    const next = normalize(await unseal(fresh.box, key));
    if (g !== generation) return;
    snapshot = fresh;
    data = next;
    await ensureDocumentKey();
    render();
    message("Latest data loaded.");
  });
for (const s of [
  "#search",
  "#status",
  "#category",
  "#groupFilter",
  "#favoriteFilter",
  "#recordType",
  "#sortOrder",
])
  $(s).addEventListener("input", () => {
    recordPage = 1;
    documentPage = 1;
    render();
  });
document.querySelectorAll("nav button").forEach(
  (b) =>
    (b.onclick = () => {
      view = b.dataset.view;
      document
        .querySelectorAll("nav button")
        .forEach((n) => n.classList.toggle("selected", n === b));
      render();
    }),
);
$("#unlockForm").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    const g = generation;
    const fresh = await api("load");
    const pass = $("#passphrase").value,
      confirmation = $("#confirmPass").value;
    $("#passphrase").value = "";
    $("#confirmPass").value = "";
    if (pass.length < 16)
      throw Error("Passphrase must contain at least 16 characters.");
    const newKey = await deriveKey(pass, fresh.salt);
    let next;
    if (fresh.box) {
      try {
        next = normalize(await unseal(fresh.box, newKey));
      } catch {
        throw Error("Not correct passphrase or damagedbackup");
      }
    } else {
      if (pass !== confirmation) throw Error("Passphrase နှစ်ခု မတူပါ။");
      if (
        !confirm(
          "New Vault Setup: Keep your passphrase safe. Data cannot be recovered if forgotten.",
        )
      )
        return;
      next = initialData();
    }
    if (g !== generation) return;
    key = newKey;
    snapshot = fresh;
    data = next;
    await ensureDocumentKey();
    if (g !== generation) return;
    if (!fresh.box) await commit(next);
    if (g !== generation) return;
    if (!data.records.length && !data.settings.examplesAdded)
      await commit(addExamples(data, today()));
    if (g !== generation) return;
    lastActivity = Date.now();
    $("#confirmLabel").hidden = true;
    $("#gate").hidden = true;
    $("#workspace").hidden = false;
    $("#lock").hidden = false;
    $("#identity").textContent =
      user.email + " • Google Sheets + encrypted Drive";
    render();
    message("Vault unlocked.");
  });
};
$("#backup").onclick = () =>
  run(async () => {
    const backup = {
      format: "family-vault-backup-v2",
      owner: user.uid,
      salt: snapshot.salt,
      box: await seal(data, key),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `family-vault-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
function backupPassword() {
  return new Promise((resolve) => {
    const dialog = $("#backupPrompt");
    $("#backupPass").value = "";
    $("#backupPassForm").onsubmit = (e) => {
      e.preventDefault();
      const value = $("#backupPass").value;
      $("#backupPass").value = "";
      dialog.onclose = null;
      dialog.close();
      resolve(value);
    };
    dialog.onclose = () => {
      $("#backupPass").value = "";
      resolve(null);
    };
    $("#backupCancel").onclick = () => dialog.close();
    dialog.showModal();
    $("#backupPassForm button:last-child").disabled = false;
    $("#backupCancel").disabled = false;
  });
}
$("#restore").onchange = (e) =>
  run(async () => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2000000) throw Error("Backup too large");
    const b = JSON.parse(await file.text());
    if (
      !["family-vault-backup-v1", "family-vault-backup-v2"].includes(b.format)
    )
      throw Error("Invalid backup");
    const g = generation;
    const pass = await backupPassword();
    if (pass === null || g !== generation) return;
    const restored = normalize(
      await unseal(b.box, await deriveKey(pass, b.salt)),
    );
    if (restored.documents.length && b.owner !== user.uid)
      throw Error(
        "Document backup restore requires the original Google account.",
      );
    if (!Array.isArray(restored.records) || !Array.isArray(restored.payments))
      throw Error("Invalid backup data");
    if (g !== generation) return;
    if (
      confirm(
        "Replace current vault data with backup? Continue?",
      )
    ) {
      if (restored.documentKey) {
        const raw = await unseal(
          restored.documentKey,
          await deriveKey(pass, b.salt),
        );
        restored.documentKey = await seal(raw, key);
      }
      await commit(restored);
      await ensureDocumentKey();
    }
  });
function updateBrowserAlertButton() {
  const button = $("#notifications");
  if (!button) return;
  if (!("Notification" in window)) {
    button.textContent = "Browser alerts: Unavailable";
    return;
  }
  button.textContent =
    Notification.permission === "granted"
      ? "Browser alerts: On"
      : Notification.permission === "denied"
        ? "Browser alerts: Blocked"
        : "Enable browser alerts";
}
async function showBrowserNotification(title, options) {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return;
    } catch {}
  }
  new Notification(title, options);
}
async function checkAlerts() {
  if (
    !key ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  )
    return 0;
  const now = today();
  const pending = allEvents(data).filter((event) => event.date <= now);
  if (!pending.length) return 0;
  const id = `summary:${now}:${pending.map((event) => `${event.id}:${event.kind}:${event.date}`).join("|")}`;
  if (!notified.has(id)) {
    const names = pending
      .slice(0, 2)
      .map((event) => event.name)
      .join(", ");
    await showBrowserNotification("Family Vault reminder", {
      body: `${pending.length} item${pending.length === 1 ? "" : "s"} need attention${names ? `: ${names}` : ""}.`,
      icon: "/icon.svg",
      tag: "family-vault-due-summary",
    });
    notified.add(id);
  }
  return pending.length;
}
$("#notifications").onclick = () =>
  run(async () => {
    if (!("Notification" in window))
      throw Error("Browser notifications unavailable; use email reminders.");
    let permission = Notification.permission;
    if (permission === "default")
      permission = await Notification.requestPermission();
    updateBrowserAlertButton();
    if (permission === "denied") {
      message(
        "Browser alerts are blocked. Open this site's browser settings, allow Notifications, then try again.",
      );
      return;
    }
    if (permission !== "granted") {
      message("Browser alert permission was not granted.");
      return;
    }
    const pending = await checkAlerts();
    if (!pending)
      await showBrowserNotification("Family Vault alerts are on", {
        body: "No due or overdue items need attention right now.",
        icon: "/icon.svg",
        tag: "family-vault-alert-test",
      });
    message(
      pending
        ? `Browser alerts are on. ${pending} due or overdue item${pending === 1 ? "" : "s"} need attention.`
        : "Browser alerts are on. A test notification was sent to this device, not by email. Email reminders are separate: enable them in Settings to receive a private email when an alert is overdue or due within 2 days.",
    );
  });
for (const event of ["pointerdown", "keydown", "touchstart"])
  document.addEventListener(event, () => (lastActivity = Date.now()), {
    passive: true,
  });
setInterval(() => {
  if (key && Date.now() - lastActivity > config.idleMinutes * 60000) lock();
}, 10000);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && key) lock();
});
try {
  if (config.firebase.apiKey.startsWith("YOUR_"))
    throw Error(
      "Setup Required: Follow README.my.md to configure Firebase and the backend.",
    );
  auth = getAuth(initializeApp(config.firebase));
  await setPersistence(auth, inMemoryPersistence);
  $("#login").onclick = () =>
    run(async () => {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/drive.file");
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      user = result.user;
      googleToken =
        GoogleAuthProvider.credentialFromResult(result)?.accessToken || "";
      try {
        const loaded = await api("load");
        $("#confirmLabel").hidden = !!loaded.box;
        $("#setupHint").textContent = loaded.box
          ? "Open with your personal vault passphrase."
          : "Initial Setup — Set a new private passphrase.";
        $("#login").hidden = true;
        $("#unlockForm").hidden = false;
        message("Connected to your Gmail and Google Drive.");
      } catch (error) {
        googleToken = "";
        await signOut(auth);
        throw error;
      }
    });
  onAuthStateChanged(auth, (u) => {
    lock();
    user = u;
    $("#logout").hidden = !u;
    if (!u) {
      googleToken = "";
      $("#login").hidden = false;
      $("#unlockForm").hidden = true;
    }
  });
} catch (e) {
  message(e.message);
  $("#login").disabled = true;
}
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("/sw.js")
    .catch(() => message("PWA installation unavailable in this browser."));

async function ensureDocumentKey() {
  if (!key) return;
  const g = generation,
    current = data,
    currentKey = key;
  let raw,
    wrapped = current.documentKey;
  if (wrapped) raw = await unseal(wrapped, currentKey);
  else {
    raw = to64(crypto.getRandomValues(new Uint8Array(32)));
    wrapped = await seal(raw, currentKey);
  }
  const imported = await crypto.subtle.importKey(
    "raw",
    from64(raw),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  if (g !== generation) return;
  current.documentKey = wrapped;
  docKey = imported;
}
function groupOptions(selected = "", all = false) {
  return (
    `${all ? '<option value="all">All groups</option>' : '<option value="">Ungrouped</option>'}` +
    data.groups
      .map(
        (g) =>
          `<option value="${E(g)}" ${g === selected ? "selected" : ""}>${E(g)}</option>`,
      )
      .join("")
  );
}
function refreshGroups() {
  refreshCategories();
  const value = $("#groupFilter").value;
  $("#groupFilter").innerHTML = groupOptions(value, true);
  if (![...$("#groupFilter").options].some((o) => o.value === value))
    $("#groupFilter").value = "all";
  const field = $("#recordForm").elements.namedItem("group");
  if (!$("#editor").open) field.innerHTML = groupOptions();
}
function documentSearchMatches(d) {
  const q = $("#search").value.toLowerCase();
  return (
    ($("#groupFilter").value === "all" ||
      d.group === $("#groupFilter").value) &&
    ($("#favoriteFilter").value === "all" || d.favorite) &&
    [d.name, d.tags, d.memo, d.group, d.originalName]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}
function matchesDocument(d) {
  return (
    d.status !== "trashed" &&
    ($("#status").value === "all" || d.status === $("#status").value) &&
    documentSearchMatches(d)
  );
}
function documentKind(d) {
  const mime = String(d.mimeType || "").toLowerCase(),
    name = String(d.originalName || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (mime.includes("wordprocessingml") || name.endsWith(".docx"))
    return "word";
  if (mime.includes("spreadsheetml") || name.endsWith(".xlsx")) return "excel";
  if (
    mime.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".csv")
  )
    return "text";
  return "other";
}
const documentKinds = {
  all: ["All files", "▦"],
  image: ["Images", "▧"],
  pdf: ["PDF", "PDF"],
  word: ["Word", "W"],
  excel: ["Excel", "X"],
  text: ["Text / CSV", "T"],
  other: ["Other", "◇"],
  trash: ["Trash", "♲"],
};
function documentIcon(kind) {
  return (
    { image: "▧", pdf: "PDF", word: "W", excel: "X", text: "T", other: "◇" }[
      kind
    ] || "◇"
  );
}
function trashRetention(d) {
  const deleted = new Date(d.deletedAt || 0).getTime(),
    age = deleted ? Math.max(0, Date.now() - deleted) : 0,
    days = Math.max(0, 30 - Math.floor(age / 86400000));
  return { expired: !!deleted && age >= 30 * 86400000, days };
}
function clearDocumentUrls() {
  for (const url of thumbnailUrls) URL.revokeObjectURL(url);
  thumbnailUrls.clear();
}
async function documentBytes(d) {
  const result = await api("downloadDocument", { fileId: d.fileId });
  return unsealBytes(result.box, docKey);
}
function renderDocuments() {
  clearDocumentUrls();
  const regular = data.documents.filter(matchesDocument),
    trash = data.documents.filter(
      (d) => d.status === "trashed" && documentSearchMatches(d),
    ),
    matched = documentTypeFilter === "trash" ? trash : regular,
    visible =
      documentTypeFilter === "all" || documentTypeFilter === "trash"
        ? matched
        : matched.filter((d) => documentKind(d) === documentTypeFilter),
    documentPages = paginate(visible, documentPage, pageSize);
  documentPage = documentPages.page;
  $("#resultCount").textContent = `${visible.length} documents`;
  const kinds = [
    "all",
    "image",
    "pdf",
    "word",
    "excel",
    "text",
    "other",
    "trash",
  ];
  const expired = trash.filter((d) => trashRetention(d).expired).length;
  $("#content").innerHTML =
    `<p class="muted">File contents and original filenames are encrypted. Decryption happens strictly in browser memory only when opened for preview. Items in the Trash have a 30-day retention period during which they can be restored.</p><div class="document-type-bar" role="group" aria-label="Document type">${kinds.map((kind) => `<button type="button" data-action="docFilter" data-kind="${kind}" aria-pressed="${documentTypeFilter === kind}">${documentKinds[kind][1]} ${documentKinds[kind][0]} · ${kind === "trash" ? trash.length : kind === "all" ? regular.length : regular.filter((d) => documentKind(d) === kind).length}</button>`).join("")}${documentTypeFilter === "trash" && expired ? `<button type="button" class="danger" data-action="docPurgeExpired">Delete expired · ${expired}</button>` : ""}</div><div class="cards">${documentPages.items
      .map((d) => {
        const kind = documentKind(d),
          trashed = d.status === "trashed",
          retention = trashed ? trashRetention(d) : null;
        return `<article class="card doc-card doc-kind-${kind} ${trashed ? "doc-trashed" : ""}"><span class="tag">${E(d.group || "Ungrouped")} · ${E(d.status)}</span>${trashed ? `<span class="trash-retention ${retention.expired ? "expired" : ""}">${retention.expired ? "Expired — ready to delete" : retention.days + " days to restore"}</span>` : ""}<button type="button" class="doc-preview-trigger" data-action="docPreview" data-id="${E(d.id)}" aria-label="${E(d.name)} preview"><span class="doc-thumbnail" data-thumbnail-id="${E(d.id)}"><span class="doc-file-icon">${documentIcon(kind)}</span><span class="doc-file-type">${E(documentKinds[kind][0])}</span></span></button><h3>${d.favorite ? "★ " : ""}${E(d.name)}</h3><p>${E(d.originalName)} · ${(d.size / 1024).toFixed(0)} KB</p><p class="muted">${E(d.tags)}<br>Expiry: ${E(d.expiryDate || "—")}<br>${E(d.memo)}</p>${trashed ? `<p class="doc-trash-note">Trash date: ${E(String(d.deletedAt || "").slice(0, 10) || "—")}</p>` : ""}${d.recordId ? `<p>Linked: ${E(data.records.find((r) => r.id === d.recordId)?.name || "Deleted record")}</p>` : ""}${trashed ? `<button data-action="docRestore" data-id="${E(d.id)}">Restore</button><button data-action="docPermanent" data-id="${E(d.id)}" class="danger">Delete permanently</button>` : `<button data-action="docDownload" data-id="${E(d.id)}">Download</button><button data-action="docEncrypted" data-id="${E(d.id)}">Encrypted copy</button><button data-action="edit" data-id="${E(d.id)}">Edit</button><button data-action="docFavorite" data-id="${E(d.id)}">${d.favorite ? "★" : "☆"}</button><button data-action="docDelete" data-id="${E(d.id)}" class="danger">Move to Trash</button>`}</article>`;
      })
      .join("")}</div>${paginationMarkup(documentPages, "documents")}`;
  loadImageThumbnails();
}
function loadImageThumbnails() {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const d = data.documents.find(
          (x) => x.id === entry.target.dataset.thumbnailId,
        );
        if (!d || documentKind(d) !== "image") continue;
        (async () => {
          try {
            const g = generation,
              bytes = await documentBytes(d);
            if (g !== generation || !document.body.contains(entry.target))
              return;
            const url = URL.createObjectURL(
              new Blob([bytes], { type: d.mimeType || "image/jpeg" }),
            );
            thumbnailUrls.add(url);
            const img = document.createElement("img");
            img.src = url;
            img.alt = "";
            entry.target.prepend(img);
            entry.target.querySelector(".doc-file-icon")?.remove();
          } catch {}
        })();
      }
    },
    { rootMargin: "180px" },
  );
  document
    .querySelectorAll("[data-thumbnail-id]")
    .forEach((node) => observer.observe(node));
}
function editDocument(id) {
  const d = data.documents.find((x) => x.id === id) || { status: "active" };
  $("#docForm").reset();
  $("#docForm").elements.group.innerHTML = groupOptions(d.group);
  $("#docForm").elements.recordId.innerHTML =
    '<option value="">None</option>' +
    data.records
      .map((r) => `<option value="${E(r.id)}">${E(r.name)}</option>`)
      .join("");
  for (const [k, v] of Object.entries(d)) {
    const el = $("#docForm").elements.namedItem(k);
    if (el && k !== "file") el.value = v;
  }
  $("#docForm").elements.file.required = !id;
  $("#docForm").elements.file.hidden = !!id;
  $("#docEditor").showModal();
  attachHelp();
}
$("#addDocument").onclick = () => editDocument();
$("#docCancel").onclick = () => $("#docEditor").close();
$("#docEditor").addEventListener("close", () => $("#docForm").reset());
const safeTypes = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  csv: "text/csv",
};
$("#docForm").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    const g = generation;
    const values = Object.fromEntries(new FormData(e.target));
    const existing = data.documents.find((d) => d.id === values.id);
    const next = structuredClone(data);
    if (existing) {
      const d = next.documents.find((d) => d.id === values.id);
      for (const k of [
        "name",
        "group",
        "status",
        "expiryDate",
        "tags",
        "recordId",
        "memo",
      ])
        d[k] = String(values[k] || "");
    } else {
      const file = e.target.elements.file.files[0];
      if (!file || file.size > config.maxDocumentBytes)
        throw Error("Document must be 3 MiB or smaller");
      const ext = file.name.split(".").pop().toLowerCase();
      if (!safeTypes[ext]) throw Error("Unsupported document type");
      const box = await sealBytes(
        new Uint8Array(await file.arrayBuffer()),
        docKey,
      );
      if (g !== generation) return;
      const uploaded = await api("uploadDocument", { box });
      if (g !== generation) return;
      next.documents.push({
        id: crypto.randomUUID(),
        fileId: uploaded.fileId,
        name: values.name,
        group: values.group,
        status: values.status,
        expiryDate: values.expiryDate,
        tags: values.tags,
        recordId: values.recordId,
        memo: values.memo,
        originalName: file.name,
        mimeType: safeTypes[ext],
        size: file.size,
        favorite: false,
        createdAt: new Date().toISOString(),
      });
    }
    await commit(next);
    $("#docEditor").close();
    e.target.reset();
  });
};
function download(value, name, mime) {
  const blob =
    value instanceof Blob ? value : new Blob([value], { type: mime });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name.replace(/[\x00-\x1f\\/]/g, "_");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function closeDocumentPreview() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = "";
  }
  previewDocumentId = "";
  const dialog = $("#docPreviewDialog");
  if (dialog?.open) dialog.close();
  if ($("#docPreviewStage")) $("#docPreviewStage").replaceChildren();
}
async function openDocumentPreview(d) {
  closeDocumentPreview();
  previewDocumentId = d.id;
  $("#docPreviewTitle").textContent = d.name;
  const trashed = d.status === "trashed",
    retention = trashed ? trashRetention(d) : null;
  $("#docPreviewMeta").innerHTML =
    `<span>${E(d.originalName)}</span><span>${(d.size / 1024).toFixed(0)} KB</span><span>${E(d.group || "Ungrouped")}</span><span>${E(d.status)}</span>${trashed ? `<span class="trash-retention ${retention.expired ? "expired" : ""}">${retention.expired ? "Expired — ready to delete" : retention.days + " days to restore"}</span>` : ""}`;
  $("#docPreviewTrash").textContent = trashed ? "Restore" : "Move to Trash";
  $("#docPreviewPermanent").hidden = !trashed;
  $("#docPreviewEdit").hidden = trashed;
  const stage = $("#docPreviewStage"),
    kind = documentKind(d);
  stage.innerHTML =
    '<div class="doc-preview-placeholder"><p>Preview opening…</p></div>';
  $("#docPreviewDialog").showModal();
  if (["word", "excel", "other"].includes(kind)) {
    stage.innerHTML = `<div class="doc-preview-placeholder"><span class="doc-file-icon">${documentIcon(kind)}</span><h3>${E(documentKinds[kind][0])} document</h3><p>Unable to preview accurately in the browser. Please download the original file and open it with an appropriate app.</p></div>`;
    return;
  }
  const g = generation,
    bytes = await documentBytes(d);
  if (g !== generation || previewDocumentId !== d.id) return;
  if (kind === "text") {
    let text = new TextDecoder().decode(bytes),
      note = "";
    if (text.length > 200000) {
      text = text.slice(0, 200000);
      note = "\n\n— Preview limited to the first 200,000 characters.";
    }
    const pre = document.createElement("pre");
    pre.textContent = text + note;
    stage.replaceChildren(pre);
    return;
  }
  previewUrl = URL.createObjectURL(
    new Blob([bytes], { type: d.mimeType || "application/octet-stream" }),
  );
  if (kind === "image") {
    const img = document.createElement("img");
    img.src = previewUrl;
    img.alt = d.name;
    stage.replaceChildren(img);
  } else if (kind === "pdf") {
    const frame = document.createElement("iframe");
    frame.src = previewUrl;
    frame.title = d.name + " PDF preview";
    stage.replaceChildren(frame);
  }
}
$("#docPreviewClose").onclick = closeDocumentPreview;
$("#docPreviewDialog").addEventListener("close", () => {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = "";
  }
  previewDocumentId = "";
  $("#docPreviewStage").replaceChildren();
});
$("#docPreviewDownload").onclick = () => {
  const id = previewDocumentId;
  if (id) documentAction("docDownload", id);
};
$("#docPreviewEdit").onclick = () => {
  const id = previewDocumentId;
  closeDocumentPreview();
  if (id) editDocument(id);
};
$("#docPreviewTrash").onclick = () => {
  const id = previewDocumentId,
    d = data.documents.find((x) => x.id === id);
  if (d)
    documentAction(d.status === "trashed" ? "docRestore" : "docDelete", id);
};
$("#docPreviewPermanent").onclick = () => {
  const id = previewDocumentId;
  if (id) documentAction("docPermanent", id);
};
function documentAction(action, id) {
  run(async () => {
    const d = data.documents.find((x) => x.id === id);
    if (!d) return;
    const g = generation;
    if (action === "docPreview") {
      await openDocumentPreview(d);
      return;
    }
    if (["docDownload", "docEncrypted"].includes(action)) {
      const result = await api("downloadDocument", { fileId: d.fileId });
      if (g !== generation) return;
      if (action === "docEncrypted") {
        download(
          JSON.stringify({
            format: "family-vault-document-v1",
            box: result.box,
          }),
          "document-" + d.id + ".fvdoc",
          "application/json",
        );
        return;
      }
      const bytes = await unsealBytes(result.box, docKey);
      if (g !== generation) return;
      download(bytes, d.originalName, d.mimeType || "application/octet-stream");
      return;
    }
    if (
      action === "docDelete" &&
      !confirm(
        "Move this document to Trash for a 30-day review period. Do you want to continue?",
      )
    )
      return;
    if (
      action === "docPermanent" &&
      !confirm(
        "Remove this document from the Vault and move it to Google Drive Trash. This action cannot be undone from within the app. Do you want to continue?",
      )
    )
      return;
    const next = structuredClone(data),
      record = next.documents.find((x) => x.id === id);
    if (action === "docFavorite") record.favorite = !d.favorite;
    if (action === "docDelete") {
      record.status = "trashed";
      record.deletedAt = new Date().toISOString();
    }
    if (action === "docRestore") {
      record.status = "active";
      delete record.deletedAt;
    }
    if (action === "docPermanent")
      next.documents = next.documents.filter((x) => x.id !== id);
    closeDocumentPreview();
    await commit(next);
    if (action === "docPermanent")
      try {
        await api("trashDocument", { fileId: d.fileId });
      } catch (error) {
        message(
          "The document has been removed from the Vault, but it could not be moved to Google Drive Trash." +
            error.message +
            " File ID: " +
            d.fileId,
        );
      }
  });
}
function purgeExpiredDocuments() {
  run(async () => {
    const expired = data.documents.filter(
      (d) => d.status === "trashed" && trashRetention(d).expired,
    );
    if (!expired.length) {
      message("There are no documents in Trash older than 30 days.");
      return;
    }
    if (
      !confirm(
        `Remove ${expired.length} document(s) older than 30 days from the Vault and move them to Google Drive Trash. Do you want to continue?`,
      )
    )
      return;
    const ids = new Set(expired.map((d) => d.id)),
      next = structuredClone(data);
    next.documents = next.documents.filter((d) => !ids.has(d.id));
    await commit(next);
    let failed = 0;
    for (const d of expired)
      try {
        await api("trashDocument", { fileId: d.fileId });
      } catch {
        failed++;
      }
    message(
      failed
        ? `Expired documents have been removed from the Vault. ${failed} file(s) could not be moved to Google Drive Trash.`
        : `${expired.length} expired document(s) have been deleted.`,
    );
  });
}
function renderSettings() {
  for (const [selector, kind, values] of [
    ["#groupsList", "group", data.groups],
    ["#categoriesList", "category", categories(data)],
  ])
    $(selector).innerHTML = values
      .map((name) => {
        const count = [
          ...data.records,
          ...(kind === "group" ? data.documents : []),
        ].filter((r) => r[kind] === name).length;
        return `<div class="organizer-row"><div><strong>${E(name)}</strong><small>${count} items</small></div>${kind === "category" && name === "Other" ? '<span class="muted">Fallback</span>' : `<div><button data-organizer="${kind}" data-name="${E(name)}" data-mode="rename">Rename</button><button data-organizer="${kind}" data-name="${E(name)}" data-mode="remove">Remove</button></div>`}</div>`;
      })
      .join("");
  $("#emailOptIn").checked = data.settings.emailReminders === true;
  $("#driveInfo").innerHTML =
    `သင့် Gmail ပိုင် <a href="https://drive.google.com/drive/folders/${E(snapshot.folderId)}" target="_blank" rel="noopener noreferrer">Private Drive folder</a> · <a href="https://docs.google.com/spreadsheets/d/${E(snapshot.sheetId)}/edit" target="_blank" rel="noopener noreferrer">Encrypted Google Sheet</a>`;
}

$("#emailOptIn").onchange = () =>
  run(async () => {
    const next = structuredClone(data);
    next.settings.emailReminders = $("#emailOptIn").checked;
    try {
      await commit(next);
    } catch (error) {
      $("#emailOptIn").checked = data.settings.emailReminders === true;
      throw error;
    }
  });
$("#changePass").onclick = () => {
  $("#passForm").reset();
  $("#passEditor").showModal();
};
$("#passCancel").onclick = () => $("#passEditor").close();
$("#passEditor").addEventListener("close", () => $("#passForm").reset());
$("#passForm").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    const values = Object.fromEntries(new FormData(e.target));
    e.target.reset();
    if (values.pass !== values.confirm) throw Error("The two passphrases do not match.");
    const g = generation,
      newKey = await deriveKey(values.pass, snapshot.salt),
      next = structuredClone(data),
      raw = await unseal(next.documentKey, key);
    next.documentKey = await seal(raw, newKey);
    const box = await seal(next, newKey);
    if (g !== generation) return;
    const result = await api("save", {
      revision: snapshot.revision,
      box,
      reminders: allEvents(next).map((x) => ({ kind: x.kind, date: x.date })),
      emailReminders: next.settings.emailReminders === true,
    });
    if (g !== generation) return;
    key = newKey;
    data = next;
    snapshot = { ...snapshot, box, revision: result.revision };
    $("#passEditor").close();
    render();
    message("Your passphrase has been changed. Please create a new backup.");
  });
};
let calendarDate = new Date();
function renderCalendar(all, ids) {
  const y = calendarDate.getFullYear(),
    m = calendarDate.getMonth(),
    currentDate = today(),
    prefix = `${y}-${String(m + 1).padStart(2, "0")}-`;
  const docIds = new Set(
    data.documents.filter(matchesDocument).map((d) => d.id),
  );
  const selectedEvents = all.filter((e) => ids.has(e.id) || docIds.has(e.id));
  const listEvents = filterCalendarEvents(
    selectedEvents,
    calendarFilter,
    currentDate,
  );
  const counts = Object.fromEntries(
    CALENDAR_FILTERS.map((filter) => [
      filter,
      filterCalendarEvents(selectedEvents, filter, currentDate).length,
    ]),
  );
  const offset = new Date(y, m, 1).getDay(),
    days = new Date(y, m + 1, 0).getDate();
  const filterLabels = {
    all: "All alerts",
    overdue: "Overdue",
    today: "Due today",
    upcoming: "Upcoming",
  };
  $("#content").innerHTML =
    `<section class="calendar-help"><strong>How due dates work</strong><p>Recording a recurring payment moves its due date to the next billing cycle. A paid one-time due disappears. Renewal and expiry alerts remain until you update their dates or archive/close the record.</p></section><div class="calendar-heading"><div><span class="eyebrow">CALENDAR</span><h2>${E(calendarDate.toLocaleDateString(undefined, { month: "long", year: "numeric" }))}</h2></div><div class="calendar-navigation" role="group" aria-label="Calendar month"><button type="button" data-calendar="-1" aria-label="Previous month">← Previous</button><button type="button" data-calendar="0">Today</button><button type="button" data-calendar="1" aria-label="Next month">Next →</button></div></div><div class="calendar-summary">${["overdue", "today", "upcoming"].map((status) => `<button type="button" data-calendar-filter="${status}" class="calendar-stat ${status}" aria-pressed="${calendarFilter === status}"><span>${E(filterLabels[status])}</span><strong>${counts[status]}</strong></button>`).join("")}</div><div class="calendar-grid">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<div class="day-name">${d}</div>`).join("")}${'<div class="day empty"></div>'.repeat(offset)}${Array.from(
      { length: days },
      (_, i) => {
        const date = prefix + String(i + 1).padStart(2, "0");
        return `<div class="day ${date === currentDate ? "today" : ""}"><strong>${i + 1}</strong>${selectedEvents
          .filter((e) => e.date === date)
          .map(
            (e) =>
              `<button type="button" class="calendar-day-event ${calendarEventStatus(e, currentDate)}" data-action="edit" data-id="${E(e.id)}" title="Open ${E(e.name)}"><span>${E(e.name)}</span><small>${E(calendarKindLabel(e.kind))}</small></button>`,
          )
          .join("")}</div>`;
      },
    ).join("")}</div><div class="calendar-list-heading"><div><h3>${E(filterLabels[calendarFilter])}</h3><p>${listEvents.length} of ${selectedEvents.length} alerts</p></div><div class="calendar-filter-bar" role="group" aria-label="Filter alerts">${CALENDAR_FILTERS.map((filter) => `<button type="button" data-calendar-filter="${filter}" aria-pressed="${calendarFilter === filter}">${E(filterLabels[filter])} <span>${counts[filter]}</span></button>`).join("")}</div></div><div class="calendar-events">${listEvents.length ? listEvents.map((e) => {
      const status = calendarEventStatus(e, currentDate);
      return `<div class="event calendar-event-row ${status}"><time datetime="${E(e.date)}">${E(e.date)}</time><span><strong>${E(e.name)}</strong><small>${E(calendarKindLabel(e.kind))} · ${E(status === "overdue" ? "Needs attention" : status === "today" ? "Today" : "Upcoming")}</small></span><button type="button" data-action="edit" data-id="${E(e.id)}">Open</button></div>`;
    }).join("") : '<div class="calendar-empty"><span aria-hidden="true">✓</span><strong>No alerts in this view</strong><p>Choose another filter or add a due, renewal, or expiry date.</p></div>'}</div>`;
}
$("#content").addEventListener("click", (e) => {
  const filter = e.target.closest("[data-calendar-filter]");
  if (filter) {
    if (CALENDAR_FILTERS.includes(filter.dataset.calendarFilter))
      calendarFilter = filter.dataset.calendarFilter;
    render();
    return;
  }
  const b = e.target.closest("[data-calendar]");
  if (!b) return;
  const delta = Number(b.dataset.calendar);
  if (delta === 0) calendarDate = new Date();
  else
    calendarDate = new Date(
      calendarDate.getFullYear(),
      calendarDate.getMonth() + delta,
      1,
    );
  render();
});
$("#legacyImport").onchange = (e) =>
  run(async () => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2000000) throw Error("Legacy file too large");
    const legacy = JSON.parse(await file.text());
    const { convertLegacy } = await import("./migration.js");
    const converted = convertLegacy(legacy);
    if (
      converted.warnings.length &&
      !confirm(
        converted.warnings.join("\n") +
          "\nImport supported fields only? Original file will remain unchanged.",
      )
    )
      return;
    if (
      !confirm(
        `Import ${converted.records.length} record(s) and ${converted.payments.length} payment(s). Do you want to continue?`,
      )
    )
      return;
    const next = structuredClone(data);
    next.records.push(...converted.records);
    next.payments.push(...converted.payments);
    await commit(next);
    message(
      "Legacy import completed. Do not delete the original Sheet/file. Please review the imported dates/linked payments.",
    );
  });

const generate = document.createElement("button");
generate.type = "button";
generate.textContent = "Generate strong password";
$("#recordForm").elements.password.parentElement.append(generate);
generate.onclick = () => {
  $("#recordForm").elements.password.value = to64(
    crypto.getRandomValues(new Uint8Array(24)),
  );
  message("Save the new password securely in the encrypted Vault.");
};

function addSampleRecords() {
  if (!key) {
    message("Unlock the Vault before adding sample records.");
    return;
  }
  if ($("#helpDialog").open) $("#helpDialog").close();
  run(async () => {
    await commit(resetExamples(data, today()));
    view = "records";
    quickFilter = "all";
    document
      .querySelectorAll("nav button")
      .forEach((b) => b.classList.toggle("selected", b.dataset.view === view));
    $("#search").value = "";
    for (const selector of [
      "#recordType",
      "#groupFilter",
      "#favoriteFilter",
      "#category",
    ])
      $(selector).value = "all";
    $("#status").value = "active";
    render();
    message(
      "Three fresh sample records have been added. Your real records were not changed. You can customize the samples using Edit and Save.",
    );
  });
}
$("#addSamples").onclick = addSampleRecords;
$("#guideSamples").onclick = addSampleRecords;
$("#helpContent").innerHTML = guideMarkup;
$("#help").onclick = () => {
  hideTooltip();
  $("#guideSamples").hidden = !key;
  $("#helpDialog").showModal();
};
$("#helpClose").onclick = () => $("#helpDialog").close();
$("#filtersToggle").onclick = () => {
  const open = $("#filtersToggle").getAttribute("aria-expanded") !== "true";
  $("#filtersToggle").setAttribute("aria-expanded", String(open));
  $("#filterPanel").classList.toggle("expanded", open);
};
$("#quickFilters").onclick = (e) => {
  const button = e.target.closest("[data-quick-filter]");
  if (!button) return;
  quickFilter = button.dataset.quickFilter;
  recordPage = 1;
  render();
};
$("#resetFilters").onclick = () => {
  quickFilter = "all";
  recordPage = 1;
  documentPage = 1;
  $("#search").value = "";
  for (const selector of [
    "#recordType",
    "#groupFilter",
    "#favoriteFilter",
    "#category",
  ])
    $(selector).value = "all";
  $("#status").value = "active";
  render();
};
function helpButton(topic) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "help-dot";
  b.dataset.help = topic;
  b.setAttribute("aria-label", topic + " Guide");
  b.textContent = "?";
  return b;
}
function attachHelp() {
  for (const form of [$("#recordForm"), $("#docForm")])
    for (const input of form.querySelectorAll("input,select,textarea")) {
      if (!tips[input.name] || input.type === "hidden") continue;
      const label = input.closest("label");
      if (label && !label.querySelector(".help-dot"))
        label.prepend(helpButton(input.name));
    }
  const history = $("#recordForm").elements.providerHistory;
  if (!history.previousElementSibling?.classList.contains("help-dot"))
    history.before(helpButton("providerHistory"));
  for (const id of [
    "lock",
    "logout",
    "backup",
    "refresh",
    "search",
    "notifications",
    "addDocument",
    "addSamples",
    "groupFilter",
    "favoriteFilter",
  ]) {
    const el = $("#" + id);
    if (el) el.title = tips[id] || "";
  }
  generate.dataset.help = "generate";
  for (const b of document.querySelectorAll("[data-action]"))
    if (tips[b.dataset.action]) {
      b.title = tips[b.dataset.action];
      b.setAttribute(
        "aria-label",
        b.textContent + " — " + tips[b.dataset.action],
      );
    }
  for (const b of document.querySelectorAll(".help-dot"))
    b.title = tips[b.dataset.help] || "";
}
function showTooltip(source) {
  const text = tips[source.dataset.help];
  if (!text) return;
  const box = $("#fieldTooltip");
  tooltipSource?.removeAttribute("aria-describedby");
  tooltipSource = source;
  source.setAttribute("aria-describedby", "fieldTooltip");
  box.textContent = text;
  box.hidden = false;
  if (source.closest("dialog")) source.closest("dialog").append(box);
  else document.body.append(box);
  const rect = source.getBoundingClientRect(),
    width = Math.min(320, window.innerWidth - 24);
  box.style.width = width + "px";
  box.style.left =
    Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)) + "px";
  box.style.top =
    Math.max(
      12,
      Math.min(rect.bottom + 10, window.innerHeight - box.offsetHeight - 12),
    ) + "px";
}
function hideTooltip() {
  const box = $("#fieldTooltip");
  if (box) box.hidden = true;
  tooltipSource?.removeAttribute("aria-describedby");
  tooltipSource = null;
}
document.addEventListener("pointerover", (e) => {
  if (e.pointerType === "touch") return;
  const source = e.target.closest("[data-help]");
  if (source) showTooltip(source);
});
document.addEventListener("pointerout", (e) => {
  if (e.pointerType === "touch") return;
  if (
    e.target.closest("[data-help]") &&
    !e.relatedTarget?.closest("[data-help]")
  )
    hideTooltip();
});
document.addEventListener("focusin", (e) => {
  const source = e.target.closest("[data-help]");
  if (source) showTooltip(source);
});
document.addEventListener("focusout", (e) => {
  if (e.target.closest("[data-help]")) hideTooltip();
});
document.addEventListener("click", (e) => {
  const source = e.target.closest("[data-help]");
  if (source) {
    e.preventDefault();
    showTooltip(source);
  } else hideTooltip();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hideTooltip();
});
window.addEventListener("resize", hideTooltip);
document.addEventListener("scroll", hideTooltip, true);
attachHelp();

function refreshCategories() {
  const filter = $("#category"),
    value = filter.value;
  filter.innerHTML =
    '<option value="all">All categories</option>' +
    categories(data)
      .map((c) => `<option value="${E(c)}">${E(c)}</option>`)
      .join("");
  filter.value = categories(data).includes(value) ? value : "all";
  if (!$("#editor").open) {
    const field = $("#recordForm").elements.category;
    field.innerHTML = categories(data)
      .map((c) => `<option value="${E(c)}">${E(c)}</option>`)
      .join("");
  }
}
let organizerContext = null,
  paymentRecordId = null;
function openOrganizer(kind, mode = "add", oldName = "", select = null) {
  organizerContext = { kind, mode, oldName, select };
  $("#organizerName").value = mode === "rename" ? oldName : "";
  $("#organizerError").textContent = "";
  $("#organizerTitle").textContent =
    (kind === "group" ? "Group" : "Category") +
    (mode === "rename" ? " Rename" : " New");
  $("#organizerHint").textContent =
    kind === "group"
      ? "Create a custom group. For example, Home, Work, Family."
      : "Create a custom category. For example, Banking, Education, Travel.";
  $("#organizerDialog").showModal();
  $("#organizerName").focus();
}
$("#organizerCancel").onclick = () => $("#organizerDialog").close();
$("#newGroupButton").onclick = () => openOrganizer("group");
$("#newCategoryButton").onclick = () => openOrganizer("category");
$("#organizerForm").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    const ctx = organizerContext,
      name = $("#organizerName").value.trim();
    try {
      const next = organize(data, ctx.kind, ctx.mode, name, ctx.oldName);
      await commit(next);
      if (!key) return;
      for (const form of [$("#recordForm"), $("#docForm")]) {
        const select = form.elements.namedItem(ctx.kind);
        if (!select) continue;
        const selected = select === ctx.select ? name : select.value;
        select.innerHTML =
          ctx.kind === "group"
            ? groupOptions(selected)
            : categories(data)
                .map((c) => `<option value="${E(c)}">${E(c)}</option>`)
                .join("");
        select.value =
          ctx.mode === "rename" && selected === ctx.oldName ? name : selected;
      }
      $("#organizerDialog").close();
    } catch (error) {
      $("#organizerError").textContent = error.message;
      throw error;
    }
  });
};
for (const selector of ["#groupsList", "#categoriesList"])
  $(selector).onclick = (e) => {
    const b = e.target.closest("[data-organizer]");
    if (!b) return;
    const { organizer: kind, mode, name } = b.dataset;
    if (mode === "rename") return openOrganizer(kind, mode, name);
    run(async () => {
      if (
        !confirm(
          kind === "group"
            ? "Remove Group? Records/documents will remain ungrouped. Continue?"
            : "Remove Category? Records will be moved to Other. Continue?",
        )
      )
        return;
      await commit(organize(data, kind, "remove", "", name));
    });
  };
for (const form of [$("#recordForm"), $("#docForm")])
  for (const kind of ["group", "category"]) {
    const select = form.elements.namedItem(kind);
    if (!select) continue;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "inline-add";
    b.textContent = kind === "group" ? "＋ Group" : "＋ Category";
    b.onclick = () => openOrganizer(kind, "add", "", select);
    select.after(b);
  }
function openPayment(record) {
  if (record.isExample) {
    message(
      "Edit and save the sample as an actual bill before recording a payment.",
    );
    return;
  }
  paymentRecordId = record.id;
  $("#paymentForm").reset();
  $("#paymentName").textContent = record.name;
  $("#paymentForm").elements.date.value = today();
  $("#paymentForm").elements.amount.value = record.amount;
  $("#paymentDialog").showModal();
}
$("#paymentCancel").onclick = () => $("#paymentDialog").close();
$("#paymentDialog").addEventListener("close", () => {
  $("#paymentForm").reset();
  $("#paymentName").textContent = "";
  paymentRecordId = null;
});
$("#paymentForm").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    const values = Object.fromEntries(new FormData(e.target)),
      next = structuredClone(data),
      record = next.records.find((r) => r.id === paymentRecordId);
    if (!record) throw Error("Bill NOT found. Please refresh the page.");
    const amount = Number(values.amount);
    if (!Number.isFinite(amount) || amount < 0) throw Error("Invalid amount");
    next.payments.push({
      id: crypto.randomUUID(),
      recordId: record.id,
      name: record.name,
      date: values.date,
      amount,
      memo: values.memo,
    });
    record.paymentStatus = "paid";
    if (
      ["monthly", "quarterly", "four-month", "semiannual", "yearly"].includes(
        record.frequency,
      ) &&
      record.dueDate
    ) {
      record.dueDate = advanceDate(record.dueDate, record.frequency);
      record.paymentStatus = "unpaid";
    }
    record.updatedAt = new Date().toISOString();
    await commit(next);
    $("#paymentDialog").close();
  });
};
