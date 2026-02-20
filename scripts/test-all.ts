import { execSync } from 'node:child_process';
import path from 'node:path';

const scripts = [
  { name: 'test-read-markets', file: 'test-read-markets.ts' },
  { name: 'test-build-txs', file: 'test-build-txs.ts' },
  { name: 'test-buy-flow', file: 'test-buy-flow.ts' },
];

const results: { name: string; passed: boolean; error?: string }[] = [];

for (const script of scripts) {
  const scriptPath = path.resolve(import.meta.dirname, script.file);
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Running: ${script.name}`);
  console.log('═'.repeat(60));

  try {
    execSync(`npx tsx ${scriptPath}`, {
      stdio: 'inherit',
      cwd: path.resolve(import.meta.dirname, '..'),
      timeout: 120_000,
    });
    results.push({ name: script.name, passed: true });
  } catch (err: any) {
    results.push({ name: script.name, passed: false, error: err.message });
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(60)}`);
console.log('SUMMARY');
console.log('═'.repeat(60));

let allPassed = true;
for (const r of results) {
  const icon = r.passed ? '✓' : '✗';
  console.log(`  ${icon} ${r.name}`);
  if (!r.passed) allPassed = false;
}

console.log('');
if (allPassed) {
  console.log('All integration tests passed!');
} else {
  console.log('Some tests failed.');
  process.exit(1);
}
