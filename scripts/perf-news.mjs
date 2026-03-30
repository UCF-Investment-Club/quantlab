#!/usr/bin/env node

import { performance } from "node:perf_hooks";

function parseNumber(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function percentile(sorted, p) {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index];
}

async function timeRequest(url, headers) {
  const start = performance.now();
  const response = await fetch(url, { headers, cache: "no-store" });
  const end = performance.now();
  return {
    status: response.status,
    durationMs: end - start,
  };
}

async function main() {
  const baseUrl = process.env.NEWS_PERF_BASE_URL ?? "http://localhost:3000";
  const endpoint =
    process.env.NEWS_PERF_ENDPOINT ?? "/api/v1/news?page=1&pageSize=12";
  const iterations = parseNumber(process.env.NEWS_PERF_ITERATIONS, 50);
  const concurrency = parseNumber(process.env.NEWS_PERF_CONCURRENCY, 5);
  const warmup = parseNumber(process.env.NEWS_PERF_WARMUP, 5);
  const cookie = process.env.NEWS_PERF_COOKIE;

  if (!cookie) {
    console.error("Missing NEWS_PERF_COOKIE environment variable.");
    console.error(
      "Set it to your authenticated session cookie header value, e.g. 'sb-...=...; sb-...-auth-token=...'.",
    );
    process.exit(1);
  }

  const url = `${baseUrl}${endpoint}`;
  const headers = {
    cookie,
  };

  console.log(`Warming up ${warmup} request(s)...`);
  for (let i = 0; i < warmup; i += 1) {
    await timeRequest(url, headers);
  }

  console.log(
    `Running ${iterations} request(s) with concurrency=${concurrency}...`,
  );

  let scheduled = 0;
  const inFlight = new Set();
  const durations = [];
  const statuses = new Map();

  async function scheduleOne() {
    if (scheduled >= iterations) {
      return;
    }

    scheduled += 1;
    const promise = timeRequest(url, headers)
      .then((result) => {
        durations.push(result.durationMs);
        statuses.set(result.status, (statuses.get(result.status) ?? 0) + 1);
      })
      .finally(() => {
        inFlight.delete(promise);
      });

    inFlight.add(promise);
  }

  for (let i = 0; i < Math.min(concurrency, iterations); i += 1) {
    await scheduleOne();
  }

  while (inFlight.size > 0) {
    await Promise.race(inFlight);
    while (inFlight.size < concurrency && scheduled < iterations) {
      await scheduleOne();
    }
  }

  durations.sort((a, b) => a - b);

  const sum = durations.reduce((acc, value) => acc + value, 0);
  const avg = durations.length > 0 ? sum / durations.length : 0;
  const p50 = percentile(durations, 50);
  const p95 = percentile(durations, 95);
  const p99 = percentile(durations, 99);

  console.log("\nStatus counts:");
  for (const [status, count] of [...statuses.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    console.log(`  ${status}: ${count}`);
  }

  console.log("\nLatency summary (ms):");
  console.log(`  avg: ${avg.toFixed(2)}`);
  console.log(`  p50: ${p50.toFixed(2)}`);
  console.log(`  p95: ${p95.toFixed(2)}`);
  console.log(`  p99: ${p99.toFixed(2)}`);

  const non200 = [...statuses.entries()].reduce(
    (acc, [status, count]) => (status === 200 ? acc : acc + count),
    0,
  );
  if (non200 > 0) {
    console.error(`\nDetected ${non200} non-200 response(s).`);
    process.exit(1);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Perf run failed: ${message}`);
  process.exit(1);
});
