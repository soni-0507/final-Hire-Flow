import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell } from '../../src/utils/csv.js';

test('plain values are untouched', () => {
  assert.equal(csvCell('Asha'), 'Asha');
  assert.equal(csvCell(4), '4');
  assert.equal(csvCell(null), '');
});

test('commas, quotes and newlines are quoted and escaped', () => {
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('line1\nline2'), '"line1\nline2"');
});

test('spreadsheet formulas are neutralised', () => {
  assert.equal(csvCell('=SUM(A1:A2)'), "'=SUM(A1:A2)");
  assert.equal(csvCell('+1234'), "'+1234");
  assert.equal(csvCell('@cmd'), "'@cmd");
});

test('real negative numbers are not mangled', () => {
  assert.equal(csvCell(-3), '-3');
});
