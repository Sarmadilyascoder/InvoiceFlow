import {
  addDays,
  calculateMetrics,
  createInvoiceNumber,
  formatCurrency,
  formatDate,
  getInvoiceStatus,
  invoiceTotal,
  isoDate,
  loadWorkspace,
  makeDashboardReport,
  makeId,
  outstandingAmount,
  saveWorkspace,
} from "./data.js";

let workspace = loadWorkspace();
let currentView = window.location.hash.startsWith("#print/") ? "print" : "dashboard";
let invoiceFilter = "all";
let invoiceSearch = "";

const root = document.querySelector("#view-root");
const dialogRoot = document.querySelector("#dialog-root");
const sidebar = document.querySelector(".sidebar");
const mobileMenuButton = document.querySelector("#mobile-menu");
let dialogOpener = null;
const currency = () => workspace.business.currency || "USD";
const money = (amount) => formatCurrency(amount, currency());
const clientFor = (id) => workspace.clients.find((client) => client.id === id) || { name: "Unknown client", company: "" };
const statusLabel = (status) => status === "sent" ? "Awaiting payment" : status;

const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[character]));

function persist() {
  saveWorkspace(workspace);
  document.querySelector("#workspace-name").textContent = workspace.business.name;
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === "success" ? "✓" : "!"}</span><p>${escapeHtml(message)}</p>`;
  document.querySelector("#toast-region").append(toast);
  setTimeout(() => toast.remove(), 3300);
}

function statusPill(invoice) {
  const status = getInvoiceStatus(invoice);
  return `<span class="status status-${status}">${escapeHtml(statusLabel(status))}</span>`;
}

function invoiceRows(invoices, compact = false) {
  if (!invoices.length) return `<div class="empty-state"><span>□</span><h3>No invoices here yet</h3><p>Create an invoice to start tracking money in and due dates.</p><button class="text-action" data-action="new-invoice">Create invoice</button></div>`;
  return invoices.map((invoice) => {
    const client = clientFor(invoice.clientId);
    const due = getInvoiceStatus(invoice) === "paid" ? `Paid ${formatDate(invoice.paidDate)}` : `Due ${formatDate(invoice.dueDate)}`;
    return `<article class="invoice-row ${compact ? "compact" : ""}" data-invoice-id="${invoice.id}">
      <button class="row-main" data-action="open-invoice" data-id="${invoice.id}" aria-label="Open ${escapeHtml(invoice.number)}">
        <span class="invoice-doc">$</span>
        <span class="row-copy"><strong>${escapeHtml(invoice.title)}</strong><small>${escapeHtml(invoice.number)} · ${escapeHtml(client.company || client.name)}</small></span>
      </button>
      <span class="row-date">${due}</span>
      <span class="row-status">${statusPill(invoice)}</span>
      <strong class="row-value">${money(invoice.total)}</strong>
      <button class="row-more" data-action="open-invoice" data-id="${invoice.id}" aria-label="More actions">···</button>
    </article>`;
  }).join("");
}

function dashboardView() {
  const metrics = calculateMetrics(workspace.invoices, workspace.expenses, workspace.payments);
  const actionable = workspace.invoices.filter((invoice) => ["sent", "overdue"].includes(getInvoiceStatus(invoice))).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const report = makeDashboardReport(workspace);
  const maxExpense = Math.max(...Object.values(report.expenseByCategory), 1);
  const expenseBars = Object.entries(report.expenseByCategory).map(([category, amount]) => `<div class="mini-bar-row"><span>${escapeHtml(category)}</span><div class="mini-bar"><i style="width:${Math.round((amount / maxExpense) * 100)}%"></i></div><strong>${money(amount)}</strong></div>`).join("") || `<p class="muted-copy">No expenses recorded this month.</p>`;
  return `<section class="page dashboard-page">
    <div class="page-intro split-intro">
      <div><p class="eyebrow">CASH FLOW / ${new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date()).toUpperCase()}</p><h1>Money, made <em>clear.</em></h1><p class="intro-copy">A focused picture of what you earned, what is due, and what needs your attention.</p></div>
      <div class="workspace-card"><span>Workspace</span><strong>${escapeHtml(workspace.business.name)}</strong><small>${escapeHtml(workspace.business.email)}</small><button class="plain-button" data-action="edit-business">Edit business details →</button></div>
    </div>
    <div class="metric-grid">
      <article class="metric-card accent-green"><span>Outstanding</span><strong>${money(metrics.outstanding)}</strong><small>Open invoices still to collect</small></article>
      <article class="metric-card accent-blue"><span>Paid this month</span><strong>${money(metrics.paidThisMonth)}</strong><small>Received payments only</small></article>
      <article class="metric-card accent-orange"><span>Expenses this month</span><strong>${money(metrics.expensesThisMonth)}</strong><small>Tracked business costs</small></article>
      <article class="metric-card accent-red"><span>Overdue</span><strong>${money(metrics.overdueAmount)}</strong><small>${metrics.overdueCount ? `${metrics.overdueCount} invoice${metrics.overdueCount > 1 ? "s" : ""} need attention` : "No overdue invoices"}</small></article>
      <article class="metric-card accent-ink"><span>Net cash flow</span><strong>${money(metrics.netCashFlow)}</strong><small>Payments minus expenses</small></article>
    </div>
    <div class="content-grid dashboard-grid">
      <section class="panel action-panel"><div class="panel-heading"><div><p class="kicker">ACTION QUEUE</p><h2>What needs a nudge</h2></div><button class="text-action" data-view-link="invoices">View invoices →</button></div>${invoiceRows(actionable.slice(0, 4), true)}</section>
      <section class="panel expense-panel"><div class="panel-heading"><div><p class="kicker">COST MIX</p><h2>Expenses by category</h2></div><button class="text-action" data-view-link="expenses">Manage →</button></div><div class="mini-bars">${expenseBars}</div></section>
    </div>
    <section class="panel flow-panel"><div class="panel-heading"><div><p class="kicker">THE WORKFLOW</p><h2>Keep your cash flow moving</h2></div></div><div class="flow-steps"><button data-action="new-client"><span>01</span><strong>Add a client</strong><small>Save the people you bill.</small></button><button data-action="new-invoice"><span>02</span><strong>Send an invoice</strong><small>Set a clear due date.</small></button><button data-view-link="expenses"><span>03</span><strong>Track the costs</strong><small>See your real cash flow.</small></button></div></section>
  </section>`;
}

function invoicesView() {
  const statusOptions = ["all", "sent", "overdue", "paid", "draft", "void"];
  const filtered = workspace.invoices.filter((invoice) => {
    const client = clientFor(invoice.clientId);
    const matchesStatus = invoiceFilter === "all" || getInvoiceStatus(invoice) === invoiceFilter;
    const haystack = `${invoice.number} ${invoice.title} ${client.name} ${client.company}`.toLowerCase();
    return matchesStatus && haystack.includes(invoiceSearch.toLowerCase());
  }).sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  return `<section class="page">
    <div class="page-intro standard-intro"><div><p class="eyebrow">BILLING DESK</p><h1>Invoices</h1><p class="intro-copy">Create clear bills, watch due dates, and record money received.</p></div><button class="primary-button" data-action="new-invoice">+ New invoice</button></div>
    <section class="panel list-panel"><div class="toolbar"><label class="search-field"><span>⌕</span><input id="invoice-search" type="search" placeholder="Search invoices or clients" value="${escapeHtml(invoiceSearch)}" /></label><div class="filter-tabs" role="group" aria-label="Filter invoices">${statusOptions.map((status) => `<button class="filter-tab ${invoiceFilter === status ? "active" : ""}" data-action="invoice-filter" data-filter="${status}">${status === "all" ? "All" : statusLabel(status)}</button>`).join("")}</div></div><div class="invoice-table"><div class="table-head"><span>Invoice</span><span>Due date</span><span>Status</span><span>Amount</span><span></span></div>${invoiceRows(filtered)}</div></section>
  </section>`;
}

function expensesView() {
  const sorted = [...workspace.expenses].sort((a, b) => b.date.localeCompare(a.date));
  const total = workspace.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  return `<section class="page"><div class="page-intro standard-intro"><div><p class="eyebrow">BUSINESS COSTS</p><h1>Expenses</h1><p class="intro-copy">Track what leaves the business so your cash flow stays honest.</p></div><button class="primary-button" data-action="new-expense">+ New expense</button></div><div class="inline-stat"><span>Total recorded</span><strong>${money(total)}</strong><small>${workspace.expenses.length} expense record${workspace.expenses.length === 1 ? "" : "s"}</small></div><section class="panel expense-list">${sorted.length ? sorted.map((expense) => `<article class="expense-row"><span class="expense-icon">↗</span><div><strong>${escapeHtml(expense.merchant)}</strong><p>${escapeHtml(expense.category)}${expense.note ? ` · ${escapeHtml(expense.note)}` : ""}</p></div><time>${formatDate(expense.date)}</time><strong>${money(expense.amount)}</strong><button class="row-more" data-action="delete-expense" data-id="${expense.id}" aria-label="Remove expense">×</button></article>`).join("") : `<div class="empty-state"><span>↗</span><h3>No expenses recorded</h3><p>Start with software, supplies, travel, or contractors.</p><button class="text-action" data-action="new-expense">Add expense</button></div>`}</section></section>`;
}

function clientsView() {
  const clients = workspace.clients.map((client) => ({ ...client, invoices: workspace.invoices.filter((invoice) => invoice.clientId === client.id) }));
  return `<section class="page"><div class="page-intro standard-intro"><div><p class="eyebrow">PEOPLE YOU BILL</p><h1>Clients</h1><p class="intro-copy">Keep customer details ready for fast, complete invoices.</p></div><button class="primary-button" data-action="new-client">+ New client</button></div><div class="client-grid">${clients.length ? clients.map((client) => { const outstanding = client.invoices.reduce((sum, invoice) => sum + outstandingAmount(invoice), 0); return `<article class="client-card"><div class="client-avatar">${escapeHtml(client.name.slice(0, 1).toUpperCase())}</div><div><p class="client-company">${escapeHtml(client.company || "Independent client")}</p><h2>${escapeHtml(client.name)}</h2><a href="mailto:${encodeURIComponent(client.email)}">${escapeHtml(client.email)}</a></div><dl><div><dt>Invoices</dt><dd>${client.invoices.length}</dd></div><div><dt>Outstanding</dt><dd>${money(outstanding)}</dd></div></dl><div class="client-actions"><button class="text-action" data-action="new-invoice-for-client" data-id="${client.id}">Create invoice →</button><button class="text-action" data-action="edit-client" data-id="${client.id}">Edit client</button></div></article>`; }).join("") : `<div class="empty-state"><span>◍</span><h3>No clients added yet</h3><p>Add a client before creating your first invoice.</p><button class="text-action" data-action="new-client">Add client</button></div>`}</div></section>`;
}

function reportsView() {
  const report = makeDashboardReport(workspace);
  const metrics = report.metrics;
  const statuses = ["paid", "sent", "overdue", "draft"].map((status) => ({ status, total: workspace.invoices.filter((invoice) => getInvoiceStatus(invoice) === status).reduce((sum, invoice) => sum + Number(invoice.total), 0) }));
  const max = Math.max(...statuses.map((entry) => entry.total), 1);
  return `<section class="page"><div class="page-intro standard-intro"><div><p class="eyebrow">LOCAL REPORTING</p><h1>Reports</h1><p class="intro-copy">A simple business picture calculated from the records in this browser.</p></div><button class="secondary-button" data-action="download-report">⇩ Export report JSON</button></div><div class="report-hero"><div><span>NET CASH FLOW</span><strong>${money(metrics.netCashFlow)}</strong><p>${money(metrics.paidThisMonth)} received − ${money(metrics.expensesThisMonth)} expenses</p></div><div class="report-callout"><span>OPEN RECEIVABLES</span><strong>${money(metrics.outstanding)}</strong><p>${metrics.overdueCount ? `${metrics.overdueCount} invoice${metrics.overdueCount > 1 ? "s are" : " is"} overdue.` : "No overdue invoices today."}</p></div></div><div class="content-grid report-grid"><section class="panel"><div class="panel-heading"><div><p class="kicker">INVOICE VALUE</p><h2>By payment state</h2></div></div><div class="status-bars">${statuses.map((entry) => `<div class="status-bar"><div><span class="status-dot dot-${entry.status}"></span><span>${escapeHtml(statusLabel(entry.status))}</span></div><div class="bar"><i class="bar-${entry.status}" style="width:${Math.max(5, Math.round((entry.total / max) * 100))}%"></i></div><strong>${money(entry.total)}</strong></div>`).join("")}</div></section><section class="panel"><div class="panel-heading"><div><p class="kicker">THIS MONTH</p><h2>Report snapshot</h2></div></div><dl class="report-list"><div><dt>Payments received</dt><dd>${money(metrics.paidThisMonth)}</dd></div><div><dt>Expenses recorded</dt><dd>${money(metrics.expensesThisMonth)}</dd></div><div><dt>Invoices in workspace</dt><dd>${workspace.invoices.length}</dd></div><div><dt>Clients in workspace</dt><dd>${workspace.clients.length}</dd></div></dl></section></div><p class="privacy-callout"><span>⌁</span><span><strong>Private local report.</strong> This summary is calculated in your browser from its current local workspace. It is not uploaded anywhere.</span></p></section>`;
}

function printPreviewView(invoiceId) {
  const invoice = workspace.invoices.find((entry) => entry.id === invoiceId);
  if (!invoice) {
    currentView = "invoices";
    return invoicesView();
  }
  const client = clientFor(invoice.clientId);
  const items = invoice.items.map((item) => `<tr><td>${escapeHtml(item.description)}</td><td>${item.quantity}</td><td>${money(Number(item.quantity) * Number(item.unitPrice))}</td></tr>`).join("");
  return `<section class="print-preview page"><div class="print-preview-actions"><button class="secondary-button" data-action="close-print-preview">← Back to invoices</button><button class="primary-button" data-action="trigger-browser-print">Print invoice</button></div><article class="print-sheet"><header><div><p class="eyebrow">FROM</p><h1>${escapeHtml(workspace.business.name)}</h1><p>${escapeHtml(workspace.business.email)}</p></div><div class="print-invoice-code"><p class="eyebrow">INVOICE</p><h2>${escapeHtml(invoice.number)}</h2><p>Issued ${formatDate(invoice.issueDate)}<br />Due ${formatDate(invoice.dueDate)}</p></div></header><section class="print-bill-to"><p class="eyebrow">BILL TO</p><h2>${escapeHtml(client.company || client.name)}</h2><p>${escapeHtml(client.name)}<br />${escapeHtml(client.email)}</p></section><table><thead><tr><th>Description</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${items}</tbody></table><footer><span>${getInvoiceStatus(invoice) === "paid" ? "Paid in full" : "Amount due"}</span><strong>${money(getInvoiceStatus(invoice) === "paid" ? invoice.total : outstandingAmount(invoice))}</strong></footer></article></section>`;
}

function render() {
  const views = { dashboard: dashboardView, invoices: invoicesView, expenses: expensesView, clients: clientsView, reports: reportsView, print: () => printPreviewView(window.location.hash.replace("#print/", "")) };
  root.innerHTML = views[currentView]();
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === currentView));
  setMobileMenu(false);
}

function setMobileMenu(open) {
  sidebar.classList.toggle("open", open);
  mobileMenuButton.setAttribute("aria-expanded", String(open));
  mobileMenuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
}

function closeDialog() {
  dialogRoot.innerHTML = "";
  if (dialogOpener?.isConnected) dialogOpener.focus();
  dialogOpener = null;
}

function dialog(title, content, extraClass = "") {
  dialogOpener = document.activeElement;
  dialogRoot.innerHTML = `<div class="dialog-backdrop" data-action="close-dialog"><section class="dialog ${extraClass}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="dialog-header"><div><p class="eyebrow">INVOICEFLOW</p><h2 id="dialog-title">${escapeHtml(title)}</h2></div><button class="close-dialog" data-action="close-dialog" aria-label="Close">×</button></div>${content}</section></div>`;
  const first = dialogRoot.querySelector("input:not([type=hidden]), select, textarea") || dialogRoot.querySelector("button");
  requestAnimationFrame(() => first?.focus());
}

function clientOptions(selected = "") {
  return `<option value="">Select client</option>${workspace.clients.map((client) => `<option value="${client.id}" ${client.id === selected ? "selected" : ""}>${escapeHtml(client.company || client.name)} — ${escapeHtml(client.name)}</option>`).join("")}`;
}

function openInvoiceForm(clientId = "") {
  const number = createInvoiceNumber(workspace.invoices);
  dialog("Create invoice", `<form id="invoice-form" class="form-grid"><div class="field full"><label for="invoice-client">Client</label><select id="invoice-client" name="clientId" required>${clientOptions(clientId)}</select><button type="button" class="inline-link" data-action="new-client">+ Add a client first</button></div><div class="field"><label for="invoice-number">Invoice number</label><input id="invoice-number" name="number" value="${number}" required /></div><div class="field"><label for="invoice-status">Starting state</label><select id="invoice-status" name="status"><option value="sent">Awaiting payment</option><option value="draft">Draft</option></select></div><div class="field full"><label for="invoice-title">What is this for?</label><input id="invoice-title" name="title" placeholder="e.g. Website design — September" required /></div><div class="field line-field"><label for="line-description">Line item</label><input id="line-description" name="description" placeholder="e.g. Design and development" required /></div><div class="field"><label for="line-amount">Amount (${currency()})</label><input id="line-amount" name="amount" inputmode="decimal" type="number" min="0" step="0.01" placeholder="0" required /></div><div class="field"><label for="issue-date">Issue date</label><input id="issue-date" name="issueDate" type="date" value="${isoDate()}" required /></div><div class="field"><label for="due-date">Due date</label><input id="due-date" name="dueDate" type="date" value="${addDays(isoDate(), 14)}" required /></div><div class="dialog-actions full"><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button><button class="primary-button" type="submit">Create invoice</button></div></form>`);
}

function openExpenseForm() {
  dialog("Record expense", `<form id="expense-form" class="form-grid"><div class="field"><label for="expense-merchant">Merchant</label><input id="expense-merchant" name="merchant" placeholder="e.g. Design tools" required /></div><div class="field"><label for="expense-category">Category</label><select id="expense-category" name="category"><option>Software</option><option>Contractors</option><option>Travel</option><option>Supplies</option><option>Marketing</option><option>Other</option></select></div><div class="field"><label for="expense-amount">Amount (${currency()})</label><input id="expense-amount" name="amount" inputmode="decimal" type="number" min="0" step="0.01" required /></div><div class="field"><label for="expense-date">Date</label><input id="expense-date" name="date" type="date" value="${isoDate()}" required /></div><div class="field full"><label for="expense-note">Note <small>Optional</small></label><textarea id="expense-note" name="note" placeholder="Why was this needed?"></textarea></div><div class="dialog-actions full"><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button><button class="primary-button" type="button" data-action="submit-form">Save expense</button></div></form>`);
}

function openClientForm() {
  dialog("Add client", `<form id="client-form" class="form-grid"><div class="field"><label for="client-name">Contact name</label><input id="client-name" name="name" autocomplete="name" placeholder="e.g. Raya Patel" required /></div><div class="field"><label for="client-company">Company</label><input id="client-company" name="company" placeholder="e.g. Ember Works" /></div><div class="field full"><label for="client-email">Email address</label><input id="client-email" name="email" type="email" autocomplete="email" placeholder="name@company.com" required /></div><div class="dialog-actions full"><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button><button class="primary-button" type="submit">Save client</button></div></form>`);
}

function openClientEditForm(clientId) {
  const client = workspace.clients.find((entry) => entry.id === clientId);
  if (!client) return;
  dialog(`Edit ${client.name}`, `<form id="client-edit-form" class="form-grid"><input type="hidden" name="clientId" value="${client.id}" /><div class="field"><label for="edit-client-name">Contact name</label><input id="edit-client-name" name="name" autocomplete="name" value="${escapeHtml(client.name)}" required /></div><div class="field"><label for="edit-client-company">Company</label><input id="edit-client-company" name="company" value="${escapeHtml(client.company || "")}" /></div><div class="field full"><label for="edit-client-email">Email address</label><input id="edit-client-email" name="email" type="email" autocomplete="email" value="${escapeHtml(client.email)}" required /></div><div class="dialog-actions full"><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button><button class="primary-button" type="submit">Save client changes</button></div></form>`);
}

function openBusinessForm() {
  dialog("Business details", `<form id="business-form" class="form-grid"><div class="field"><label for="business-name">Business name</label><input id="business-name" name="name" value="${escapeHtml(workspace.business.name)}" required /></div><div class="field"><label for="business-currency">Currency</label><select id="business-currency" name="currency"><option ${currency() === "USD" ? "selected" : ""}>USD</option><option ${currency() === "PKR" ? "selected" : ""}>PKR</option><option ${currency() === "GBP" ? "selected" : ""}>GBP</option><option ${currency() === "EUR" ? "selected" : ""}>EUR</option></select></div><div class="field full"><label for="business-email">Business email</label><input id="business-email" name="email" type="email" value="${escapeHtml(workspace.business.email)}" required /></div><div class="dialog-actions full"><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button><button class="primary-button" type="submit">Save details</button></div></form>`);
}

function openInvoice(invoiceId) {
  const invoice = workspace.invoices.find((entry) => entry.id === invoiceId);
  if (!invoice) return;
  const client = clientFor(invoice.clientId);
  const status = getInvoiceStatus(invoice);
  const paid = Number(invoice.amountPaid || 0);
  const remaining = Math.max(0, Number(invoice.total) - paid);
  const payments = workspace.payments.filter((payment) => payment.invoiceId === invoice.id).sort((a, b) => b.date.localeCompare(a.date));
  dialog(`${invoice.number}`, `<div class="invoice-detail"><div class="invoice-detail-top"><div><p class="detail-client">${escapeHtml(client.company || client.name)}</p><h3>${escapeHtml(invoice.title)}</h3><p>${escapeHtml(client.name)} · <a href="mailto:${encodeURIComponent(client.email)}">${escapeHtml(client.email)}</a></p></div>${statusPill(invoice)}</div><div class="invoice-meta"><div><span>Issued</span><strong>${formatDate(invoice.issueDate)}</strong></div><div><span>Due</span><strong>${formatDate(invoice.dueDate)}</strong></div><div><span>Invoice total</span><strong>${money(invoice.total)}</strong></div></div><div class="line-items"><div class="line-head"><span>Item</span><span>Qty</span><span>Amount</span></div>${invoice.items.map((item) => `<div><span>${escapeHtml(item.description)}</span><span>${item.quantity}</span><strong>${money(Number(item.quantity) * Number(item.unitPrice))}</strong></div>`).join("")}</div><div class="invoice-total"><span>${status === "paid" ? "Paid in full" : "Still due"}</span><strong>${money(status === "paid" ? invoice.total : remaining)}</strong></div>${payments.length ? `<div class="payment-history"><p class="kicker">PAYMENT HISTORY</p>${payments.map((payment) => `<div><span>✓</span><p><strong>${money(payment.amount)}</strong> · ${escapeHtml(payment.method)}<small>${formatDate(payment.date)}${payment.note ? ` · ${escapeHtml(payment.note)}` : ""}</small></p></div>`).join("")}</div>` : ""}<div class="dialog-actions detail-actions"><button class="secondary-button" data-action="edit-invoice" data-id="${invoice.id}">Edit</button>${!["paid", "void", "draft"].includes(status) ? `<button class="secondary-button" data-action="record-payment" data-id="${invoice.id}">Record payment</button><button class="secondary-button" data-action="extend-due-date" data-id="${invoice.id}">Extend due date 7 days</button>` : ""}<button class="secondary-button" data-action="print-invoice" data-id="${invoice.id}">Print</button>${status === "draft" ? `<button class="primary-button" data-action="set-status" data-id="${invoice.id}" data-status="sent">Mark as sent</button>` : status === "sent" || status === "overdue" ? `<button class="plain-button danger" data-action="set-status" data-id="${invoice.id}" data-status="void">Void invoice</button>` : ""}</div></div>`, "invoice-dialog");
}

function openInvoiceEditForm(invoiceId) {
  const invoice = workspace.invoices.find((entry) => entry.id === invoiceId);
  if (!invoice) return;
  const item = invoice.items[0] || { description: "", unitPrice: invoice.total };
  dialog(`Edit ${invoice.number}`, `<form id="invoice-edit-form" class="form-grid"><input type="hidden" name="invoiceId" value="${invoice.id}" /><input type="hidden" name="dueDate" value="${invoice.dueDate}" /><div class="field full"><label for="edit-invoice-client">Client</label><select id="edit-invoice-client" name="clientId" required>${clientOptions(invoice.clientId)}</select></div><div class="field"><label for="edit-invoice-number">Invoice number</label><input id="edit-invoice-number" name="number" value="${escapeHtml(invoice.number)}" required /></div><div class="field"><label for="edit-invoice-status">Status</label><select id="edit-invoice-status" name="status"><option value="sent" ${invoice.status === "sent" ? "selected" : ""}>Awaiting payment</option><option value="draft" ${invoice.status === "draft" ? "selected" : ""}>Draft</option><option value="void" ${invoice.status === "void" ? "selected" : ""}>Void</option></select></div><div class="field full"><label for="edit-invoice-title">What is this for?</label><input id="edit-invoice-title" name="title" value="${escapeHtml(invoice.title)}" required /></div><div class="field line-field"><label for="edit-line-description">Line item</label><input id="edit-line-description" name="description" value="${escapeHtml(item.description)}" required /></div><div class="field"><label for="edit-line-amount">Amount (${currency()})</label><input id="edit-line-amount" name="amount" inputmode="decimal" type="number" min="0" step="0.01" value="${Number(item.unitPrice)}" required /></div><div class="field"><label for="edit-issue-date">Issue date</label><input id="edit-issue-date" name="issueDate" type="date" value="${invoice.issueDate}" required /></div><div class="field"><label>Due date</label><div class="date-summary"><strong>${formatDate(invoice.dueDate)}</strong><small>Use the 7-day extension action in the invoice preview to move this date.</small></div></div><div class="dialog-actions full"><button type="button" class="secondary-button" data-action="open-invoice" data-id="${invoice.id}">Cancel</button><button class="primary-button" type="submit">Save changes</button></div></form>`);
}

function openPaymentForm(invoiceId) {
  const invoice = workspace.invoices.find((entry) => entry.id === invoiceId);
  if (!invoice) return;
  const remaining = Math.max(0, Number(invoice.total) - Number(invoice.amountPaid || 0));
  dialog("Record payment", `<form id="payment-form" class="form-grid"><input type="hidden" name="invoiceId" value="${invoice.id}" /><div class="form-callout full"><strong>${escapeHtml(invoice.number)}</strong><span>${escapeHtml(invoice.title)} · ${money(remaining)} left to receive</span></div><div class="field"><label for="payment-amount">Amount received (${currency()})</label><input id="payment-amount" name="amount" type="number" inputmode="decimal" min="0.01" max="${remaining}" step="0.01" value="${remaining}" required /></div><div class="field"><label for="payment-date">Date received</label><input id="payment-date" name="date" type="date" value="${isoDate()}" required /></div><div class="field"><label for="payment-method">Method</label><select id="payment-method" name="method"><option>Bank transfer</option><option>Card</option><option>Cash</option><option>Other</option></select></div><div class="field"><label for="payment-note">Note <small>Optional</small></label><input id="payment-note" name="note" placeholder="e.g. Deposit" /></div><div class="dialog-actions full"><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button><button class="primary-button" type="button" data-action="submit-form">Save payment</button></div></form>`);
}

function download(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportInvoices() {
  const rows = [["Invoice number", "Client", "Title", "Issue date", "Due date", "Status", "Total", "Received", "Outstanding"]];
  workspace.invoices.forEach((invoice) => { const client = clientFor(invoice.clientId); rows.push([invoice.number, client.company || client.name, invoice.title, invoice.issueDate, invoice.dueDate, getInvoiceStatus(invoice), invoice.total, invoice.amountPaid || 0, outstandingAmount(invoice)]); });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  download("invoiceflow-invoices.csv", csv, "text/csv;charset=utf-8");
  showToast("Invoice CSV downloaded.");
}

function printInvoice(invoiceId) {
  if (!workspace.invoices.some((entry) => entry.id === invoiceId)) return;
  closeDialog();
  window.location.hash = `print/${invoiceId}`;
  currentView = "print";
  render();
}

function submitDialogForm(button) {
  const form = button.closest("form");
  if (!form || !form.reportValidity()) return;
  form.requestSubmit();
}

function handleAction(action, element) {
  if (action === "close-dialog") return closeDialog();
  if (action === "new-invoice") return openInvoiceForm();
  if (action === "new-invoice-for-client") return openInvoiceForm(element.dataset.id);
  if (action === "new-expense") return openExpenseForm();
  if (action === "new-client") return openClientForm();
  if (action === "edit-client") return openClientEditForm(element.dataset.id);
  if (action === "edit-business") return openBusinessForm();
  if (action === "open-invoice") return openInvoice(element.dataset.id);
  if (action === "edit-invoice") return openInvoiceEditForm(element.dataset.id);
  if (action === "record-payment") return openPaymentForm(element.dataset.id);
  if (action === "extend-due-date") {
    const invoice = workspace.invoices.find((entry) => entry.id === element.dataset.id);
    if (!invoice) return;
    invoice.dueDate = addDays(invoice.dueDate < isoDate() ? isoDate() : invoice.dueDate, 7);
    persist(); closeDialog(); render(); return showToast(`Due date extended to ${formatDate(invoice.dueDate)}.`);
  }
  if (action === "submit-form") return submitDialogForm(element);
  if (action === "print-invoice") return printInvoice(element.dataset.id);
  if (action === "close-print-preview") { history.replaceState(null, "", `${window.location.pathname}${window.location.search}`); currentView = "invoices"; return render(); }
  if (action === "trigger-browser-print") return window.print();
  if (action === "invoice-filter") { invoiceFilter = element.dataset.filter; return render(); }
  if (action === "delete-expense") { workspace.expenses = workspace.expenses.filter((expense) => expense.id !== element.dataset.id); persist(); render(); return showToast("Expense removed."); }
  if (action === "download-report") { download("invoiceflow-report.json", JSON.stringify(makeDashboardReport(workspace), null, 2), "application/json"); return showToast("Local report downloaded."); }
  if (action === "set-status") { const invoice = workspace.invoices.find((entry) => entry.id === element.dataset.id); invoice.status = element.dataset.status; if (invoice.status === "void") invoice.voidedDate = isoDate(); persist(); closeDialog(); render(); return showToast(`Invoice marked as ${invoice.status}.`); }
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view], [data-view-link]");
  if (viewButton) { currentView = viewButton.dataset.view || viewButton.dataset.viewLink; render(); root.focus(); return; }
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) { if (actionButton.dataset.action === "close-dialog" && event.target === actionButton && event.target.classList.contains("dialog-backdrop")) closeDialog(); else handleAction(actionButton.dataset.action, actionButton); }
});

document.addEventListener("input", (event) => { if (event.target.id === "invoice-search") { invoiceSearch = event.target.value; render(); document.querySelector("#invoice-search")?.focus(); } });

window.addEventListener("hashchange", () => {
  currentView = window.location.hash.startsWith("#print/") ? "print" : "dashboard";
  render();
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!form.matches("#invoice-form, #invoice-edit-form, #expense-form, #client-form, #client-edit-form, #payment-form, #business-form")) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  if (form.id === "invoice-form") {
    const amount = Number(data.amount);
    if (!data.clientId || !data.title.trim() || !data.description.trim() || !Number.isFinite(amount) || amount <= 0 || data.dueDate < data.issueDate) return showToast("Please add a client, a valid amount, and a due date after the issue date.", "error");
    workspace.invoices.unshift({ id: makeId("invoice"), number: data.number.trim(), clientId: data.clientId, title: data.title.trim(), issueDate: data.issueDate, dueDate: data.dueDate, status: data.status, amountPaid: 0, items: [{ description: data.description.trim(), quantity: 1, unitPrice: amount }], total: invoiceTotal([{ quantity: 1, unitPrice: amount }]) });
    persist(); closeDialog(); currentView = "invoices"; render(); return showToast("Invoice created and saved locally.");
  }
  if (form.id === "invoice-edit-form") {
    const invoice = workspace.invoices.find((entry) => entry.id === data.invoiceId);
    const amount = Number(data.amount);
    if (!invoice || !data.clientId || !data.title.trim() || !data.description.trim() || !Number.isFinite(amount) || amount <= 0 || data.dueDate < data.issueDate) return showToast("Please add a client, a valid amount, and a due date after the issue date.", "error");
    if (Number(invoice.amountPaid || 0) > amount) return showToast("The new invoice amount cannot be below payments already recorded.", "error");
    Object.assign(invoice, { number: data.number.trim(), clientId: data.clientId, title: data.title.trim(), issueDate: data.issueDate, dueDate: data.dueDate, status: data.status, items: [{ description: data.description.trim(), quantity: 1, unitPrice: amount }], total: invoiceTotal([{ quantity: 1, unitPrice: amount }]) });
    if (invoice.amountPaid >= invoice.total) { invoice.status = "paid"; invoice.paidDate ||= isoDate(); }
    persist(); closeDialog(); render(); return showToast("Invoice changes saved locally.");
  }
  if (form.id === "expense-form") {
    const amount = Number(data.amount); if (!data.merchant.trim() || !Number.isFinite(amount) || amount <= 0) return showToast("Add a merchant and a valid expense amount.", "error");
    workspace.expenses.unshift({ id: makeId("expense"), category: data.category, merchant: data.merchant.trim(), amount, date: data.date, note: data.note.trim() }); persist(); closeDialog(); render(); return showToast("Expense saved locally.");
  }
  if (form.id === "client-form") {
    workspace.clients.unshift({ id: makeId("client"), name: data.name.trim(), company: data.company.trim(), email: data.email.trim() }); persist(); closeDialog(); render(); return showToast("Client added.");
  }
  if (form.id === "client-edit-form") {
    const client = workspace.clients.find((entry) => entry.id === data.clientId);
    if (!client || !data.name.trim() || !data.email.trim()) return showToast("Add a client name and email address.", "error");
    Object.assign(client, { name: data.name.trim(), company: data.company.trim(), email: data.email.trim() });
    persist(); closeDialog(); render(); return showToast("Client changes saved locally.");
  }
  if (form.id === "payment-form") {
    const invoice = workspace.invoices.find((entry) => entry.id === data.invoiceId); const amount = Number(data.amount); const remaining = Number(invoice.total) - Number(invoice.amountPaid || 0);
    if (!invoice || !Number.isFinite(amount) || amount <= 0 || amount > remaining) return showToast("Payment amount must be greater than zero and no more than the amount due.", "error");
    workspace.payments.unshift({ id: makeId("payment"), invoiceId: invoice.id, amount, date: data.date, method: data.method, note: data.note.trim() }); invoice.amountPaid = Number(invoice.amountPaid || 0) + amount; invoice.status = invoice.amountPaid >= invoice.total ? "paid" : "sent"; if (invoice.status === "paid") invoice.paidDate = data.date;
    persist(); closeDialog(); render(); return showToast("Payment recorded and invoice updated.");
  }
  if (form.id === "business-form") { workspace.business = { ...workspace.business, name: data.name.trim(), email: data.email.trim(), currency: data.currency }; persist(); closeDialog(); render(); return showToast("Business details updated."); }
});

document.querySelector("#new-invoice").addEventListener("click", () => openInvoiceForm());
document.querySelector("#export-data").addEventListener("click", exportInvoices);
mobileMenuButton.addEventListener("click", () => setMobileMenu(!sidebar.classList.contains("open")));
document.addEventListener("keydown", (event) => {
  const activeDialog = dialogRoot.querySelector('[role="dialog"]');
  if (event.key === "Escape" && activeDialog) { event.preventDefault(); closeDialog(); return; }
  if (event.key === "Tab" && activeDialog) {
    const focusable = [...activeDialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") { event.preventDefault(); openInvoiceForm(); }
});

persist();
render();
