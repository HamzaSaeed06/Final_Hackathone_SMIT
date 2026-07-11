require('dotenv').config();

const API_URL = process.env.VITE_API_URL || 'http://localhost:5000/api';

async function testRateLimiting() {
  console.log('--- Rate Limit Trigger Test ---\n');

  const endpoint = `${API_URL}/auth/login`;
  const body = JSON.stringify({ email: 'nobody@test.com', password: 'wrong' });
  const headers = { 'Content-Type': 'application/json' };

  let lastStatus = null;
  let hit429 = false;

  for (let i = 1; i <= 8; i++) {
    const res = await fetch(endpoint, { method: 'POST', headers, body });
    const data = await res.json();
    lastStatus = res.status;

    const rlRemaining = res.headers.get('ratelimit-remaining');
    const rlReset = res.headers.get('ratelimit-reset');

    console.log(`Request ${i}: HTTP ${res.status} | RateLimit-Remaining: ${rlRemaining ?? 'n/a'} | Reset: ${rlReset ?? 'n/a'}`);

    if (res.status === 429) {
      hit429 = true;
      console.log('\n✅ 429 triggered. Response body:', JSON.stringify(data, null, 2));
      // Verify shape: success=false, error.code=RATE_LIMIT_EXCEEDED
      if (data.success === false && data.error?.code === 'RATE_LIMIT_EXCEEDED') {
        console.log('✅ Response shape is correct (success: false, error.code: RATE_LIMIT_EXCEEDED)');
      } else {
        console.error('❌ Response shape incorrect:', data);
        process.exit(1);
      }
      break;
    }
  }

  if (!hit429) {
    console.error('\n❌ 429 was NOT triggered after 8 requests. Rate limiter may not be working.');
    process.exit(1);
  }

  console.log('\n--- Rate Limit Test Passed ---');
  process.exit(0);
}

testRateLimiting().catch(err => {
  console.error('Test run failed:', err.message);
  process.exit(1);
});
