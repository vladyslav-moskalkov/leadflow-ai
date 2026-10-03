# Validation checklist

No new live execution, classification benchmark or conversion measurement has been performed while preparing this documentation.

## Before publication

- [x] Obtain the original source export and calculate its SHA-256 fingerprint.
- [x] Generate an inactive sanitized copy; verify that all six credential bindings and original resource locators are absent.
- [x] Preserve all 22 node names/types/versions, connection topology, Code-node JavaScript and the original qualifier prompt.
- [x] Confirm that the configured model is `gpt-5-mini`.
- [x] Check local links, JavaScript syntax, expression references, sheet mappings and list routing.
- [x] Run offline regression checks: **30 passed, 0 failed**, on 3 October 2026.

Source SHA-256: `624e598d2dc390955e311b56c7debe587ea3762c79a053ea74ea419ac8037f5a`.

Checks execute the original Code-node JavaScript with synthetic inputs and inspect the exported graph/configuration. IF/Switch checks inspect configuration; they do not emulate the n8n runtime. Tests documenting known failure modes pass when those limitations are reproduced, not when the underlying limitation is fixed.

Run with `npm test` on Node.js 22 or newer. Preparation was checked locally on Node.js 26.4.0; GitHub Actions is configured for Node.js 22.

## Separate n8n test environment

| Scenario | What to verify |
| --- | --- |
| Valid synthetic form submission | The same submitted fields reach Sheets, Zoho and Telegram |
| Hot / Warm / Cold model response | The appropriate test list is selected and the correct profile ID is used |
| Unknown string state | Cold fallback is applied as configured |
| Missing/non-string state | Observe strict-validation behavior; do not assume graceful recovery |
| Malformed or fenced JSON | Observe the parser failure and confirm that no misleading success is reported |
| Missing contact data | Observe integration errors; the source has no required-field validation |
| Repeated submission | Measure duplicate side effects; no exactly-once guarantee is claimed |
| HTML characters in form text | Verify Telegram formatting/escaping behavior |
| Klaviyo object response | Verify/fix profile-ID extraction in a separately versioned change |
| Service 401/403/429/5xx | Observe partial completion and define a reconciliation policy before real use |
| Unauthenticated webhook request | Keep exposure restricted; implement reviewed protection before public use |

Record the n8n version, imported node versions, fixture used, expected outcome, actual node outputs and date. Redact tokens and all real personal information from any shared evidence.

## What not to claim

Passing offline checks does not establish AI accuracy, supported throughput, conversion gains, valid marketing consent or successful execution across live APIs. The portfolio scale of 20–30 enquiries/day and a three-person team remains an explicitly labelled scenario assumption.
