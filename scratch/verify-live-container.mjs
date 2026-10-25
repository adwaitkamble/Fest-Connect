// Live container verification script for FestConnect Phase 10
// Tests all endpoints strictly through the browser-facing Nginx container (http://localhost:80)

const BASE_URL = 'http://localhost';

async function run() {
  console.log('[Verification] Starting FestConnect Live Container Verification against ' + BASE_URL);

  // 1. Web App HTML delivery
  console.log('\n--- 1. Testing Web App Static SPA Delivery ---');
  const resWeb = await fetch(`${BASE_URL}/`);
  if (!resWeb.ok) throw new Error(`Failed to load Web SPA: ${resWeb.status}`);
  const html = await resWeb.text();
  if (!html.includes('<title>FestConnect')) throw new Error('SPA HTML does not contain FestConnect title');
  console.log('✓ Web SPA delivered successfully with FestConnect brand title');

  // 2. Health & Readiness Probes
  console.log('\n--- 2. Testing Health & Readiness Probes through Nginx ---');
  const resHealth = await fetch(`${BASE_URL}/api/health`);
  const healthJson = await resHealth.json();
  if (healthJson.status !== 'ok') throw new Error('Health probe failed');
  console.log('✓ /api/health returned ok:', healthJson.status);

  const resReady = await fetch(`${BASE_URL}/api/ready`);
  const readyJson = await resReady.json();
  if (!readyJson.dependencies?.database?.connected) throw new Error('Ready probe database not connected');
  console.log('✓ /api/ready verified database connection is live');

  // 3. Public Event Discovery
  console.log('\n--- 3. Testing Public Event Discovery ---');
  const resEvents = await fetch(`${BASE_URL}/api/v1/events?limit=5`);
  const eventsJson = await resEvents.json();
  if (!eventsJson.success || !Array.isArray(eventsJson.data.events)) throw new Error('Event listing failed');
  console.log(`✓ Fetched ${eventsJson.data.events.length} public events from MySQL / Redis`);
  const targetEvent = eventsJson.data.events[0];
  console.log(`  Selected Event: #${targetEvent.event_id} "${targetEvent.title}" (Fee: INR ${targetEvent.registration_fee})`);

  // 4. Authenticate as Participant
  console.log('\n--- 4. Testing Participant Authentication ---');
  const resLogin = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'adwait@festconnect.edu',
      password: 'demo1234',
    }),
  });
  if (!resLogin.ok) throw new Error(`Login failed: ${resLogin.status}`);
  const loginJson = await resLogin.json();
  const setCookie = resLogin.headers.get('set-cookie');
  if (!setCookie) throw new Error('No set-cookie returned');
  
  // Extract session cookies
  const cookies = setCookie.split(',').map(c => c.split(';')[0].trim()).join('; ');
  const csrfToken = loginJson.csrfToken;
  console.log('✓ Logged in as:', loginJson.user.email, `(Role: ${loginJson.user.role})`);
  console.log('✓ Extracted session cookies and CSRF token');

  // Verify /me
  const resMe = await fetch(`${BASE_URL}/api/v1/auth/me`, {
    headers: { 'Cookie': cookies },
  });
  const meJson = await resMe.json();
  if (meJson.user.email !== 'adwait@festconnect.edu') throw new Error('/me returned wrong user');
  console.log('✓ Verified /api/v1/auth/me session identity');

  // 5. Team Formation
  console.log('\n--- 5. Testing Team Formation ---');
  const teamName = `Live Squad ${Date.now()}`;
  const resTeam = await fetch(`${BASE_URL}/api/v1/teams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      team_name: teamName,
    }),
  });
  const teamJson = await resTeam.json();
  if (!teamJson.success) throw new Error(`Team creation failed: ${JSON.stringify(teamJson)}`);
  const teamId = teamJson.data.team_id;
  console.log(`✓ Created Team #${teamId} "${teamName}" with leader ${loginJson.user.email}`);

  // Add Member
  const resAddMember = await fetch(`${BASE_URL}/api/v1/teams/${teamId}/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      email: 'shivam@festconnect.edu',
    }),
  });
  const addJson = await resAddMember.json();
  if (!addJson.success) throw new Error(`Add member failed: ${JSON.stringify(addJson)}`);
  console.log('✓ Added member shivam@festconnect.edu to team');

  // 6. Event Registration
  console.log('\n--- 6. Testing Event Registration ---');
  const resReg = await fetch(`${BASE_URL}/api/v1/registrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      team_id: teamId,
      event_id: targetEvent.event_id,
    }),
  });
  const regJson = await resReg.json();
  if (!regJson.success) throw new Error(`Registration failed: ${JSON.stringify(regJson)}`);
  const registrationId = regJson.data.registration_id;
  console.log(`✓ Registered team for Event #${targetEvent.event_id}. Registration #${registrationId}`);
  console.log(`  Initial Status: ${regJson.data.status} (Server-Authoritative PENDING_PAYMENT)`);

  // 7. Verify Pass Unavailable Before Payment
  console.log('\n--- 7. Verifying Pass Unavailable Pre-Payment ---');
  const resPrePass = await fetch(`${BASE_URL}/api/v1/registrations/${registrationId}/pass`, {
    headers: { 'Cookie': cookies },
  });
  if (resPrePass.status !== 404) throw new Error(`Expected 404 for unconfirmed pass, got ${resPrePass.status}`);
  console.log('✓ Digital pass strictly returns 404 NOT_FOUND before payment');

  // 8. Test Failed Payment Simulation
  console.log('\n--- 8. Testing Failed Mock Payment Outcome ---');
  const resFailPay = await fetch(`${BASE_URL}/api/v1/registrations/${registrationId}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      simulated_outcome: 'FAILED',
    }),
  });
  const failJson = await resFailPay.json();
  if (failJson.data.payment_status !== 'FAILED') throw new Error(`Expected payment to fail, got ${JSON.stringify(failJson)}`);
  console.log('✓ Payment attempt 1 recorded FAILED:', failJson.data.transaction_id);

  // Confirm registration still PENDING_PAYMENT
  const resRegCheck = await fetch(`${BASE_URL}/api/v1/registrations/${registrationId}`, {
    headers: { 'Cookie': cookies },
  });
  const regCheckJson = await resRegCheck.json();
  if (regCheckJson.data.status !== 'PENDING_PAYMENT') throw new Error('Registration should remain PENDING_PAYMENT');
  console.log('✓ Registration remains PENDING_PAYMENT after failed payment');

  // 9. Test Successful Payment Simulation
  console.log('\n--- 9. Testing Successful Mock Payment Outcome ---');
  const resSuccPay = await fetch(`${BASE_URL}/api/v1/registrations/${registrationId}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      simulated_outcome: 'SUCCESS',
    }),
  });
  const succJson = await resSuccPay.json();
  if (succJson.data.payment_status !== 'SUCCESS') throw new Error(`Expected payment to succeed, got ${JSON.stringify(succJson)}`);
  console.log('✓ Payment attempt 2 recorded SUCCESS:', succJson.data.transaction_id);

  // Confirm registration status transitioned to CONFIRMED
  const resRegConfirmed = await fetch(`${BASE_URL}/api/v1/registrations/${registrationId}`, {
    headers: { 'Cookie': cookies },
  });
  const regConfirmedJson = await resRegConfirmed.json();
  if (regConfirmedJson.data.status !== 'CONFIRMED') throw new Error('Registration should be CONFIRMED');
  console.log(`✓ Registration status transitioned to: ${regConfirmedJson.data.status}`);

  // 10. Digital Pass & Visual QR Code Retrieval
  console.log('\n--- 10. Testing Digital Pass & QR Code Retrieval ---');
  const resPass = await fetch(`${BASE_URL}/api/v1/registrations/${registrationId}/pass`, {
    headers: { 'Cookie': cookies },
  });
  const passJson = await resPass.json();
  if (!passJson.success) throw new Error('Failed to retrieve pass');
  const passNumber = passJson.data.pass.pass_number;
  console.log('✓ Retrieved Digital Pass Number:', passNumber);
  console.log('✓ Visual QR Code data URL present:', passJson.data.qr_data_url.slice(0, 35) + '...');

  // 11. Email Notification Delivery & Duplicate Protection
  console.log('\n--- 11. Testing Email Delivery & Duplicate Suppression ---');
  // Wait up to 500ms for async email notification to settle
  let resNotif = await fetch(`${BASE_URL}/api/v1/registrations/${registrationId}/notifications/email`, {
    headers: { 'Cookie': cookies },
  });
  let notifJson = await resNotif.json();
  for (let i = 0; i < 5 && notifJson.data?.status === 'NOT_SENT'; i++) {
    await new Promise(r => setTimeout(r, 100));
    resNotif = await fetch(`${BASE_URL}/api/v1/registrations/${registrationId}/notifications/email`, {
      headers: { 'Cookie': cookies },
    });
    notifJson = await resNotif.json();
  }
  console.log('✓ Pass notification delivery status:', notifJson.data.status, `(Recipient: ${notifJson.data.recipient})`);

  // Test duplicate suppression
  const resDup = await fetch(`${BASE_URL}/api/v1/registrations/${registrationId}/notifications/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({}),
  });
  if (resDup.status !== 409) throw new Error(`Expected 409 Conflict for duplicate notification, got ${resDup.status}`);
  console.log('✓ Duplicate notification request rejected with HTTP 409 Conflict');

  // 12. Coordinator Login & Gate Pass Verification
  console.log('\n--- 12. Testing Coordinator Gate Pass Verification ---');
  const resCoordLogin = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'coordinator@festconnect.edu',
      password: 'demo1234',
    }),
  });
  const coordLoginJson = await resCoordLogin.json();
  const coordCookies = resCoordLogin.headers.get('set-cookie').split(',').map(c => c.split(';')[0].trim()).join('; ');
  const coordCsrf = coordLoginJson.csrfToken;
  console.log('✓ Logged in as Event Coordinator:', coordLoginJson.user.email);

  // Verify valid pass
  const resVerifyValid = await fetch(`${BASE_URL}/api/v1/passes/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': coordCookies,
      'X-CSRF-Token': coordCsrf,
    },
    body: JSON.stringify({
      pass_number: passNumber,
    }),
  });
  const verifyValidJson = await resVerifyValid.json();
  if (!verifyValidJson.success || !verifyValidJson.data.valid) throw new Error('Gate verification rejected valid pass');
  console.log('✓ Gate verification approved valid pass:', verifyValidJson.data.pass_number);

  // Verify forged pass rejected
  const resVerifyForged = await fetch(`${BASE_URL}/api/v1/passes/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': coordCookies,
      'X-CSRF-Token': coordCsrf,
    },
    body: JSON.stringify({
      pass_number: 'FEST-2026-REG999-FORGED00',
    }),
  });
  const verifyForgedJson = await resVerifyForged.json();
  if (resVerifyForged.status !== 400 || verifyForgedJson.data?.valid !== false) {
    throw new Error('Gate verification should reject forged pass');
  }
  console.log('✓ Gate verification correctly rejected forged pass number with HTTP 400');

  console.log('\n======================================================');
  console.log('ALL 12 LIVE CONTAINER WORKFLOW CHECKS PASSED PERFECTLY!');
  console.log('======================================================');
}

run().catch((err) => {
  console.error('\n❌ Live Verification Failed:', err);
  process.exit(1);
});
