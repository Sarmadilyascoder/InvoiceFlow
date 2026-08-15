# InvoiceFlow

**InvoiceFlow** is a polished, browser-only invoice, expense, and payment tracker for small businesses. It is a public portfolio project focused on practical product design, accessible workflows, and reliable client-side data handling.

## What it does

InvoiceFlow lets a business owner create and edit clients and invoices, track draft/sent/paid/void status, record expense and payment receipts, and monitor outstanding, paid, expense, overdue, and cash-flow figures. A dedicated due-date extension action gives open invoices a clear follow-up workflow.

The project also includes invoice search and status filtering, editable local business details, print-friendly same-page invoice previews, invoice CSV export, and a local dashboard-report download. Workspace data stays in the browser through local storage; it is not sent to a remote service.

## Quality and accessibility

The interface includes responsive phone and tablet layouts, empty states, native validation, a keyboard skip link, accessible mobile-navigation state, dialog focus management, Escape-to-close behavior, and a Tab-key focus trap. It respects reduced-motion preferences.

Automated checks cover monetary calculations, invoice status rules, dashboard-report calculations, local browser persistence, essential export and due-date actions, and key accessibility contracts.

## Local use

```bash
npm run check
npm run build
npx serve . -l 4174
```

## Data handling

The project starts with clearly replaceable example business records so the dashboard is immediately understandable. Use the interface to replace them with your own local records. Clearing browser storage for the site resets the workspace.

## Tech

This is a dependency-light static application built with semantic HTML, modern CSS, and vanilla JavaScript. It requires no account, API key, database, or server-side storage.

## Deployment

The repository includes a GitHub Actions workflow that builds the `dist/` static export and deploys it to GitHub Pages on every push to `main`. In the repository’s **Settings → Pages**, select **GitHub Actions** as the build and deployment source.
