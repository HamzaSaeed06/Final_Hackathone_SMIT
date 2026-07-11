require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function testAuth() {
  console.log('--- Starting Auth & RBAC Verification Tests ---');

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@maintainiq.com';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPassword123!';

  let adminToken = '';
  let technicianToken = '';

  // 1. Test Login as Admin
  try {
    console.log(`1. Attempting login as Admin: ${adminEmail}`);
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword })
    });
    
    const loginData = await loginRes.json();
    if (loginRes.ok && loginData.success && loginData.data?.token) {
      adminToken = loginData.data.token;
      console.log('   ✅ Admin login successful. Token acquired.');
    } else {
      console.error('   ❌ Admin login failed!', loginData);
      process.exit(1);
    }
  } catch (error) {
    console.error('   ❌ Admin login threw error:', error.message);
    process.exit(1);
  }

  // 2. Test Get Me as Admin
  try {
    console.log('2. Testing GET /api/auth/me (Admin)...');
    const meRes = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const meData = await meRes.json();
    if (meRes.ok && meData.success && meData.data?.role === 'admin') {
      console.log('   ✅ GET /me successful. Detected role: admin');
    } else {
      console.error('   ❌ GET /me validation failed!', meData);
      process.exit(1);
    }
  } catch (error) {
    console.error('   ❌ GET /me threw error:', error.message);
    process.exit(1);
  }

  // 3. Test Admin creating a Technician account
  const techEmail = `tech_${Date.now()}@maintainiq.com`;
  const techPassword = 'TechPassword123!';
  try {
    console.log(`3. Registering a technician user: ${techEmail}`);
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'John Tech',
        email: techEmail,
        password: techPassword,
        role: 'technician',
        phone: '999-888-7777',
      })
    });

    const regData = await regRes.json();
    if (regRes.status === 201 && regData.success && regData.data?.role === 'technician') {
      console.log('   ✅ Technician created successfully via Admin account.');
    } else {
      console.error('   ❌ Technician creation failed!', regData);
      process.exit(1);
    }
  } catch (error) {
    console.error('   ❌ Technician registration threw error:', error.message);
    process.exit(1);
  }

  // 4. Test Login as Technician
  try {
    console.log(`4. Attempting login as Technician: ${techEmail}`);
    const techLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: techEmail, password: techPassword })
    });
    
    const techLoginData = await techLoginRes.json();
    if (techLoginRes.ok && techLoginData.success && techLoginData.data?.token) {
      technicianToken = techLoginData.data.token;
      console.log('   ✅ Technician login successful. Token acquired.');
    } else {
      console.error('   ❌ Technician login failed!', techLoginData);
      process.exit(1);
    }
  } catch (error) {
    console.error('   ❌ Technician login threw error:', error.message);
    process.exit(1);
  }

  // 5. Test Technician attempting to Register another user (Should fail with 403 Forbidden)
  try {
    console.log('5. Testing RBAC: Technician attempting to register a new admin...');
    const result = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${technicianToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Hacker Admin',
        email: `hack_${Date.now()}@maintainiq.com`,
        password: 'HackerPassword!',
        role: 'admin',
      })
    });
    
    const resData = await result.json();
    if (result.status === 403) {
      console.log('   ✅ Success: Technician registration request blocked with 403 Forbidden (RBAC works!).');
    } else {
      console.error('   ❌ FAILED: Technician registration check did not return 403. Status received:', result.status, resData);
      process.exit(1);
    }
  } catch (error) {
    console.error('   ❌ RBAC verification threw error:', error.message);
    process.exit(1);
  }

  // 6. Test Unauthenticated registration request (Should fail with 401 Unauthorized)
  try {
    console.log('6. Testing Auth Guard: Requesting registration without token...');
    const result = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unauth User',
        email: 'unauth@maintainiq.com',
        password: 'somePassword',
        role: 'technician'
      })
    });

    const resData = await result.json();
    if (result.status === 401) {
      console.log('   ✅ Success: Unauthenticated registration blocked with 401 Unauthorized (Auth guard works!).');
    } else {
      console.error('   ❌ FAILED: Register check did not return 401. Status received:', result.status, resData);
      process.exit(1);
    }
  } catch (error) {
    console.error('   ❌ Auth guard verification threw error:', error.message);
    process.exit(1);
  }

  console.log('--- All Auth & RBAC Verification Tests Passed Successfully! ---');
  process.exit(0);
}

testAuth();
