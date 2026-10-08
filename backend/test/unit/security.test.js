import { test } from 'node:test';
import assert from 'node:assert/strict';
import { securityProblems } from '../../src/config/security.js';

const strong = 'a'.repeat(8) + 'b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6';

test('development and test environments are never blocked', () => {
  assert.deepEqual(securityProblems({ NODE_ENV: 'development' }), []);
  assert.deepEqual(securityProblems({ NODE_ENV: 'test', JWT_SECRET: 'x' }), []);
});

test('production needs a long random secret', () => {
  const base = { NODE_ENV: 'production', RECRUITER_INVITE_CODE: 'my-private-code-7' };
  assert.equal(securityProblems({ ...base }).length, 1);                                   // missing
  assert.equal(securityProblems({ ...base, JWT_SECRET: 'short' }).length, 1);              // too short
  assert.equal(securityProblems({ ...base, JWT_SECRET: 'change-me-in-a-real-deployment-xxxxxxxx' }).length, 1); // known default
  assert.deepEqual(securityProblems({ ...base, JWT_SECRET: strong }), []);
});

test('production rejects the documented invite code and placeholders', () => {
  const base = { NODE_ENV: 'production', JWT_SECRET: strong };
  assert.equal(securityProblems({ ...base, RECRUITER_INVITE_CODE: 'JOIN-RECRUITERS' }).length, 1);
  assert.equal(securityProblems({ ...base, RECRUITER_INVITE_CODE: 'replace-me' }).length, 1);
  assert.equal(securityProblems({ ...base }).length, 1);
  assert.deepEqual(securityProblems({ ...base, RECRUITER_INVITE_CODE: 'acme-hiring-2026' }), []);
});

test('production refuses to expose password-reset links', () => {
  const base = { NODE_ENV: 'production', JWT_SECRET: strong, RECRUITER_INVITE_CODE: 'acme-hiring-2026' };
  assert.equal(securityProblems({ ...base, SHOW_RESET_LINK: 'true' }).length, 1);
  assert.deepEqual(securityProblems({ ...base, SHOW_RESET_LINK: 'false' }), []);
});
