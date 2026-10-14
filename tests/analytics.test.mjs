import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeAnalytics, addDays } from '../lib/analytics.ts';

const meta = {
  days: 90,
  startDate: '2026-07-16',
  endDate: '2026-10-13',
  reportingCutoff: '2026-10-13T14:00',
  graceMinutes: 120,
  timezone: 'Asia/Kolkata',
  patients: 5,
  seed: 1,
  synthetic: true,
  generator: 'test',
};

const patient = (patientId, caregiverSupport) => ({
  patientId,
  ageBand: '70-79',
  chronicConditionCount: 2,
  dailyMedCount: 2,
  caregiverSupport,
  reminderEnabled: true,
  preferredLanguage: 'English',
  engagementLevel: 'medium',
});

// sent: 'ack' | 'noack' | undefined (= not sent)
const dose = (patientId, date, time, status, sent) => ({
  patientId,
  medicationId: `${patientId}-M1`,
  date,
  time,
  status,
  reminderSent: sent !== undefined,
  reminderAcknowledged: sent === 'ack',
  takenAt: status === 'taken' ? `${date} ${time}` : null,
  delayMinutes: status === 'taken' ? 0 : null,
});

const act = (patientId, date, time = '09:00', type = 'app_open') => ({ patientId, date, time, type });

const patients = [patient('P1', 'family'), patient('P2', 'none'), patient('P3', 'none'), patient('P4', 'family'), patient('P5', 'none')];

const doses = [
  // reporting date 2026-10-13, cutoff 14:00
  dose('P1', '2026-10-13', '08:00', 'taken', 'ack'),
  dose('P1', '2026-10-13', '14:00', 'taken', 'ack'), // exactly at the cutoff: still due
  dose('P2', '2026-10-13', '08:00', 'taken', 'ack'),
  dose('P2', '2026-10-13', '12:00', 'missed', 'noack'),
  dose('P3', '2026-10-13', '13:30', 'pending', 'noack'), // due, but still inside the grace period
  dose('P3', '2026-10-13', '20:00', 'pending'), // not due yet
  dose('P4', '2026-10-13', '20:00', 'pending'), // P4 has nothing due by the cutoff
  // the day before
  dose('P1', '2026-10-12', '08:00', 'taken'),
  dose('P2', '2026-10-12', '08:00', 'missed'),
  dose('P3', '2026-10-12', '08:00', 'taken'),
];

const activity = [
  act('P1', '2026-10-13', '08:00'),
  act('P1', '2026-10-13', '12:00', 'dashboard_view'),
  act('P1', '2026-10-13', '13:00', 'reminder_response'), // three rows, one patient
  act('P2', '2026-10-13'),
  act('P1', '2026-10-12'),
  act('P3', '2026-10-12'),
  act('P4', '2026-10-07'), // first day of the trailing 7-day window (inclusive)
  act('P5', '2026-10-06'), // one day too early
];

const summary = computeAnalytics({ patients, doses, activity, meta });

describe('computeAnalytics', () => {
  test('header fields come from the metadata', () => {
    assert.equal(summary.reportingDate, '2026-10-13');
    assert.equal(summary.cutoff, '14:00');
    assert.equal(summary.timezone, 'Asia/Kolkata');
    assert.equal(summary.graceMinutes, 120);
    assert.equal(summary.startDate, '2026-07-16');
  });

  test('patient counts and dose counts are separate numbers', () => {
    assert.equal(summary.enrolledPatients, 5);
    assert.equal(summary.today.scheduled, 7);
    assert.notEqual(summary.enrolledPatients, summary.today.scheduled);
  });

  test('today: dueByCutoff is the time-limited subset of scheduled (cutoff inclusive)', () => {
    assert.equal(summary.today.scheduled, 7);
    assert.equal(summary.today.dueByCutoff, 5);
  });

  test('pending doses are never counted as missed', () => {
    assert.deepEqual(
      { t: summary.today.taken, m: summary.today.missed, p: summary.today.pending },
      { t: 3, m: 1, p: 3 },
    );
    assert.equal(summary.today.taken + summary.today.missed + summary.today.pending, summary.today.scheduled);
  });

  test('overall adherence excludes pending: taken / (taken + missed)', () => {
    assert.equal(summary.overall.taken, 5);
    assert.equal(summary.overall.missed, 2);
    assert.equal(summary.overall.pending, 3);
    assert.equal(summary.overall.known, 7);
    assert.ok(Math.abs(summary.overall.adherenceRate - (5 / 7) * 100) < 1e-9);
  });

  test('overall adherence is null when nothing has a known outcome', () => {
    const only = computeAnalytics({ patients, doses: [dose('P1', '2026-10-13', '20:00', 'pending')], activity: [], meta });
    assert.equal(only.overall.adherenceRate, null);
    assert.equal(only.daily.at(-1).adherenceRate, null);
  });

  test('fully adherent: needs a dose due, and every due dose taken', () => {
    // P1 all due taken; P2 has a missed dose; P3 has a pending due dose; P4/P5 have nothing due.
    assert.deepEqual(summary.fullyAdherentToday, { patients: 1, eligiblePatients: 3 });
  });

  test('active patients are distinct patients, not activity rows', () => {
    assert.equal(summary.activePatients.today, 2); // P1 (3 rows) + P2
    assert.equal(summary.activePatients.yesterday, 2); // P1 + P3
  });

  test('last 7 days is the trailing window ending on the reporting date, inclusive of both ends', () => {
    // P1, P2, P3 plus P4 on 2026-10-07 (day 7); P5 on 2026-10-06 is outside.
    assert.equal(summary.activePatients.last7Days, 4);
  });

  test('daily covers the last 30 days ending on the reporting date', () => {
    assert.equal(summary.daily.length, 30);
    assert.equal(summary.daily[0].date, '2026-09-14');
    assert.equal(summary.daily.at(-1).date, '2026-10-13');
    const today = summary.daily.at(-1);
    assert.deepEqual({ t: today.taken, m: today.missed, p: today.pending, a: today.activePatients }, { t: 3, m: 1, p: 3, a: 2 });
    assert.equal(today.adherenceRate, 75);
    const yesterday = summary.daily.at(-2);
    assert.ok(Math.abs(yesterday.adherenceRate - (2 / 3) * 100) < 1e-9);
    assert.equal(summary.daily[5].adherenceRate, null); // a day with no doses
  });

  test('patient adherence histogram: ten bins, patients without known outcomes excluded', () => {
    assert.equal(summary.patientAdherence.length, 10);
    assert.deepEqual(summary.patientAdherence[0], { label: '0–10', from: 0, to: 10, patients: 0 });
    assert.equal(summary.patientAdherence[9].to, 100);
    const counts = summary.patientAdherence.map((b) => b.patients);
    // P1 100%, P3 100% -> bin 9; P2 1 of 3 -> bin 3; P4 only pending and P5 no doses are excluded.
    assert.deepEqual(counts, [0, 0, 0, 1, 0, 0, 0, 0, 0, 2]);
  });

  test('histogram bin edges are exact: 30% is in [30,40), 0% in [0,10), 100% in the last bin', () => {
    const many = (id, taken, missed) => [
      ...Array.from({ length: taken }, () => dose(id, '2026-10-01', '08:00', 'taken')),
      ...Array.from({ length: missed }, () => dose(id, '2026-10-01', '09:00', 'missed')),
    ];
    const edge = computeAnalytics({
      patients: patients.slice(0, 5),
      doses: [...many('P1', 3, 7), ...many('P2', 0, 4), ...many('P3', 4, 0), ...many('P4', 1, 1), ...many('P5', 29, 71)],
      activity: [],
      meta,
    });
    const counts = edge.patientAdherence.map((b) => b.patients);
    assert.deepEqual(counts, [1, 0, 1, 1, 0, 1, 0, 0, 0, 1]); // 0%, 29%, 30%, 50%, 100%
  });

  test('reminder x caregiver support groups resolved doses only', () => {
    assert.equal(summary.byReminderAndSupport.length, 6);
    const g = (reminder, support) => summary.byReminderAndSupport.find((x) => x.reminder === reminder && x.support === support);
    assert.deepEqual(g('acknowledged', 'family'), { reminder: 'acknowledged', support: 'family', taken: 2, known: 2, adherenceRate: 100 });
    assert.deepEqual(g('acknowledged', 'none'), { reminder: 'acknowledged', support: 'none', taken: 1, known: 1, adherenceRate: 100 });
    assert.deepEqual(g('not_acknowledged', 'family'), { reminder: 'not_acknowledged', support: 'family', taken: 0, known: 0, adherenceRate: null });
    assert.deepEqual(g('not_acknowledged', 'none'), { reminder: 'not_acknowledged', support: 'none', taken: 0, known: 1, adherenceRate: 0 });
    assert.deepEqual(g('not_sent', 'family'), { reminder: 'not_sent', support: 'family', taken: 1, known: 1, adherenceRate: 100 });
    assert.deepEqual(g('not_sent', 'none'), { reminder: 'not_sent', support: 'none', taken: 1, known: 2, adherenceRate: 50 });
    // pending doses (P3 13:30, P3 20:00, P4 20:00) are not in any group
    assert.equal(summary.byReminderAndSupport.reduce((n, x) => n + x.known, 0), summary.overall.known);
  });
});

describe('addDays', () => {
  test('crosses month and year boundaries without timezone drift', () => {
    assert.equal(addDays('2026-10-13', -29), '2026-09-14');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-10-13', 0), '2026-10-13');
  });
});
