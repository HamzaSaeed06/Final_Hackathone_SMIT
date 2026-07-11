require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Asset Module Verification Tests ---');

  // 1. Get admin token
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@maintainiq.com';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPassword123!';
  let adminToken, assetId, assetCode, publicSlug;

  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) { console.error('❌ Login failed:', loginData); process.exit(1); }
  adminToken = loginData.data.token;
  console.log('1. ✅ Admin logged in');

  const authHeaders = { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

  // 2. Create asset
  const createRes = await fetch(`${API_URL}/assets`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: 'Test HVAC Unit', category: 'HVAC', location: 'Floor 2', condition: 'Good' })
  });
  const createData = await createRes.json();
  if (createRes.status !== 201 || !createData.data?.assetCode || !createData.data?.publicSlug) {
    console.error('❌ Asset creation failed:', createData); process.exit(1);
  }
  assetId = createData.data._id;
  assetCode = createData.data.assetCode;
  publicSlug = createData.data.publicSlug;
  console.log(`2. ✅ Asset created: ${assetCode}, slug: ${publicSlug}`);

  // 3. List assets with search
  const listRes = await fetch(`${API_URL}/assets?search=HVAC`, { headers: authHeaders });
  const listData = await listRes.json();
  if (!listRes.ok || !Array.isArray(listData.data.assets)) {
    console.error('❌ Asset list failed:', listData); process.exit(1);
  }
  console.log(`3. ✅ Asset list works, found ${listData.data.assets.length} result(s)`);

  // 4. Get by ID
  const getRes = await fetch(`${API_URL}/assets/${assetId}`, { headers: authHeaders });
  const getData = await getRes.json();
  if (!getRes.ok) { console.error('❌ Get by ID failed:', getData); process.exit(1); }
  console.log(`4. ✅ Get asset by ID OK: ${getData.data.name}`);

  // 5. Patch (edit name) — slug must remain unchanged
  const patchRes = await fetch(`${API_URL}/assets/${assetId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ name: 'Updated HVAC Unit', location: 'Floor 3' })
  });
  const patchData = await patchRes.json();
  if (!patchRes.ok || patchData.data?.publicSlug !== publicSlug) {
    console.error('❌ PATCH failed or slug changed:', patchData); process.exit(1);
  }
  console.log(`5. ✅ Asset updated, publicSlug unchanged: ${patchData.data.publicSlug}`);

  // 6. Block publicSlug change
  const blockRes = await fetch(`${API_URL}/assets/${assetId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ publicSlug: 'hack-slug' })
  });
  if (blockRes.status !== 400) {
    console.error('❌ publicSlug change should be blocked but was not. Status:', blockRes.status); process.exit(1);
  }
  console.log('6. ✅ publicSlug change correctly blocked with 400');

  // 7. QR endpoint
  const qrRes = await fetch(`${API_URL}/assets/${assetId}/qr`, { headers: authHeaders });
  const qrData = await qrRes.json();
  if (!qrRes.ok || !qrData.data?.publicUrl) {
    console.error('❌ QR endpoint failed:', qrData); process.exit(1);
  }
  console.log(`7. ✅ QR endpoint OK, publicUrl: ${qrData.data.publicUrl}`);

  // 8. History endpoint
  const histRes = await fetch(`${API_URL}/assets/${assetId}/history`, { headers: authHeaders });
  const histData = await histRes.json();
  if (!histRes.ok || !Array.isArray(histData.data)) {
    console.error('❌ History endpoint failed:', histData); process.exit(1);
  }
  console.log(`8. ✅ History endpoint OK, ${histData.data.length} record(s)`);

  // 9. Unauthenticated access blocked
  const unauthRes = await fetch(`${API_URL}/assets`, {});
  if (unauthRes.status !== 401) {
    console.error('❌ Unauthenticated access should return 401, got:', unauthRes.status); process.exit(1);
  }
  console.log('9. ✅ Unauthenticated request correctly returns 401');

  console.log('\n--- All Asset Verification Tests Passed! ---');
  process.exit(0);
}

runTests().catch(err => { console.error('Unhandled error:', err); process.exit(1); });
