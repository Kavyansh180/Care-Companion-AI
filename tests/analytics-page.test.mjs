import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('/analytics route files', () => {
  test('loading.tsx and error.tsx exist', () => {
    assert.ok(existsSync(new URL('../app/analytics/loading.tsx', import.meta.url)));
    assert.ok(existsSync(new URL('../app/analytics/error.tsx', import.meta.url)));
    assert.match(read('app/analytics/loading.tsx'), /Loading/);
  });

  test('error.tsx is a client component with a retry button', () => {
    const src = read('app/analytics/error.tsx');
    assert.match(src, /^["']use client["']/);
    assert.match(src, /Try again/);
  });

  test('the page is rendered per request, not prerendered', () => {
    assert.match(read('app/analytics/page.tsx'), /export const dynamic = "force-dynamic"/);
    assert.match(read('app/api/ml/cohort-risk/route.ts'), /export const dynamic = "force-dynamic"/);
    assert.match(read('app/api/ml/model-metrics/route.ts'), /export const dynamic = "force-dynamic"/);
  });
});

describe('/analytics page source', () => {
  const page = read('app/analytics/page.tsx');

  test('carries the exact demo label', () => {
    assert.ok(page.includes('Demo analytics — simulated patient and activity data.'));
  });

  test('does not hardcode KPI numbers', () => {
    assert.doesNotMatch(page, /\b\d[\d,]* (simulated )?patients\b/);
    assert.doesNotMatch(page, /\b\d+(\.\d+)?%\s+(adherence|of doses)/);
  });

  test('shows an unavailable state instead of fabricating predictions', () => {
    assert.match(page, /Model service unavailable/);
    assert.match(page, /uvicorn api:app --port 8000/);
  });
});
