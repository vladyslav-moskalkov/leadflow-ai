import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = fs.readFileSync(path.join(root, 'workflows/lead-intake.json'), 'utf8');
const workflow = JSON.parse(raw);
const node = name => workflow.nodes.find(item => item.name === name);
const assignment = name => node(name).parameters.assignments.assignments;
const runCode = (name, context) => new vm.Script('(function(){\n' + node(name).parameters.jsCode + '\n})()').runInNewContext(context, {timeout: 500});
const plain = value => JSON.parse(JSON.stringify(value));
const connections = (name, type = 'main', output = 0) => (workflow.connections[name]?.[type]?.[output] ?? []).map(item => item.node);

test('export contains 22 nodes, 21 executable', () => {
  assert.equal(workflow.nodes.length, 22);
  assert.equal(workflow.nodes.filter(n => n.type !== 'n8n-nodes-base.stickyNote').length, 21);
});
test('public copy is inactive and contains no execution data', () => {
  assert.equal(workflow.active, false);
  assert.deepEqual(workflow.pinData, {});
});
test('credential bindings and webhook identifiers are absent', () => {
  for (const n of workflow.nodes) {
    assert.equal('credentials' in n, false);
    assert.equal('webhookId' in n, false);
  }
  for (const key of ['id', 'versionId', 'meta', 'tags', 'nodeGroups']) assert.equal(key in workflow, false);
});
test('no common secret patterns or literal contact emails in export', () => {
  assert.doesNotMatch(raw, /sk-(?:proj-)?[A-Za-z0-9_-]{15,}|pk_[A-Za-z0-9_-]{15,}|gh[pousr]_[A-Za-z0-9_]+|xox[baprs]-[A-Za-z0-9-]+|-----BEGIN .*PRIVATE KEY-----/);
  assert.doesNotMatch(raw, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
});
test('all connection targets and sources exist', () => {
  const names = new Set(workflow.nodes.map(n => n.name));
  assert.equal(names.size, workflow.nodes.length);
  for (const [source, groups] of Object.entries(workflow.connections)) {
    assert(names.has(source));
    for (const outputs of Object.values(groups)) for (const entries of outputs) for (const edge of entries) assert(names.has(edge.node));
  }
});
test('literal expression node references exist', () => {
  const names = new Set(workflow.nodes.map(n => n.name));
  for (const match of raw.matchAll(/\$\('([^']+)'\)/g)) assert(names.has(match[1]));
});
test('all three embedded Code nodes compile', () => {
  const codes = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.code');
  assert.equal(codes.length, 3);
  for (const n of codes) new vm.Script('(function(){\n' + n.parameters.jsCode + '\n})');
});
test('model is gpt-5-mini connected to qualifier', () => {
  assert.equal(node('OpenAI Chat Model').parameters.model.value, 'gpt-5-mini');
  assert.deepEqual(connections('OpenAI Chat Model', 'ai_languageModel'), ['Lead Qualifier']);
});
test('webhook is POST with public-copy placeholder path', () => {
  assert.equal(node('Webhook').parameters.httpMethod, 'POST');
  assert.equal(node('Webhook').parameters.path, 'leadflow-demo');
});
test('shared mapping forks into four intended integrations', () => {
  assert.deepEqual(new Set(connections('Edit Fields')), new Set(['Append row in sheet', 'Code in JavaScript1', 'Create a lead', 'Lead Qualifier']));
});
test('Sheets and Telegram resource identifiers are placeholders', () => {
  assert.equal(node('Append row in sheet').parameters.documentId.value, 'REPLACE_WITH_SPREADSHEET_ID');
  assert.equal(node('Append row in sheet').parameters.sheetName.value, 'Leads');
  assert.equal(node('Send a text message').parameters.chatId, 'REPLACE_WITH_TELEGRAM_CHAT_ID');
});
test('synthetic form fields map to source contract', () => {
  const body = JSON.parse(fs.readFileSync(path.join(root, 'examples/form-submission.json'), 'utf8'));
  const result = plain(runCode('Code in JavaScript', {$json: {body}}));
  assert.deepEqual(result, [{json: {name: body.name, contact: body.contact, email: body.email, businessDescription: body.business_description, automationGoals: body.automation_goals}}]);
});
test('missing body maps to empty fields, not a validation failure', () => {
  const result = runCode('Code in JavaScript', {$json: {}});
  assert.equal(result[0].json.name, undefined);
  assert.equal(result[0].json.email, undefined);
});
test('source mapper does not normalize input', () => {
  const result = runCode('Code in JavaScript', {$json: {body: {name: ' Demo ', email: 'not-an-email', contact: 'Telegram'}}});
  assert.equal(result[0].json.name, ' Demo ');
  assert.equal(result[0].json.email, 'not-an-email');
  assert.equal(result[0].json.contact, 'Telegram');
});
for (const state of ['hot', 'warm', 'cold', 'other']) {
  test('JSON parser preserves state: ' + state, () => {
    const result = plain(runCode('Parse LLM JSON', {$input: {item: {json: {text: JSON.stringify({state})}}}}));
    assert.deepEqual(result, {json: {state}});
  });
}
for (const text of ['not json', '```json\n{"state":"hot"}\n```', '']) {
  test('known limitation: invalid JSON throws: ' + JSON.stringify(text), () => {
    assert.throws(() => runCode('Parse LLM JSON', {$input: {item: {json: {text}}}}));
  });
}
test('unknown-state IF uses strict AND comparisons', () => {
  const conditions = node('If unknown state').parameters.conditions;
  assert.equal(conditions.combinator, 'and');
  assert.equal(conditions.options.typeValidation, 'strict');
  assert.equal(conditions.options.caseSensitive, true);
  assert.deepEqual(conditions.conditions.map(c => c.rightValue), ['warm', 'cold', 'hot']);
  assert(conditions.conditions.every(c => c.operator.operation === 'notEquals'));
  assert.equal(assignment('Fixed Customer State')[0].value, 'cold');
  assert.deepEqual(connections('If unknown state', 'main', 0), ['Fixed Customer State']);
  assert.deepEqual(connections('If unknown state', 'main', 1), ['Switch State']);
});
for (const [index, state] of ['warm', 'hot', 'cold'].entries()) {
  test('switch output and placeholder list: ' + state, () => {
    assert.equal(node('Switch State').parameters.rules.values[index].conditions.conditions[0].rightValue, state);
    assert.deepEqual(connections('Switch State', 'main', index), [state + ' list id']);
    assert.equal(assignment(state + ' list id')[0].value, 'REPLACE_WITH_' + state.toUpperCase() + '_LIST_ID');
    assert.deepEqual(connections(state + ' list id'), ['list id']);
  });
}
test('Telegram notification contains submitted fields', () => {
  const result = runCode('Code in JavaScript1', {$json: {name: 'Demo', contact: 'Contact', email: 'demo@example.com', 'business Description': 'Courses', 'automation Goals': 'CRM'}});
  for (const value of ['Demo', 'Contact', 'demo@example.com', 'Courses', 'CRM']) assert(result[0].json.text.includes(value));
});
test('known limitation: Telegram HTML input is not escaped', () => {
  const result = runCode('Code in JavaScript1', {$json: {name: '<b>Demo</b>'}});
  assert(result[0].json.text.includes('<b>Demo</b>'));
  assert.equal(node('Send a text message').parameters.additionalFields.parse_mode, 'HTML');
});
test('Klaviyo requests preserve revision and credential-auth mode', () => {
  for (const name of ['Create or Update Profile', 'Add profile to list']) {
    const p = node(name).parameters;
    assert.equal(p.method, 'POST');
    assert.equal(p.authentication, 'genericCredentialType');
    assert.equal(p.genericAuthType, 'httpHeaderAuth');
    assert(p.headerParameters.parameters.some(h => h.name === 'revision' && h.value === '2026-04-15'));
  }
});
test('known limitation: profile ID expression expects a JSON string envelope', () => {
  const expression = assignment('parse profile id')[0].value;
  assert.equal(expression, '={{JSON.parse($json.data).data.id }}');
  const evaluate = data => vm.runInNewContext(expression.slice(3, -2), {$json: {data}}, {timeout: 500});
  assert.equal(evaluate('{"data":{"id":"DEMO_PROFILE"}}'), 'DEMO_PROFILE');
  assert.throws(() => evaluate({id: 'DEMO_PROFILE'}));
});
test('documentation relative links resolve', () => {
  for (const relative of ['README.md', 'SECURITY.md', 'docs/SETUP.md', 'docs/VALIDATION.md', 'docs/LIMITATIONS.md']) {
    const file = path.join(root, relative);
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/\]\(([^)]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(match[1])) continue;
      assert(fs.existsSync(path.resolve(path.dirname(file), match[1].split('#')[0])), relative + ': ' + match[1]);
    }
  }
});
