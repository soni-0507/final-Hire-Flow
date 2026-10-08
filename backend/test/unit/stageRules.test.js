import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTransition, allowedNextStages } from '../../src/services/stageRules.js';

test('moves forward exactly one step', () => {
  assert.equal(validateTransition('Applied', 'Screening').ok, true);
  assert.equal(validateTransition('Screening', 'Technical Interview').ok, true);
  assert.equal(validateTransition('Technical Interview', 'HR Interview').ok, true);
  assert.equal(validateTransition('HR Interview', 'Offered').ok, true);
  assert.equal(validateTransition('Offered', 'Hired').ok, true);
});

test('cannot skip stages', () => {
  const r = validateTransition('Applied', 'Technical Interview');
  assert.equal(r.ok, false);
  assert.match(r.message, /skip/i);
  assert.equal(validateTransition('Screening', 'Hired').ok, false);
  assert.equal(validateTransition('Applied', 'Offered').ok, false);
});

test('cannot move backwards', () => {
  const r = validateTransition('HR Interview', 'Screening');
  assert.equal(r.ok, false);
  assert.match(r.message, /backwards/i);
});

test('Rejected is allowed from any active stage', () => {
  for (const s of ['Applied', 'Screening', 'Technical Interview', 'HR Interview', 'Offered']) {
    assert.equal(validateTransition(s, 'Rejected').ok, true, s);
  }
});

test('Hired and Rejected are locked', () => {
  assert.equal(validateTransition('Hired', 'Offered').ok, false);
  assert.equal(validateTransition('Hired', 'Rejected').ok, false);
  assert.equal(validateTransition('Rejected', 'Screening').ok, false);
});

test('same stage is a no-op', () => {
  assert.equal(validateTransition('Screening', 'Screening').noop, true);
});

test('allowedNextStages offers only the next step and Rejected', () => {
  assert.deepEqual(allowedNextStages('Applied'), ['Screening', 'Rejected']);
  assert.deepEqual(allowedNextStages('Offered'), ['Hired', 'Rejected']);
  assert.deepEqual(allowedNextStages('Hired'), []);
  assert.deepEqual(allowedNextStages('Rejected'), []);
});
