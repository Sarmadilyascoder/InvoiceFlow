# InvoiceFlow — Product plan

InvoiceFlow is a **browser-only small-business cash-flow workspace**. It tracks clients, invoices, expenses, payment state, and actionable due dates without sending financial data to any external service.

| Object | Core fields | Purpose |
| --- | --- | --- |
| Business | name, email, currency | Report and invoice context |
| Client | name, email, company | Recipient and invoice relationship |
| Invoice | number, clientId, dates, line items, status, paid amount | Billing, due-date, and payment tracking |
| Expense | category, merchant, amount, date, note | Cost tracking and cash-flow reporting |
| Payment | invoiceId, amount, date, method, note | Explicit receipt record; updates the linked invoice's received amount |
| Dashboard report | period, metrics, invoice summary, expense-by-category | Computed local report/export shape; it stores no separate financial copy |

The dashboard will calculate **outstanding invoices, paid revenue, expenses, net cash flow, and overdue count** from locally stored data. Its generated report uses a stable shape of `generatedOn`, `period`, `metrics`, `invoiceSummary`, and `expenseByCategory`. All initial sample entries are clearly replaceable through the interface and exist solely to demonstrate the finished portfolio workflow.

## Design direction

The interface uses a calm editorial finance aesthetic: warm paper surfaces, ink-blue typography, clay-orange accents, roomy grids, and visible status color coding. It will be responsive, keyboard-accessible, and print-friendly.
