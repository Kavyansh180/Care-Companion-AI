import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeDoses,
  adherenceRate,
  missedRate,
  isFullyAdherent,
} from '../lib/adherence.ts';
import { formatTime12h } from '../lib/format.ts';
import { localDateString, localTimeString } from '../lib/dates.ts';

const dose = (status) => ({ status });

describe('adherence metrics', () => {
  test('summarizeDoses counts each status', () => {
    const s = summarizeDoses([dose('taken'), dose('taken'), dose('missed'), dose('pending')]);
    assert.deepEqual(s, { total: 4, taken: 2, missed: 1, pending: 1, known: 3 });
  });

  test('adherenceRate excludes pending doses', () => {
    const s = summarizeDoses([dose('taken'), dose('missed'), dose('pending')]);
    assert.equal(adherenceRate(s), 50);
  });

  test('adherenceRate and missedRate are null when only pending', () => {
    const s = summarizeDoses([dose('pending'), dose('pending')]);
    assert.equal(adherenceRate(s), null);
    assert.equal(missedRate(s), null);
    assert.equal(adherenceRate(summarizeDoses([])), null);
  });

  test('missedRate = missed / (taken + missed)', () => {
    const s = summarizeDoses([dose('taken'), dose('taken'), dose('taken'), dose('missed'), dose('pending')]);
    assert.equal(missedRate(s), 25);
    assert.equal(adherenceRate(s), 75);
  });

  test('isFullyAdherent', () => {
    assert.equal(isFullyAdherent([]), null);
    assert.equal(isFullyAdherent([dose('taken'), dose('pending')]), false);
    assert.equal(isFullyAdherent([dose('taken'), dose('missed')]), false);
    assert.equal(isFullyAdherent([dose('taken'), dose('taken')]), true);
  });
});

describe('formatTime12h', () => {
  test('converts 24h times', () => {
    assert.equal(formatTime12h('08:00'), '8:00 AM');
    assert.equal(formatTime12h('13:05'), '1:05 PM');
    assert.equal(formatTime12h('00:00'), '12:00 AM');
    assert.equal(formatTime12h('12:30'), '12:30 PM');
    assert.equal(formatTime12h('23:59'), '11:59 PM');
  });

  test('accepts HH:MM:SS, empty and unparseable input', () => {
    assert.equal(formatTime12h('08:15:30'), '8:15 AM');
    assert.equal(formatTime12h(''), '');
    assert.equal(formatTime12h('soon'), 'soon');
  });
});

describe('local date helpers', () => {
  test('use local time, not UTC', () => {
    const d = new Date(2026, 0, 5, 1, 30);
    assert.equal(localDateString(d), '2026-01-05');
    assert.equal(localTimeString(d), '01:30');
  });
});
