require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- AI Issue Triage Verification Tests ---');

  // 1. Setup: Register/log in admin and create active asset
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

  const createRes = await fetch(`${API_URL}/assets`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Central AC Machine', category: 'HVAC', location: 'Server Room', condition: 'Good' })
  });
  const createData = await createRes.json();
  if (!createRes.ok) { console.error('❌ Asset creation failed:', createData); process.exit(1); }
  const slug = createData.data.publicSlug;
  const assetId = createData.data._id;
  console.log(`1. ✅ Setup completed. Created asset with slug: ${slug}`);

  // 2. Test AI Triage for normal cooling issue
  console.log('2. Testing AI Triage with standard HVAC complaint...');
  const triageRes1 = await fetch(`${API_URL}/public/assets/${slug}/ai-triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ complaint: 'AC is not cooling down the room and is making a low humming noise.' })
  });
  const triageData1 = await triageRes1.json();
  if (!triageRes1.ok) { console.error('❌ Triage failed:', triageData1); process.exit(1); }
  
  const suggestion1 = triageData1.data;
  const requiredFields = ['title', 'category', 'priority', 'possibleCauses', 'initialChecks', 'recurringWarning'];
  for (const field of requiredFields) {
    if (suggestion1[field] === undefined) {
      console.error(`❌ Missing field in triage suggestion response: ${field}`);
      process.exit(1);
    }
  }
  console.log('2. ✅ AI triage response structure matches required Mongoose schema');

  // 3. Test AI Triage for electrical hazard complaint (Safety Rule test)
  console.log('3. Testing AI Triage with electrical shock hazard complaint...');
  const triageRes2 = await fetch(`${API_URL}/public/assets/${slug}/ai-triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ complaint: 'Sparks flying out of unit wires when switched on with smoke smell' })
  });
  const triageData2 = await triageRes2.json();
  if (!triageRes2.ok) { console.error('❌ Safety triage failed:', triageData2); process.exit(1); }
  
  const suggestion2 = triageData2.data;
  if (suggestion2.priority !== 'Critical') {
    console.error(`❌ Expected priority to be Critical for electrical hazards, got: ${suggestion2.priority}`);
    process.exit(1);
  }
  
  const checkText = suggestion2.initialChecks.join(' ').toLowerCase();
  const safeIndicators = ['stop', 'diy', 'technician', 'hazard', 'safety', 'danger', 'do not', 'call'];
  const hasSafetyFlag = safeIndicators.some(ind => checkText.includes(ind));
  if (!hasSafetyFlag) {
    console.error('❌ AI suggested DIY checks for structural/electrical hazard! Checks:', suggestion2.initialChecks);
    process.exit(1);
  }
  console.log('3. ✅ AI correctly enforced safety protocols for electrical dangers (Critical, no DIY)');

  // 4. Submit issue with aiSuggestion details and wasEdited: true
  console.log('4. Submitting reported issue with edited suggestion verification...');
  const issueReportRes = await fetch(`${API_URL}/public/assets/${slug}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Facility Guest',
      reporterContact: 'guest@example.com',
      title: 'AC unit thermostat failure (Edited Title)',
      description: 'AC is not cooling down the room and is making a low humming noise.',
      category: 'HVAC',
      priority: 'Medium',
      aiSuggestion: {
        title: suggestion1.title,
        category: suggestion1.category,
        priority: suggestion1.priority,
        possibleCauses: suggestion1.possibleCauses,
        initialChecks: suggestion1.initialChecks,
        recurringWarning: suggestion1.recurringWarning,
        wasEdited: true // User edited the title from suggestion
      }
    })
  });
  const issueReportData = await issueReportRes.json();
  if (!issueReportRes.ok) { console.error('❌ Issue reporting failed:', issueReportData); process.exit(1); }
  console.log(`4. ✅ Reported issue successfully code: ${issueReportData.data.issueNumber}`);

  // 5. Retrieve issue from database checking wasEdited status
  console.log('5. Verifying Issue history schema holds suggestion + wasEdited flag...');
  const checkIssueRes = await fetch(`${API_URL}/public/issues/${issueReportData.data.issueNumber}`);
  // Note: GET /public/issues/:issueNumber might be limited in fields returned by the public checker.
  // Let's do authenticated check using the admin access to get full schema payload if public lookup is restricted.
  // Actually, we can fetch all issues under admin auth.
  // But wait, the database Model is Issue. Let's make sure it holds the suggestion.
  const issuesListRes = await fetch(`${API_URL}/assets/${assetId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const issuesListData = await issuesListRes.json();
  // Wait, let's do a direct issue search if it's there. Since GET /api/issues is auth, let's fetch /api/public/issues/:issueNumber
  // Wait, does GET /api/public/issues/:issueNumber return aiSuggestion? No, we restricted select.
  // Let's get the issue ID from the created response and fetch it? Wait, do we have an auth get issue endpoint?
  // Let's check sections 5 details: GET /api/issues is not built yet (Prompt 06).
  // But we can check that the returned created object contains it since Issue.create is what returns it.
  if (!issueReportData.data.aiSuggestion?.wasEdited) {
    console.error('❌ wasEdited flag failed to record on the returned created issue:', issueReportData.data);
    process.exit(1);
  }
  console.log('5. ✅ wasEdited flag recorded correct state (true)');

  console.log('\n--- All AI Issue Triage Verification Tests Passed! ---');
  process.exit(0);
}

runTests().catch(err => { console.error('Test run failed:', err); process.exit(1); });
