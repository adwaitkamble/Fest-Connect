import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { getDbConfig } from './connection.js';
import { assertDisposableDatabase } from './safety.js';

export async function runSeeds(): Promise<void> {
  assertDisposableDatabase('Seed');

  const config = getDbConfig();
  console.log(`[FestConnect Seed] Seeding demo data into MySQL at ${config.host}:${config.port}/${config.database}...`);

  const connection = await mysql.createConnection({
    ...config,
    multipleStatements: true,
  });

  try {
    const saltRounds = 10;
    const defaultPasswordHash = await bcrypt.hash('demo1234', saltRounds);

    console.log('[FestConnect Seed] 1. Seeding Participants (Accounts)...');
    // Admin, Coordinator, and 3 Students (Project Team)
    const participants = [
      {
        id: 1,
        first_name: 'System',
        last_name: 'Administrator',
        email: 'admin@festconnect.edu',
        phone: '9876543210',
        college_name: 'PCCoE Autonomous',
        dob: '1990-01-01',
        role: 'ADMIN',
      },
      {
        id: 2,
        first_name: 'Shalu',
        last_name: 'Mahajan',
        email: 'coordinator@festconnect.edu',
        phone: '9876543211',
        college_name: 'PCCoE Autonomous',
        dob: '1985-05-15',
        role: 'COORDINATOR',
      },
      {
        id: 3,
        first_name: 'Adwait',
        last_name: 'Kamble',
        email: 'adwait@festconnect.edu',
        phone: '9876543212',
        college_name: 'PCCoE Autonomous',
        dob: '2004-03-20',
        role: 'PARTICIPANT',
      },
      {
        id: 4,
        first_name: 'Shivam',
        last_name: 'Kasodekar',
        email: 'shivam@festconnect.edu',
        phone: '9876543213',
        college_name: 'PCCoE Autonomous',
        dob: '2004-07-11',
        role: 'PARTICIPANT',
      },
      {
        id: 5,
        first_name: 'Nikhil',
        last_name: 'Puppalwar',
        email: 'nikhil@festconnect.edu',
        phone: '9876543214',
        college_name: 'PCCoE Autonomous',
        dob: '2004-11-25',
        role: 'PARTICIPANT',
      },
    ];

    for (const p of participants) {
      await connection.query(
        `INSERT INTO \`participant\`
          (\`participant_id\`, \`first_name\`, \`last_name\`, \`email\`, \`phone\`, \`college_name\`, \`date_of_birth\`, \`password_hash\`, \`role\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          \`first_name\` = VALUES(\`first_name\`),
          \`last_name\` = VALUES(\`last_name\`),
          \`phone\` = VALUES(\`phone\`),
          \`college_name\` = VALUES(\`college_name\`),
          \`date_of_birth\` = VALUES(\`date_of_birth\`),
          \`role\` = VALUES(\`role\`);`,
        [p.id, p.first_name, p.last_name, p.email, p.phone, p.college_name, p.dob, defaultPasswordHash, p.role]
      );
    }

    console.log('[FestConnect Seed] 2. Seeding Participant Skills...');
    const skills = [
      [3, 'FullStack'],
      [3, 'TypeScript'],
      [4, 'System Design'],
      [4, 'React'],
      [5, 'Database Tuning'],
      [5, 'Docker'],
    ];
    for (const [pid, skill] of skills) {
      await connection.query(
        `INSERT IGNORE INTO \`participant_skill\` (\`participant_id\`, \`skill\`) VALUES (?, ?)`,
        [pid, skill]
      );
    }

    console.log('[FestConnect Seed] 3. Seeding Event Coordinator Profile...');
    await connection.query(
      `INSERT INTO \`event_coordinator\` (\`coordinator_id\`, \`participant_id\`, \`name\`, \`email\`, \`phone\`)
       VALUES (1, 2, 'Prof. Shalu Mahajan', 'coordinator@festconnect.edu', '9876543211')
       ON DUPLICATE KEY UPDATE
        \`name\` = VALUES(\`name\`),
        \`phone\` = VALUES(\`phone\`);`
    );

    console.log('[FestConnect Seed] 4. Seeding Events...');
    const events = [
      {
        id: 1,
        coordinator_id: 1,
        event_name: 'CodeCraft 24h Hackathon',
        event_type: 'Coding / Software',
        description: 'Flagship 24-hour university hackathon focusing on AI agents and fullstack web applications.',
        min_team_size: 2,
        max_team_size: 4,
        registration_fee: 400.00,
        status: 'UPCOMING',
      },
      {
        id: 2,
        coordinator_id: 1,
        event_name: 'RoboSumo Autonomous Arena',
        event_type: 'Robotics',
        description: 'Combat robotics challenge testing autonomous obstacle navigation and opponent ejection.',
        min_team_size: 1,
        max_team_size: 3,
        registration_fee: 300.00,
        status: 'UPCOMING',
      },
      {
        id: 3,
        coordinator_id: 1,
        event_name: 'AlgoSprint Rapid Problem Solving',
        event_type: 'Competitive Programming',
        description: 'Fast-paced algorithmic programming contest testing data structures and optimization.',
        min_team_size: 1,
        max_team_size: 1,
        registration_fee: 100.00,
        status: 'UPCOMING',
      },
    ];

    for (const ev of events) {
      await connection.query(
        `INSERT INTO \`event\`
          (\`event_id\`, \`coordinator_id\`, \`event_name\`, \`event_type\`, \`description\`, \`min_team_size\`, \`max_team_size\`, \`registration_fee\`, \`status\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          \`event_name\` = VALUES(\`event_name\`),
          \`event_type\` = VALUES(\`event_type\`),
          \`description\` = VALUES(\`description\`),
          \`min_team_size\` = VALUES(\`min_team_size\`),
          \`max_team_size\` = VALUES(\`max_team_size\`),
          \`registration_fee\` = VALUES(\`registration_fee\`),
          \`status\` = VALUES(\`status\`);`,
        [ev.id, ev.coordinator_id, ev.event_name, ev.event_type, ev.description, ev.min_team_size, ev.max_team_size, ev.registration_fee, ev.status]
      );
    }

    console.log('[FestConnect Seed] 5. Seeding Event Schedules...');
    const schedules = [
      { id: 1, event_id: 1, date: '2026-11-15', start: '09:00:00', end: '18:00:00', venue: 'Auditorium Hall B' },
      { id: 2, event_id: 2, date: '2026-11-16', start: '10:00:00', end: '16:00:00', venue: 'Robotics Center Lab 4' },
      { id: 3, event_id: 3, date: '2026-11-17', start: '11:00:00', end: '14:00:00', venue: 'Computing Complex 2' },
    ];

    for (const sc of schedules) {
      await connection.query(
        `INSERT INTO \`schedule\` (\`schedule_id\`, \`event_id\`, \`event_date\`, \`start_time\`, \`end_time\`, \`venue\`)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          \`event_date\` = VALUES(\`event_date\`),
          \`start_time\` = VALUES(\`start_time\`),
          \`end_time\` = VALUES(\`end_time\`),
          \`venue\` = VALUES(\`venue\`);`,
        [sc.id, sc.event_id, sc.date, sc.start, sc.end, sc.venue]
      );
    }

    console.log('[FestConnect Seed] 6. Seeding Demo Team and Members...');
    // Team 1 led by Adwait (id: 3)
    await connection.query(
      `INSERT INTO \`team\` (\`team_id\`, \`team_name\`, \`leader_id\`, \`status\`)
       VALUES (1, 'CodeCrafters Alpha', 3, 'READY')
       ON DUPLICATE KEY UPDATE
        \`team_name\` = VALUES(\`team_name\`),
        \`leader_id\` = VALUES(\`leader_id\`),
        \`status\` = VALUES(\`status\`);`
    );

    const members = [
      { id: 1, team_id: 1, participant_id: 3, role: 'LEADER' },
      { id: 2, team_id: 1, participant_id: 4, role: 'MEMBER' },
      { id: 3, team_id: 1, participant_id: 5, role: 'MEMBER' },
    ];

    for (const m of members) {
      await connection.query(
        `INSERT INTO \`team_member\` (\`team_member_id\`, \`team_id\`, \`participant_id\`, \`role\`)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          \`role\` = VALUES(\`role\`);`,
        [m.id, m.team_id, m.participant_id, m.role]
      );
    }

    console.log('[FestConnect Seed] 7. Seeding Registration, Payment & Pass...');
    // Team 1 registers for Event 1 (CodeCraft Hackathon)
    await connection.query(
      `INSERT INTO \`registration\` (\`registration_id\`, \`team_id\`, \`event_id\`, \`status\`)
       VALUES (1, 1, 1, 'CONFIRMED')
       ON DUPLICATE KEY UPDATE
        \`status\` = VALUES(\`status\`);`
    );

    // 7.1 Initial Payment Attempt (FAILED - Simulates gateway network drop / retry scenario per Use Case 16)
    await connection.query(
      `INSERT INTO \`payment\`
        (\`payment_id\`, \`registration_id\`, \`attempt_number\`, \`amount\`, \`payment_status\`, \`payment_method\`, \`transaction_id\`, \`payment_date\`)
       VALUES (1, 1, 1, 400.00, 'FAILED', 'MOCK', 'TXN_DEMO_20261023_001_FAIL', CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
        \`amount\` = VALUES(\`amount\`),
        \`payment_status\` = VALUES(\`payment_status\`),
        \`transaction_id\` = VALUES(\`transaction_id\`);`
    );

    // 7.2 Retry Payment Attempt (SUCCESS - Verified payment for Registration 1)
    await connection.query(
      `INSERT INTO \`payment\`
        (\`payment_id\`, \`registration_id\`, \`attempt_number\`, \`amount\`, \`payment_status\`, \`payment_method\`, \`transaction_id\`, \`payment_date\`)
       VALUES (2, 1, 2, 400.00, 'SUCCESS', 'MOCK', 'TXN_DEMO_20261023_002_SUCC', CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
        \`amount\` = VALUES(\`amount\`),
        \`payment_status\` = VALUES(\`payment_status\`),
        \`transaction_id\` = VALUES(\`transaction_id\`);`
    );

    // 7.3 Digital Pass for Registration 1 (Linked to verified successful payment 2)
    await connection.query(
      `INSERT INTO \`pass_receipt\`
        (\`pass_id\`, \`registration_id\`, \`payment_id\`, \`pass_number\`, \`qr_code\`, \`issue_date\`)
       VALUES (1, 1, 2, 'FEST-2026-CC1-001', 'FESTCONNECT::PASS::REG1::EVENT1::TEAM1::PAY2::SIG789ABC', CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
        \`payment_id\` = VALUES(\`payment_id\`),
        \`pass_number\` = VALUES(\`pass_number\`),
        \`qr_code\` = VALUES(\`qr_code\`);`
    );

    console.log('[FestConnect Seed] Demo data seeded successfully.');
    console.log('------------------------------------------------------------');
    console.log('DEMO ACCOUNTS (Local Development Only — Password: demo1234):');
    console.log('  Admin:       admin@festconnect.edu');
    console.log('  Coordinator: coordinator@festconnect.edu');
    console.log('  Participant: adwait@festconnect.edu (Team Leader)');
    console.log('  Participant: shivam@festconnect.edu (Team Member)');
    console.log('  Participant: nikhil@festconnect.edu (Team Member)');
    console.log('------------------------------------------------------------');
  } finally {
    await connection.end();
  }
}

// Execute directly if run as a script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSeeds()
    .then(() => {
      console.log('[FestConnect Seed] Complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[FestConnect Seed] Seeding failed:', err);
      process.exit(1);
    });
}
