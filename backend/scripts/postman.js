// Generates docs/postman_collection.json from the OpenAPI spec. Run: npm run postman
import fs from 'fs';
import { openapi } from '../src/config/swagger.js';

const deref = (s) => (s?.$ref ? openapi.components.schemas[s.$ref.split('/').pop()] : s);
const ID_VARS = { candidate: '{{candidateId}}', interviewer: '{{interviewerId}}', interview: '{{interviewId}}' };

function sample(schema, key = '', depth = 0) {
  schema = deref(schema);
  if (!schema || depth > 3) return undefined;
  if (ID_VARS[key]) return ID_VARS[key];
  if (schema.example !== undefined) return schema.example;
  if (schema.format === 'date-time') return new Date(Date.now() + 86400000).toISOString();
  switch (schema.type) {
    case 'object':
      return Object.fromEntries(Object.entries(schema.properties || {}).map(([k, v]) => [k, sample(v, k, depth + 1)]).filter(([, v]) => v !== undefined));
    case 'array':
      return [sample(schema.items, key, depth + 1)].filter((x) => x !== undefined);
    case 'integer':
    case 'number':
      return schema.default ?? schema.minimum ?? 1;
    case 'boolean':
      return false;
    default:
      return schema.enum?.[0] ?? schema.default ?? 'string';
  }
}

const PUBLIC = new Set(['/auth/signup', '/auth/login', '/auth/forgot-password', '/auth/reset-password']);
const folders = {};

for (const [route, methods] of Object.entries(openapi.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    const url = route.replace(/\{(\w+)\}/g, '{{$1}}');
    const content = op.requestBody?.content || {};
    const json = content['application/json'];
    const form = content['multipart/form-data'];
    const item = {
      name: `${method.toUpperCase()} ${route} - ${op.summary || ''}`.trim(),
      request: {
        method: method.toUpperCase(),
        header: json ? [{ key: 'Content-Type', value: 'application/json' }] : [],
        url: {
          raw: `{{baseUrl}}${url}`,
          host: ['{{baseUrl}}'],
          path: url.split('/').filter(Boolean),
          query: (op.parameters || []).filter((p) => p.in === 'query').map((p) => ({ key: p.name, value: '', disabled: true })),
        },
        ...(json ? { body: { mode: 'raw', raw: JSON.stringify(sample(json.schema), null, 2), options: { raw: { language: 'json' } } } } : {}),
        ...(form ? { body: { mode: 'formdata', formdata: [{ key: 'resume', type: 'file', src: [] }] } } : {}),
        ...(PUBLIC.has(route) ? { auth: { type: 'noauth' } } : {}),
      },
    };
    if (route === '/auth/login' && method === 'post') {
      item.event = [{ listen: 'test', script: { type: 'text/javascript', exec: ["if (pm.response.code === 200) pm.collectionVariables.set('token', pm.response.json().token);"] } }];
    }
    (folders[op.tags?.[0] || 'Other'] ||= []).push(item);
  }
}

const collection = {
  info: {
    name: 'Candidate Hiring Pipeline API',
    description: 'Run "POST /auth/login" first: its test script saves the JWT into {{token}}. Replace {{id}}, {{candidateId}} etc. with real ids.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] },
  variable: ['token', 'id', 'noteId', 'candidateId', 'interviewerId', 'interviewId'].map((key) => ({ key, value: '' })).concat([{ key: 'baseUrl', value: 'http://localhost:5000/api' }]),
  item: Object.entries(folders).map(([name, item]) => ({ name, item })),
};

fs.mkdirSync(new URL('../../docs', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../../docs/postman_collection.json', import.meta.url), JSON.stringify(collection, null, 2));
console.log(`Wrote docs/postman_collection.json (${Object.values(folders).flat().length} requests)`);
