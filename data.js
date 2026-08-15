export const STORAGE_KEY = "invoiceflow.workspace.v1";

export const CURRENCY = "USD";

export const formatCurrency = (value, currency = CURRENCY) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const formatDate = (value) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
};

export const isoDate = (date = new Date()) => date.toISOString().slice(0, 10);

export const addDays = (date, days) => {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return isoDate(next);
};

export const getInvoiceStatus = (invoice, today = isoDate()) => {
  if (invoice.status === "draft") return "draft";
  if (invoice.status === "paid" || Number(invoice.amountPaid || 0) >= Number(invoice.total || 0)) return "paid";
  if (invoice.status === "void") return "void";
  return invoice.dueDate < today ? "overdue" : "sent";
};

export const outstandingAmount = (invoice, today = isoDate()) => {
  if (["paid", "void", "draft"].includes(getInvoiceStatus(invoice, today))) return 0;
  return Math.max(0, Number(invoice.total || 0) - Number(invoice.amountPaid || 0));
};

export const sumBy = (entries, selector) => entries.reduce((total, entry) => total + Number(selector(entry) || 0), 0);

export const invoiceTotal = (items) =>
  Math.round(
    items.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0) * 100
  ) / 100;

export const calculateMetrics = (invoices, expenses, payments = [], now = new Date()) => {
  if (payments instanceof Date) {
    now = payments;
    payments = [];
  }
  const month = now.toISOString().slice(0, 7);
  const paidThisMonth = payments.length
    ? sumBy(payments.filter((payment) => payment.date?.startsWith(month)), (payment) => payment.amount)
    : sumBy(
        invoices.filter((invoice) => getInvoiceStatus(invoice, isoDate(now)) === "paid" && invoice.paidDate?.startsWith(month)),
        (invoice) => invoice.total
      );
  const expensesThisMonth = sumBy(
    expenses.filter((expense) => expense.date?.startsWith(month)),
    (expense) => expense.amount
  );
  return {
    outstanding: sumBy(invoices, outstandingAmount),
    overdueAmount: sumBy(
      invoices.filter((invoice) => getInvoiceStatus(invoice, isoDate(now)) === "overdue"),
      (invoice) => outstandingAmount(invoice, isoDate(now))
    ),
    paidThisMonth,
    expensesThisMonth,
    netCashFlow: paidThisMonth - expensesThisMonth,
    overdueCount: invoices.filter((invoice) => getInvoiceStatus(invoice, isoDate(now)) === "overdue").length,
  };
};

export const makeDashboardReport = (workspace, now = new Date()) => {
  const metrics = calculateMetrics(workspace.invoices, workspace.expenses, workspace.payments, now);
  const expenseByCategory = workspace.expenses.reduce((summary, expense) => {
    summary[expense.category] = Number(summary[expense.category] || 0) + Number(expense.amount || 0);
    return summary;
  }, {});
  return {
    generatedOn: isoDate(now),
    period: now.toISOString().slice(0, 7),
    metrics,
    invoiceSummary: workspace.invoices.map((invoice) => ({
      number: invoice.number,
      clientId: invoice.clientId,
      total: invoice.total,
      outstanding: outstandingAmount(invoice),
      status: getInvoiceStatus(invoice, isoDate(now)),
      dueDate: invoice.dueDate,
    })),
    expenseByCategory,
  };
};

export const createInvoiceNumber = (invoices) => {
  const highest = invoices.reduce((max, invoice) => {
    const digits = Number(String(invoice.number || "").replace(/\D/g, ""));
    return Number.isFinite(digits) ? Math.max(max, digits) : max;
  }, 1000);
  return `INV-${highest + 1}`;
};

export const makeId = (prefix = "item") => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const blankWorkspace = () => ({
  business: { name: "Your studio", email: "hello@yourstudio.com", currency: CURRENCY },
  clients: [],
  invoices: [],
  expenses: [],
  payments: [],
});

export const getSeedWorkspace = () => {
  const today = isoDate();
  return {
    business: { name: "Mira Studio", email: "hello@mirastudio.co", currency: CURRENCY },
    clients: [
      { id: "client-northstar", name: "Northstar Labs", email: "finance@northstar.example", company: "Northstar Labs" },
      { id: "client-ember", name: "Raya Patel", email: "raya@emberworks.example", company: "Ember Works" },
      { id: "client-cascade", name: "Cascade Supply", email: "accounts@cascade.example", company: "Cascade Supply" },
    ],
    invoices: [
      { id: "inv-1001", number: "INV-1001", clientId: "client-northstar", title: "Analytics dashboard — August", issueDate: addDays(today, -16), dueDate: addDays(today, 5), status: "sent", amountPaid: 0, items: [{ description: "Dashboard build", quantity: 1, unitPrice: 3200 }], total: 3200 },
      { id: "inv-1002", number: "INV-1002", clientId: "client-ember", title: "Website maintenance", issueDate: addDays(today, -34), dueDate: addDays(today, -4), status: "sent", amountPaid: 0, items: [{ description: "Monthly maintenance", quantity: 1, unitPrice: 760 }], total: 760 },
      { id: "inv-1003", number: "INV-1003", clientId: "client-cascade", title: "Product photography", issueDate: addDays(today, -10), dueDate: addDays(today, 20), status: "paid", amountPaid: 1850, paidDate: addDays(today, -2), items: [{ description: "Product photo set", quantity: 1, unitPrice: 1850 }], total: 1850 },
      { id: "inv-1004", number: "INV-1004", clientId: "client-northstar", title: "Research sprint", issueDate: addDays(today, -45), dueDate: addDays(today, -18), status: "paid", amountPaid: 2400, paidDate: addDays(today, -17), items: [{ description: "Research workshop", quantity: 1, unitPrice: 2400 }], total: 2400 },
    ],
    expenses: [
      { id: "expense-1", category: "Software", merchant: "Design tools", amount: 74, date: addDays(today, -3), note: "Monthly workspace" },
      { id: "expense-2", category: "Contractors", merchant: "Photo assistant", amount: 320, date: addDays(today, -9), note: "Cascade shoot" },
      { id: "expense-3", category: "Travel", merchant: "City transit", amount: 38, date: addDays(today, -12), note: "Client meeting" },
    ],
    payments: [
      { id: "payment-1", invoiceId: "inv-1003", amount: 1850, date: addDays(today, -2), method: "Bank transfer", note: "Paid in full" },
      { id: "payment-2", invoiceId: "inv-1004", amount: 2400, date: addDays(today, -17), method: "Card", note: "Paid in full" },
    ],
  };
};

export const loadWorkspace = (storage = localStorage) => {
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (!saved) return getSeedWorkspace();
    const parsed = JSON.parse(saved);
    if (!parsed?.business || !Array.isArray(parsed?.invoices) || !Array.isArray(parsed?.expenses)) return getSeedWorkspace();
    return { ...parsed, payments: Array.isArray(parsed.payments) ? parsed.payments : [] };
  } catch {
    return getSeedWorkspace();
  }
};

export const saveWorkspace = (workspace, storage = localStorage) => {
  storage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  return workspace;
};
