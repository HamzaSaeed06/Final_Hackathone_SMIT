require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Public API & Issue Submission Verification Tests ---');

  // 1. Setup: Register an admin and create a new asset to get its publicSlug
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@maintainiq.com';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPassword123!';

  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) { console.error('❌ Admin login failed:', loginData); process.exit(1); }
  const adminToken = loginData.data.token;

  // Create active asset
  const createRes = await fetch(`${API_URL}/assets`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Public Test HVAC', category: 'HVAC', location: 'Floor 1', condition: 'Good' })
  });
  const createData = await createRes.json();
  if (!createRes.ok) { console.error('❌ Setup asset creation failed:', createData); process.exit(1); }
  const activeSlug = createData.data.publicSlug;
  const activeId = createData.data._id;
  console.log(`1. ✅ Setup completed. Created asset with slug: ${activeSlug}`);

  // Create retired asset
  const retiredCreateRes = await fetch(`${API_URL}/assets`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Retired Asset', category: 'Electrical', location: 'Basement', condition: 'Poor' })
  });
  const retiredCreateData = await retiredCreateRes.json();
  if (!retiredCreateRes.ok) { console.error('❌ Setup retired asset failed:', retiredCreateData); process.exit(1); }
  const retiredId = retiredCreateData.data._id;
  const retiredSlug = retiredCreateData.data.publicSlug;

  // Update status to Retired
  await fetch(`${API_URL}/assets/${retiredId}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Retired' })
  });
  console.log(`2. ✅ Setup completed. Created retired asset with slug: ${retiredSlug}`);

  // 3. GET public asset details — safe fields only
  const getPubRes = await fetch(`${API_URL}/public/assets/${activeSlug}`);
  const getPubData = await getPubRes.json();
  if (!getPubRes.ok) { console.error('❌ GET Public Asset failed:', getPubData); process.exit(1); }
  const safeAsset = getPubData.data;

  // Verify safe fields only
  const unsafeFields = ['createdBy', 'assignedTechnician', 'qrCodeUrl', '__v', 'id', '_id'];
  for (const field of unsafeFields) {
    if (safeAsset[field] !== undefined) {
      console.error(`❌ Unsafe field leaked in public API response: ${field}`);
      process.exit(1);
    }
  }
  console.log('3. ✅ GET Public Asset returns safe fields only (leaks blocked)');

  // 4. Invalid slug returns 404
  const badSlugRes = await fetch(`${API_URL}/public/assets/doesnotexist`);
  if (badSlugRes.status !== 404) {
    console.error('❌ Expected 404 for invalid slug, got status:', badSlugRes.status);
    process.exit(1);
  }
  console.log('4. ✅ Invalid slug correctly returns 404');

  // 5. Retired asset details loads
  const getRetiredRes = await fetch(`${API_URL}/public/assets/${retiredSlug}`);
  const getRetiredData = await getRetiredRes.json();
  if (!getRetiredRes.ok || getRetiredData.data.status !== 'Retired') {
    console.error('❌ Retired asset load failed:', getRetiredData);
    process.exit(1);
  }
  console.log('5. ✅ Retired asset details successfully load');

  // 6. Submit issue publicly
  const issueData = {
    title: 'Water leaking from public unit',
    description: 'There is a major water puddle beneath the core unit.',
    reporterName: 'Jane anonymous',
    reporterContact: '555-123-4567',
    category: 'HVAC',
  };

  const reportRes = await fetch(`${API_URL}/public/assets/${activeSlug}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(issueData)
  });
  const reportData = await reportRes.json();
  if (reportRes.status !== 201 || !reportData.data?.issueNumber) {
    console.error('❌ Public issue submission failed:', reportData);
    process.exit(1);
  }
  const issueNumber = reportData.data.issueNumber;
  console.log(`6. ✅ Public issue submitted successfully. Created ${issueNumber}`);

  // 7. Verify asset status updated to 'Issue Reported'
  const checkAssetRes = await fetch(`${API_URL}/assets/${activeId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const checkAssetData = await checkAssetRes.json();
  if (checkAssetData.data.status !== 'Issue Reported') {
    console.error('❌ Asset status was not updated to "Issue Reported", got:', checkAssetData.data.status);
    process.exit(1);
  }
  console.log('7. ✅ Asset status synced to "Issue Reported"');

  // 8. Verify AssetHistory updated
  const historyRes = await fetch(`${API_URL}/assets/${activeId}/history`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const historyData = await historyRes.json();
  const publicLog = historyData.data.find(h => h.actor === 'Public');
  if (!publicLog || publicLog.action !== 'Issue reported publicly') {
    console.error('❌ Missing or incorrect public history log:', historyData.data);
    process.exit(1);
  }
  console.log('8. ✅ Asset history logged with actor "Public"');

  // 9. GET public issue status by number
  const checkIssueRes = await fetch(`${API_URL}/public/issues/${issueNumber}`);
  const checkIssueData = await checkIssueRes.json();
  if (!checkIssueRes.ok || checkIssueData.data.status !== 'Reported') {
    console.error('❌ Public issue status lookup failed:', checkIssueData);
    process.exit(1);
  }
  console.log(`9. ✅ Public status check is working for ${issueNumber} (${checkIssueData.data.status})`);

  console.log('\n--- All Public Route & Issue Submission Tests Passed! ---');
  process.exit(0);
}

runTests().catch(err => { console.error('Test run failed:', err); process.exit(1); });
