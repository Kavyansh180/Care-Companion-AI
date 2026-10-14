import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getCohortRisk, getModelMetrics, getMlHealth } from '../lib/ml-client.ts';

const cohort = {
  model_version: 'test-1',
  reporting_cutoff: '2026-10-13T14:00',
  timezone: 'Asia/Kolkata',
  thresholds: { moderate: 0.3, high: 0.6 },
  count: 1,
  total: 250,
  predictions: [
    {
      patient_id: 'P001',
      probability: 0.7,
      risk_band: 'high',
      next_dose_at: '2026-10-13T20:00',
      adherence_7d: 0.5,
      missed_7d: 3,
      factors: [{ feature: 'missed_7d', label: 'Missed doses in 7 days', value: 3, typical_value: 1, effect: 0.1 }],
      recent_days: [{ date: '2026-10-13', taken: 1, missed: 1, pending: 0 }],
    },
  ],
};

const json = (body, status = 200) => async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('ml-client', () => {
  test('valid CohortRisk passes the guard', async () => {
    const result = await getCohortRisk(250, { fetchImpl: json(cohort) });
    assert.equal(result.ok, true);
    assert.equal(result.data.predictions[0].patient_id, 'P001');
  });

  test('requests the right URL with no-store caching', async () => {
    let seen;
    const fetchImpl = async (url, init) => {
      seen = { url: String(url), init };
      return new Response(JSON.stringify(cohort));
    };
    await getCohortRisk(25, { fetchImpl });
    assert.ok(seen.url.endsWith('/cohort-risk?limit=25'), seen.url);
    assert.equal(seen.init.cache, 'no-store');
    assert.ok(seen.init.signal instanceof AbortSignal);
  });

  test('honours ML_SERVICE_URL', async () => {
    const before = process.env.ML_SERVICE_URL;
    process.env.ML_SERVICE_URL = 'http://ml.example.test:9000/';
    try {
      let url = '';
      await getMlHealth({ fetchImpl: async (u) => ((url = String(u)), new Response('{}')) });
      assert.equal(url, 'http://ml.example.test:9000/health');
    } finally {
      if (before === undefined) delete process.env.ML_SERVICE_URL;
      else process.env.ML_SERVICE_URL = before;
    }
  });

  test('malformed JSON shape -> bad_response', async () => {
    const result = await getCohortRisk(250, { fetchImpl: json({ model_version: 'x', predictions: 'nope' }) });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'bad_response');
  });

  test('a prediction with probability outside 0..1 -> bad_response', async () => {
    const bad = { ...cohort, predictions: [{ ...cohort.predictions[0], probability: 1.5 }] };
    const result = await getCohortRisk(250, { fetchImpl: json(bad) });
    assert.equal(result.reason, 'bad_response');
  });

  test('a body that is not JSON -> bad_response', async () => {
    const result = await getModelMetrics({ fetchImpl: async () => new Response('<html>oops</html>') });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'bad_response');
  });

  test('HTTP 503 -> unavailable, with the status in the message', async () => {
    const result = await getModelMetrics({ fetchImpl: json({ detail: 'model not loaded' }, 503) });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'unavailable');
    assert.match(result.message, /503/);
  });

  test('thrown network error -> unavailable, without leaking the raw error', async () => {
    const result = await getCohortRisk(250, {
      fetchImpl: async () => {
        throw new TypeError('fetch failed: ECONNREFUSED 127.0.0.1:8000');
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'unavailable');
    assert.doesNotMatch(result.message, /ECONNREFUSED/);
  });

  test('a fetch that never resolves -> timeout', async () => {
    const started = Date.now();
    const result = await getCohortRisk(250, { timeoutMs: 50, fetchImpl: () => new Promise(() => {}) });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'timeout');
    assert.ok(Date.now() - started < 2000);
  });

  test('a fetch that rejects with AbortError after the deadline -> timeout', async () => {
    const fetchImpl = (_url, init) =>
      new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
    const result = await getMlHealth({ timeoutMs: 30, fetchImpl });
    assert.equal(result.reason, 'timeout');
  });
});
