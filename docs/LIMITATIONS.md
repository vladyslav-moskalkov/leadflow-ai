# Known limitations

These observations come from the supplied export's static configuration. They are not live integration measurements, and the preparation does not silently change workflow logic.

## Input and duplicate handling

- The first Code node copies values from the request body. It does not trim, normalize, validate or require them.
- There is no visible duplicate lookup or idempotency key. Repeated submissions can append another sheet row, create another CRM lead and send another notification.
- The Zoho Company field is a fixed template value, not the submitted business name.
- The full submitted name is mapped to both First_Name and Last_Name.
- Telegram uses HTML parse mode while user-supplied fields are interpolated without visible escaping.

## AI output and fallback

- `gpt-5-mini` is connected to a basic LLM chain. JSON is requested by prompt, not enforced through a connected structured-output parser.
- `Parse LLM JSON` executes `JSON.parse` directly. Markdown code fences, malformed JSON or a missing text response can fail before the fallback node.
- The fallback checks whether `state` differs from all three expected lowercase strings and then assigns `cold`. This is not a recovery path for a failed model call or parser exception.
- An unknown string is routed to Cold, rather than queued for human review. Classification accuracy is not measured by structural checks.
- Missing/non-string state values require a live n8n check because strict type validation may fail before routing.

## Klaviyo response-shape risk

The source expression is `JSON.parse($json.data).data.id`. It expects `$json.data` to be a JSON string containing another `data` object. A normal parsed API response with an object at `$json.data` does not satisfy that expression.

The [Klaviyo profile API](https://developers.klaviyo.com/en/v2026-04-15/reference/create_or_update_profile) returns the created or updated profile. If the n8n node exposes that response as an already-parsed object, the retained expression is incompatible. The source HTTP Request node does not explicitly set the response format. Actual compatibility therefore needs to be checked in the target n8n environment. This is a known integration risk, not a claim that the exported workflow has just been executed and failed.

The submitted `contact` is also passed directly as `phone_number`; it is not restricted to valid telephone input. Profile creation/list membership must not be represented as marketing-consent collection.

## Reliability and exposure

- The webhook has no explicitly configured authentication in the source export.
- The downstream branches are separate routes, not an atomic transaction. One service can succeed while another fails.
- There is no dedicated error workflow, application-level retry/reconciliation path or explicit end-to-end success acknowledgement in this export.
- The list assignment does not remove a profile from previously assigned temperature lists.
- The source n8n application version and original execution logs were not supplied.

Before real use, validate authentication, input handling, output schemas, HTTP response handling, idempotency, consent and operational monitoring in a separate test environment. Improvements should be versioned and re-tested separately from the source-preserving public-preparation copy.
