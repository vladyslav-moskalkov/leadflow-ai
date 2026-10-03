# Security notes

This is an educational prototype. Do not treat it as a production-ready public intake endpoint.

## Before sharing an export

- Remove all node credential bindings, instance/workflow/version IDs, source webhook IDs and execution data.
- Replace spreadsheet locators, Telegram chat IDs and all three Klaviyo list IDs, including IDs embedded in the sticky note.
- Disable the exported workflow and clear `pinData`.
- Scan for literal secrets and personal records; pattern scanning is not a universal secret detector.
- Do not publish credential exports, `.env` files, customer submissions, private execution logs or unredacted screenshots.

## Runtime privacy

Google Sheets, Telegram and Zoho receive submitted contact information. The model receives the business description and automation goals. Klaviyo receives the email address and contact value as `phone_number`.

Use synthetic data first. Before real use, establish an appropriate legal basis, access restrictions and retention/redaction policies for each connected service. Marketing list membership must not be treated as proof of consent or an instruction to send campaigns.

## Webhook access

The supplied Webhook node does not explicitly configure authentication. An obscure route is not an access-control mechanism. Do not expose it publicly without a reviewed protection strategy, input limits and abuse handling.

## Reporting a concern

Contact Vladyslav privately on [LinkedIn](https://www.linkedin.com/in/vladyslav-moskalkov/). Do not post secrets or customer data in a public issue. If a credential is exposed, revoke or rotate it; deleting it from the latest file does not remove it from Git history.
