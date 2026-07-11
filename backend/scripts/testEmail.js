require('dotenv').config();
const { sendAssignmentEmail, sendResolutionEmail } = require('../src/services/email.service');

async function run() {
  console.log('--- Testing Email Notifications Dispatch ---');
  
  console.log('\n1. Dispatching tech assignment email...');
  await sendAssignmentEmail(
    'tech@test.com',
    'John Tech',
    'ISS-0099',
    'HVAC Unit B',
    'Building 4, Roof',
    'High'
  );
  
  console.log('\n2. Dispatching reporter resolution email...');
  await sendResolutionEmail(
    'reporter@test.com',
    'Alice Reporter',
    'ISS-0099',
    'HVAC Unit B'
  );
  
  console.log('\n--- Email Test Complete ---');
}

run().catch(err => {
  console.error('Email test failed:', err);
});
