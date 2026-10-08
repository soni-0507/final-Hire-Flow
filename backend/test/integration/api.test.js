// Integration tests: spin up an in-memory MongoDB and exercise the real Express app.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'os';
import path from 'path';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.RECRUITER_INVITE_CODE = 'TEST-CODE';
process.env.SHOW_RESET_LINK = 'true';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), 'hp-test-uploads');

let mongod;
let app;
const api = () => request(app);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

before(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  await mongoose.connect(mongod.getUri());
  app = (await import('../../src/app.js')).default; // imported after env is set
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const register = (b) => api().post('/api/auth/signup').send(b);
const loginAs = async (email, password = 'Password123') => (await api().post('/api/auth/login').send({ email, password })).body.token;

test('signup creates an unverified account and requires mailbox verification', async () => {
  const res = await register({ name: 'Ravi Recruiter', email: 'ravi@test.com', password: 'Password123', role: 'recruiter', inviteCode: 'TEST-CODE' });
  assert.equal(res.status, 201);
  assert.equal(res.body.token, undefined);
  assert.equal(res.body.requiresVerification, true);

  const blocked = await api().post('/api/auth/login').send({ email: 'ravi@test.com', password: 'Password123' });
  assert.equal(blocked.status, 403);

  const verified = await api().post('/api/auth/verify-email').send({ email: 'ravi@test.com', code: '123456' });
  assert.equal(verified.status, 200);

  const ok = await api().post('/api/auth/login').send({ email: 'ravi@test.com', password: 'Password123' });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
});

test('registered verified email cannot sign up again', async () => {
  const res = await register({ name: 'Ravi Again', email: 'ravi@test.com', password: 'Password123', role: 'recruiter', inviteCode: 'TEST-CODE' });
  assert.equal(res.status, 409);
  assert.match(res.body.message, /already registered/i);
});

test('recruiter signup needs the invite code', async () => {
  const res = await register({ name: 'Sneaky', email: 'sneaky@test.com', password: 'Password123', role: 'recruiter', inviteCode: 'wrong' });
  assert.equal(res.status, 403);
});

test('weak passwords are rejected', async () => {
  const res = await register({ name: 'Weak Pw', email: 'weak@test.com', password: 'short', role: 'interviewer' });
  assert.equal(res.status, 422);
});

test('login: unknown email and wrong password give the same 401, correct -> token', async () => {
  const unknown = await api().post('/api/auth/login').send({ email: 'nobody@test.com', password: 'Password123' });
  const wrong = await api().post('/api/auth/login').send({ email: 'ravi@test.com', password: 'Wrongpass1' });
  assert.equal(unknown.status, 401);
  assert.equal(unknown.body.message, wrong.body.message); // no account enumeration
  assert.equal((await api().post('/api/auth/login').send({ email: 'ravi@test.com', password: 'Wrongpass1' })).status, 401);
  const ok = await api().post('/api/auth/login').send({ email: 'ravi@test.com', password: 'Password123' });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
});

test('protected routes require a token', async () => {
  assert.equal((await api().get('/api/candidates')).status, 401);
  assert.equal((await api().get('/api/candidates').set(auth('garbage'))).status, 401);
});

test('password reset works and the old password stops working', async () => {
  process.env.SHOW_RESET_LINK = 'true';
  const res = await api().post('/api/auth/forgot-password').send({ email: 'ravi@test.com' });
  assert.equal(res.status, 200);
  const link = res.body.devResetLink;
  assert.ok(link, 'reset link is returned in demo mode');
  const token = new URL(link).searchParams.get('token');
  assert.equal((await api().post('/api/auth/reset-password').send({ token, password: 'NewPassword9' })).status, 200);
  assert.equal((await api().post('/api/auth/reset-password').send({ token, password: 'AnotherPass9' })).status, 400); // single use
  assert.equal((await api().post('/api/auth/login').send({ email: 'ravi@test.com', password: 'Password123' })).status, 401);
  assert.ok(await loginAs('ravi@test.com', 'NewPassword9'));
});

test('verification code must be exactly 6 digits, and works with a valid code', async () => {
  await register({ name: 'Code Check', email: 'code@test.com', password: 'Password123', role: 'interviewer' });
  assert.equal((await api().post('/api/auth/verify-email').send({ email: 'code@test.com', code: '12ab56' })).status, 422);
  assert.equal((await api().post('/api/auth/verify-email').send({ email: 'code@test.com', code: '123456' })).status, 200);
});

test('signing up over an unverified account replaces the password (no pre-hijack)', async () => {
  await register({ name: 'Victim One', email: 'victim@test.com', password: 'AttackerPass1', role: 'interviewer' });
  const again = await register({ name: 'Victim One', email: 'victim@test.com', password: 'VictimPass1', role: 'interviewer' });
  assert.equal(again.status, 201);
  assert.equal((await api().post('/api/auth/verify-email').send({ email: 'victim@test.com', code: '123456' })).status, 200);
  assert.equal((await api().post('/api/auth/login').send({ email: 'victim@test.com', password: 'AttackerPass1' })).status, 401);
  assert.equal((await api().post('/api/auth/login').send({ email: 'victim@test.com', password: 'VictimPass1' })).status, 200);
});

test('verification code is burned after too many wrong attempts', async () => {
  await register({ name: 'Brute Target', email: 'brute@test.com', password: 'Password123', role: 'interviewer' });
  for (let i = 0; i < 4; i += 1) {
    assert.equal((await api().post('/api/auth/verify-email').send({ email: 'brute@test.com', code: '000000' })).status, 400);
  }
  assert.equal((await api().post('/api/auth/verify-email').send({ email: 'brute@test.com', code: '000000' })).status, 429);
  assert.equal((await api().post('/api/auth/verify-email').send({ email: 'brute@test.com', code: '123456' })).status, 400); // code is gone
  await api().post('/api/auth/resend-verification').send({ email: 'brute@test.com' });
  assert.equal((await api().post('/api/auth/verify-email').send({ email: 'brute@test.com', code: '123456' })).status, 200);
});

test('resend-verification does not reveal whether an email is registered', async () => {
  const res = await api().post('/api/auth/resend-verification').send({ email: 'ghost@test.com' });
  assert.equal(res.status, 200);
});

test('old sessions stop working after a password reset', async () => {
  const oldToken = await loginAs('victim@test.com', 'VictimPass1');
  assert.equal((await api().get('/api/auth/me').set(auth(oldToken))).status, 200);
  await new Promise((r) => setTimeout(r, 1100)); // JWT iat has 1-second resolution
  const link = (await api().post('/api/auth/forgot-password').send({ email: 'victim@test.com' })).body.devResetLink;
  const token = new URL(link).searchParams.get('token');
  assert.equal((await api().post('/api/auth/reset-password').send({ token, password: 'Fresh12345' })).status, 200);
  assert.equal((await api().get('/api/auth/me').set(auth(oldToken))).status, 401);
  assert.ok(await loginAs('victim@test.com', 'Fresh12345'));
});

test('interviewers cannot create candidates; recruiters can', async () => {
  await register({ name: 'Ina Interviewer', email: 'ina@test.com', password: 'Password123', role: 'interviewer' });
  assert.equal((await api().post('/api/auth/verify-email').send({ email: 'ina@test.com', code: '123456' })).status, 200);
  const interviewer = await loginAs('ina@test.com');
  const recruiter = await loginAs('ravi@test.com', 'NewPassword9');
  const body = { name: 'Cara Candidate', email: 'cara@test.com', position: 'Engineer' };
  assert.equal((await api().post('/api/candidates').set(auth(interviewer)).send(body)).status, 403);
  assert.equal((await api().post('/api/candidates').set(auth(recruiter)).send(body)).status, 201);
});

test('stage rules: one step at a time, reason needed to reject, final stages are locked', async () => {
  const t = await loginAs('ravi@test.com', 'NewPassword9');
  const created = await api().post('/api/candidates').set(auth(t)).send({ name: 'Stan Stage', email: 'stan@test.com', position: 'Engineer' });
  const id = created.body.data._id;
  const move = (body) => api().patch(`/api/candidates/${id}/stage`).set(auth(t)).send(body);

  assert.equal((await move({ stage: 'Technical Interview' })).status, 422); // skip
  assert.equal((await move({ stage: 'Screening' })).status, 200);            // no interview/feedback needed
  assert.equal((await move({ stage: 'Applied' })).status, 422);              // backwards
  assert.equal((await move({ stage: 'Rejected' })).status, 422);             // reason missing
  assert.equal((await move({ stage: 'Rejected', rejectionReason: 'skills_gap' })).status, 200);
  assert.equal((await move({ stage: 'Technical Interview' })).status, 422); // locked
});

test('candidates cannot be edited into another stage through the update endpoint', async () => {
  const t = await loginAs('ravi@test.com', 'NewPassword9');
  const c = (await api().post('/api/candidates').set(auth(t)).send({ name: 'Sly Edit', email: 'sly@test.com', position: 'Engineer' })).body.data;
  const res = await api().put(`/api/candidates/${c._id}`).set(auth(t)).send({ stage: 'Hired', name: 'Sly Edit' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.stage, 'Applied');
});

test('interviewers only see candidates assigned to them, and never see scores', async () => {
  const recruiter = await loginAs('ravi@test.com', 'NewPassword9');
  const interviewer = await loginAs('ina@test.com');
  const me = (await api().get('/api/auth/me').set(auth(interviewer))).body.user;
  const list = (await api().get('/api/candidates').set(auth(recruiter)).query({ limit: 50 })).body.data;
  const assigned = list.find((c) => c.email === 'cara@test.com');

  assert.equal((await api().get('/api/candidates').set(auth(interviewer))).body.data.length, 0);
  const iv = await api().post('/api/interviews').set(auth(recruiter)).send({
    candidate: assigned._id, interviewer: me._id, type: 'technical',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
  });
  assert.equal(iv.status, 201);

  const seen = (await api().get('/api/candidates').set(auth(interviewer))).body.data;
  assert.equal(seen.length, 1);
  assert.equal(seen[0].email, 'cara@test.com');
  assert.equal(seen[0].ratingAvg, undefined);
  const other = list.find((c) => c.email === 'stan@test.com');
  assert.equal((await api().get(`/api/candidates/${other._id}`).set(auth(interviewer))).status, 403);
});

test('feedback is optional, and updates the candidate score when given', async () => {
  const recruiter = await loginAs('ravi@test.com', 'NewPassword9');
  const interviewer = await loginAs('ina@test.com');
  const cara = (await api().get('/api/candidates').set(auth(recruiter)).query({ q: 'cara' })).body.data[0];
  // she can advance with no feedback at all
  assert.equal((await api().patch(`/api/candidates/${cara._id}/stage`).set(auth(recruiter)).send({ stage: 'Screening' })).status, 200);

  const iv = (await api().get('/api/interviews').set(auth(interviewer))).body.data[0];
  const fb = await api().post('/api/feedback').set(auth(interviewer)).send({ interview: iv._id, rating: 4, recommendation: 'hire' });
  assert.equal(fb.status, 201);
  assert.equal((await api().post('/api/feedback').set(auth(interviewer)).send({ interview: iv._id, rating: 3, recommendation: 'hire' })).status, 409);

  const after = (await api().get(`/api/candidates/${cara._id}`).set(auth(recruiter))).body.data;
  assert.equal(after.ratingAvg, 4);
  assert.equal(after.hireVotes, 1);
});

test('CSV export is recruiter-only', async () => {
  const recruiter = await loginAs('ravi@test.com', 'NewPassword9');
  const interviewer = await loginAs('ina@test.com');
  assert.equal((await api().get('/api/candidates/export').set(auth(interviewer))).status, 403);
  const res = await api().get('/api/candidates/export').set(auth(recruiter));
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/csv/);
  assert.match(res.text, /Cara Candidate/);
});
