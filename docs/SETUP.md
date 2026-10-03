# Setup guide

Import [the sanitized workflow](../workflows/lead-intake.json) into a separate test environment. It is inactive and intentionally requires your own credentials and resource identifiers.

## Prerequisites

- A separate n8n test environment. The source application version was not included; retained node versions must be checked for import compatibility.
- Google Sheets, Telegram, Zoho CRM, OpenAI and Klaviyo test resources/credentials.
- OpenAI access to the source-configured model, `gpt-5-mini`.
- Three Klaviyo test lists: Hot, Warm and Cold. Keep campaigns disabled.

## Configuration checklist

1. Import the sanitized export; keep it inactive initially.
2. Reconnect Google Sheets, Telegram, Zoho, OpenAI and both HTTP Header Auth nodes. Never paste an API key into a public workflow file.
3. Replace the spreadsheet ID and sheet name. Required columns are `created at`, `name`, `contact`, `email`, `business Description`, `automation Goals`.
4. Set the Telegram test chat ID. Submitted text is sent with HTML parse mode; review escaping before sending arbitrary form input.
5. Replace Hot, Warm and Cold list ID placeholders in their Set nodes. Check that all routes resolve to the intended test list.
6. Review the fixed Zoho Company value and the source name mapping. The source assigns the full submitted name to both First_Name and Last_Name.
7. Check HTTP response formatting before running the Klaviyo path. The source profile-ID expression assumes a particular string response shape; see [limitations](LIMITATIONS.md).
8. Review webhook protection, input validation, duplicate handling and marketing-consent requirements before any public activation.

## Form payload contract

The first Code node reads these keys from `$json.body`:

```json
{
  "name": "Demo Lead",
  "contact": "+12025550123",
  "email": "demo.lead@example.com",
  "business_description": "An online education team receives repetitive course enquiries.",
  "automation_goals": "Connect the enquiry form to the CRM and notify the sales team."
}
```

This is synthetic data, not a real contact. Use only test resources; example phone/email formatting is not proof of API acceptance or deliverability.

## Klaviyo integration

The source calls `POST /api/profile-import` and then `POST /api/lists/{id}/relationships/profiles`, with the `2026-04-15` revision header retained. Check current [Klaviyo API documentation](https://developers.klaviyo.com/en/reference/create_or_update_profile) when reconnecting credentials and validating responses.

Do not assume that a successful webhook response proves every downstream service completed. Verify actual node outputs and records using the [validation checklist](VALIDATION.md).
