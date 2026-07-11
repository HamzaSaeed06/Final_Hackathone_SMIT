require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Maintenance Workflow & State Machine verification ---');

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

  // 2. Setup: Create Technician
  const techEmail = `tech_${Date.now()}@example.com`;
  const techPassword = 'TechPassword123!';
  console.log(`2. Registering technician account ${techEmail}...`);
  const regRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Rob Tech', email: techEmail, password: techPassword, role: 'technician' })
  });
  const regData = await regRes.json();
  if (!regRes.ok) { console.error('❌ Technician registration failed:', regData); process.exit(1); }
  
  // Login as tech
  const techLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: techEmail, password: techPassword })
  });
  const techLoginData = await techLoginRes.json();
  const techToken = techLoginData.data.token;
  const techId = techLoginData.data.user.id || techLoginData.data.user._id;

  // 3. Setup: Create Asset
  console.log('3. Registering asset...');
  const assetRes = await fetch(`${API_URL}/assets`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Backup Generator', category: 'Electrical', location: 'Basement', condition: 'Good' })
  });
  const assetData = await assetRes.json();
  const slug = assetData.data.publicSlug;
  const assetId = assetData.data._id;

  // 4. Setup: Report Issue
  console.log('4. Submitting incident report...');
  const reportRes = await fetch(`${API_URL}/public/assets/${slug}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Generator backup fails startup cycle',
      description: 'Generators start engine triggers spark but immediately dies.',
      category: 'Electrical',
      priority: 'High',
      reporterName: 'Supervisor Jane'
    })
  });
  const reportData = await reportRes.json();
  const issueId = reportData.data._id;
  const issueNumber = reportData.data.issueNumber;
  console.log(`4. ✅ Setup complete. Issue ID: ${issueId} / Number: ${issueNumber}`);

  // 5. Test: Tech cannot assign themselves
  console.log('5. Testing: Technician cannot invoke assign endpoint...');
  const assignFailRes = await fetch(`${API_URL}/issues/${issueId}/assign`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${techToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ technicianId: techId })
  });
  if (assignFailRes.status !== 403) {
    console.error('❌ Tech was allowed to invoke assign endpoint directly! status:', assignFailRes.status);
    process.exit(1);
  }
  console.log('5. ✅ Role guard on assign route is working (403)');

  // 6. Test: Admin assigns technician
  console.log('6. Assigning technician via Admin...');
  const assignRes = await fetch(`${API_URL}/issues/${issueId}/assign`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ technicianId: techId })
  });
  const assignData = await assignRes.json();
  if (!assignRes.ok || assignData.data.status !== 'Assigned') {
    console.error('❌ Admin assignment failed:', assignData);
    process.exit(1);
  }
  console.log('6. ✅ Assign route transitions state to "Assigned"');

  // 7. Test: Invalid transition jump validation
  console.log('7. Testing illegal status transition jump (Assigned -> Resolved)...');
  const jumpRes = await fetch(`${API_URL}/issues/${issueId}/status`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${techToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Resolved' })
  });
  if (jumpRes.status === 200) {
    console.error('❌ Allowed illegal transition jump to Resolved!');
    process.exit(1);
  }
  console.log('7. ✅ State machine blocked invalid status jump (400)');

  // 8. Test: Transition to Inspection Started
  console.log('8. Moving issue to "Inspection Started"...');
  const inspectRes = await fetch(`${API_URL}/issues/${issueId}/status`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${techToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Inspection Started' })
  });
  if (!inspectRes.ok) { console.error('❌ Inspection Start failed:', await inspectRes.json()); process.exit(1); }
  
  // Verify asset status synced to Under Inspection
  const assetCheck1 = await fetch(`${API_URL}/assets/${assetId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const assetCheckData1 = await assetCheck1.json();
  if (assetCheckData1.data.status !== 'Under Inspection') {
    console.error(`❌ Asset status not synced to Under Inspection! status: ${assetCheckData1.data.status}`);
    process.exit(1);
  }
  console.log('8. ✅ Asset status synced to Under Inspection');

  // 9. Test: Transition to Maintenance In Progress
  console.log('9. Transitioning status to "Maintenance In Progress"...');
  const maintRes = await fetch(`${API_URL}/issues/${issueId}/status`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${techToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Maintenance In Progress' })
  });
  if (!maintRes.ok) { console.error('❌ Start Maintenance failed'); process.exit(1); }
  
  // Verify asset status synced to Under Maintenance
  const assetCheck2 = await fetch(`${API_URL}/assets/${assetId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const assetCheckData2 = await assetCheck2.json();
  if (assetCheckData2.data.status !== 'Under Maintenance') {
    console.error(`❌ Asset status not synced to Under Maintenance!`);
    process.exit(1);
  }
  console.log('9. ✅ Asset status synced to Under Maintenance');

  // 10. Test: Log Maintenance - Cost Validation
  console.log('10. Testing: Maintenance cost cannot be negative...');
  const logFailRes = await fetch(`${API_URL}/issues/${issueId}/maintenance-log`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${techToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inspectionNotes: 'Spark plug points carbonized',
      workPerformed: 'Replaced spark plugs, cleaned contacts',
      cost: -250,
      finalCondition: 'Good',
      startedAt: new Date(Date.now() - 3600000),
      completedAt: new Date()
    })
  });
  if (logFailRes.status !== 400) {
    console.error('❌ Allowed negative cost for maintenance log submission!');
    process.exit(1);
  }
  console.log('10. ✅ Negative cost correctly blocked (400)');

  // Log actual maintenance
  console.log('11. Logging actual maintenance log details...');
  const logSuccessRes = await fetch(`${API_URL}/issues/${issueId}/maintenance-log`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${techToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inspectionNotes: 'Spark plug points carbonized',
      workPerformed: 'Replaced spark plugs, cleaned contacts',
      cost: 120,
      finalCondition: 'Good',
      startedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(),
      partsUsed: ['Spark Plug A']
    })
  });
  if (!logSuccessRes.ok) { console.error('❌ Maintenance log creation failed:', await logSuccessRes.json()); process.exit(1); }
  console.log('11. ✅ Maintenance log entry registered successfully');

  // 11. Test: Next service date validation
  console.log('12. Testing nextServiceDate validation (must be in future)...');
  const pastDate = new Date(Date.now() - 86400000 * 2).toISOString(); // 2 days ago
  const resolveFailRes = await fetch(`${API_URL}/issues/${issueId}/status`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${techToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Resolved', nextServiceDate: pastDate })
  });
  if (resolveFailRes.status !== 400) {
    console.error('❌ Allowed nextServiceDate to be in the past!', resolveFailRes.status);
    process.exit(1);
  }
  console.log('12. ✅ Past nextServiceDate correctly blocked (400)');

  // Resolve with correct next service date
  console.log('13. Resolving issue with correct nextServiceDate...');
  const futureDate = new Date(Date.now() + 86400000 * 30).toISOString(); // 30 days future
  const resolveRes = await fetch(`${API_URL}/issues/${issueId}/status`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${techToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Resolved', nextServiceDate: futureDate })
  });
  if (!resolveRes.ok) { console.error('❌ Final resolve failed:', await resolveRes.json()); process.exit(1); }

  // Verify asset operational status sync
  const assetCheck3 = await fetch(`${API_URL}/assets/${assetId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const assetCheckData3 = await assetCheck3.json();
  if (assetCheckData3.data.status !== 'Operational') {
    console.error(`❌ Linked asset was not synced to Operational after resolve! status: ${assetCheckData3.data.status}`);
    process.exit(1);
  }
  if (!assetCheckData3.data.lastServiceDate) {
    console.error('❌ Asset lastServiceDate was not updated on resolve!');
    process.exit(1);
  }
  console.log('13. ✅ Issue resolved. Asset synced back to "Operational" and scheduling updated.');

  console.log('\n--- All Maintenance Workflow & Safety Tests Passed! ---');
  process.exit(0);
}

runTests().catch(err => { console.error('Test run failed:', err); process.exit(1); });
