/**
 * Direct API connectivity test — bypasses the SDK to hit each Rain API
 * endpoint raw with fetch. Useful for diagnosing Cloudflare / connectivity
 * issues vs actual API errors.
 */

const ENVS = {
  development: 'https://dev-api.rain.one',
  stage: 'https://stg-api.rain.one',
  production: 'https://prod-api.rain.one',
} as const;

type Env = keyof typeof ENVS;

// ── Helpers ────────────────────────────────────────────────────────────────

function isCloudflareChallenge(body: string): boolean {
  return body.includes('Just a moment') || body.includes('cf_chl') || body.includes('challenge-platform');
}

async function testEndpoint(label: string, url: string, init?: RequestInit) {
  console.log(`\n  ${label}`);
  console.log(`  ${init?.method ?? 'GET'} ${url}`);
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(15_000),
    });
    const contentType = res.headers.get('content-type') ?? '';
    const body = await res.text();

    if (isCloudflareChallenge(body)) {
      console.log(`  ⚠ ${res.status} — Cloudflare challenge (bot protection)`);
      return { status: res.status, ok: false, cloudflare: true };
    }

    let parsed: any;
    if (contentType.includes('application/json')) {
      try { parsed = JSON.parse(body); } catch { parsed = null; }
    }

    if (res.ok) {
      const preview = parsed
        ? JSON.stringify(parsed, null, 2).slice(0, 300)
        : body.slice(0, 300);
      console.log(`  ✓ ${res.status} OK (${contentType})`);
      console.log(`  Response preview:\n${indent(preview, 4)}`);
      return { status: res.status, ok: true, cloudflare: false, data: parsed ?? body };
    } else {
      console.log(`  ✗ ${res.status} ${res.statusText}`);
      console.log(`  Body: ${body.slice(0, 200)}`);
      return { status: res.status, ok: false, cloudflare: false };
    }
  } catch (err: any) {
    console.log(`  ✗ Network error: ${err.message}`);
    return { status: 0, ok: false, cloudflare: false, error: err.message };
  }
}

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text.split('\n').map((l) => pad + l).join('\n');
}

// ── Tests ──────────────────────────────────────────────────────────────────

async function testEnv(env: Env) {
  const base = ENVS[env];
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Environment: ${env} (${base})`);
  console.log('═'.repeat(60));

  // 1. List public markets
  const listResult = await testEndpoint(
    '1. List public markets',
    `${base}/pools/public-pools?limit=3`,
  );

  // 2. Get single market detail (only if list succeeded)
  if (listResult.ok && Array.isArray(listResult.data) && listResult.data.length > 0) {
    const firstId = listResult.data[0].id ?? listResult.data[0]._id;
    if (firstId) {
      await testEndpoint(
        `2. Get market detail (id: ${firstId})`,
        `${base}/pools/pool/${firstId}`,
      );
    } else {
      console.log('\n  2. Skipped — no id in first market');
    }
  } else {
    console.log('\n  2. Skipped — list did not return data');
    // Try with a placeholder anyway to see the error shape
    await testEndpoint(
      '2. Get market detail (placeholder id)',
      `${base}/pools/pool/000000000000000000000000`,
    );
  }

  return listResult;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Rain API Direct Connectivity Test');
  console.log(`Time: ${new Date().toISOString()}`);

  const results: Record<string, { ok: boolean; cloudflare: boolean }> = {};

  for (const env of Object.keys(ENVS) as Env[]) {
    const r = await testEnv(env);
    results[env] = { ok: r.ok, cloudflare: r.cloudflare };
  }

  // Summary
  console.log(`\n${'═'.repeat(60)}`);
  console.log('SUMMARY');
  console.log('═'.repeat(60));

  let anyOk = false;
  for (const [env, r] of Object.entries(results)) {
    const icon = r.ok ? '✓' : r.cloudflare ? '⚠' : '✗';
    const detail = r.ok ? 'reachable' : r.cloudflare ? 'blocked by Cloudflare' : 'error';
    console.log(`  ${icon} ${env}: ${detail}`);
    if (r.ok) anyOk = true;
  }

  if (!anyOk) {
    console.log('\nNo environments are reachable from this machine.');
    console.log('If all show "Cloudflare", the API has bot protection that blocks non-browser requests.');
    console.log('Ask the API team to whitelist server-side access or provide an API key.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
