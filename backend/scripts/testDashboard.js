require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function runDashboardTests() {
  console.log('--- Dashboard Analytics & History Timeline verification ---');

  // 1. Setup: Admin Login
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@maintainiq.com';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPassword123!';

  console.log('1. Logging in as admin...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) { console.error('❌ Admin login failed:', loginData); process.exit(1); }
  const adminToken = loginData.data.token;
  console.log('1. ✅ Admin logged in.');

  // 2. Fetch stats API
  console.log('2. Querying dashboard statistics...');
  const statsRes = await fetch(`${API_URL}/dashboard/stats`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const statsData = await statsRes.json();
  if (!statsRes.ok) {
    console.error('❌ Stats endpoint failed:', statsData);
    process.exit(1);
  }

  const { totalAssets, openIssues, criticalIssues, resolvedThisWeek, avgResolutionTime } = statsData.data;

  // Assert keys exist
  if (
    totalAssets === undefined ||
    openIssues === undefined ||
    criticalIssues === undefined ||
    resolvedThisWeek === undefined ||
    avgResolutionTime === undefined
  ) {
    console.error('❌ Stats response is missing required telemetry fields:', statsData.data);
    process.exit(1);
  }
  console.log(`2. ✅ Stats retrieved successfully.
     Total Assets: ${totalAssets}
     Open Issues: ${openIssues}
     Critical Issues: ${criticalIssues}
     Resolved This Week: ${resolvedThisWeek}
     Average Resolution Speed: ${avgResolutionTime} hours`);

  // 3. Test: Fetch asset list to get a valid asset ID for history testing
  console.log('3. Fetching asset list to query service history...');
  const assetsRes = await fetch(`${API_URL}/assets?limit=1`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const assetsData = await assetsRes.json();
  if (!assetsRes.ok || !assetsData.data.assets || assetsData.data.assets.length === 0) {
    console.log('⚠️ No assets exist in the database. Creating one to test history feed...');
    const createRes = await fetch(`${API_URL}/assets`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hydro-Pressure Pump',
        category: 'Plumbing',
        location: 'Sector 4',
        condition: 'Good'
      })
    });
    const createData = await createRes.json();
    if (!createRes.ok) { console.error('❌ Failed to create temporary asset:', createData); process.exit(1); }
    assetsData.data.assets = [createData.data];
  }

  const targetAsset = assetsData.data.assets[0];
  const targetAssetId = targetAsset._id;

  console.log(`4. Querying history timeline for asset ${targetAsset.assetCode}...`);
  const historyRes = await fetch(`${API_URL}/assets/${targetAssetId}/history`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const historyData = await historyRes.json();
  if (!historyRes.ok) {
    console.error('❌ History endpoint query failed:', historyData);
    process.exit(1);
  }

  console.log(`4. ✅ History retrieved with ${historyData.data.length} records.`);
  if (historyData.data.length > 0) {
    const record = historyData.data[0];
    console.log(`   Sample timeline node:
     Action: "${record.action}"
     Actor ID: ${record.actor}
     Actor Resolved Name: "${record.actorName}"
     Timestamp: ${record.timestamp}`);
    
    if (record.actorName === undefined) {
      console.error('❌ Test failed: actor resolved name is missing in history records.');
      process.exit(1);
    }
  }

  console.log('\n--- All Dashboard Statistics & History Feed Tests Passed! ---');
  process.exit(0);
}

runDashboardTests().catch(err => {
  console.error('Dashboard tests execution failed:', err);
  process.exit(1);
});
