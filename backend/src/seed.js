import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Candidate from './models/Candidate.js';
import Interview from './models/Interview.js';
import Feedback from './models/Feedback.js';
import ActivityLog from './models/ActivityLog.js';
import Notification from './models/Notification.js';
import { recomputeScore } from './services/score.js';
import { FLOW } from './constants.js';

const PASSWORD = 'Password123';
const DAY = 86400000;
const hours = (h) => new Date(Date.now() + h * 3600 * 1000);

// [name, position, skills, years, source, stage, days spent in the current stage, rejection reason]
const people = [
  ['Aarav Mehta', 'Frontend Engineer', ['React', 'TypeScript', 'Tailwind'], 4, 'LinkedIn', 'Technical Interview', 3],
  ['Diya Nair', 'Backend Engineer', ['Node.js', 'MongoDB', 'Docker'], 5, 'Referral', 'Technical Interview', 9],
  ['Kabir Singh', 'Full Stack Developer', ['React', 'Node.js', 'PostgreSQL'], 3, 'Careers page', 'Screening', 10],
  ['Ishita Rao', 'Data Analyst', ['SQL', 'Python', 'Tableau'], 2, 'Naukri', 'Applied', 2],
  ['Rohan Gupta', 'DevOps Engineer', ['AWS', 'Terraform', 'Kubernetes'], 6, 'LinkedIn', 'HR Interview', 4],
  ['Meera Iyer', 'Product Designer', ['Figma', 'Research', 'Prototyping'], 4, 'Referral', 'Offered', 2],
  ['Vikram Shah', 'Backend Engineer', ['Java', 'Spring', 'Kafka'], 7, 'Agency', 'Rejected', 12, 'skills_gap'],
  ['Ananya Das', 'Frontend Engineer', ['Vue', 'JavaScript', 'CSS'], 1, 'Campus', 'Applied', 8],
  ['Neha Kapoor', 'QA Engineer', ['Cypress', 'Selenium', 'API testing'], 3, 'Naukri', 'Screening', 3],
  ['Arjun Pillai', 'Full Stack Developer', ['React', 'Express', 'MongoDB'], 2, 'LinkedIn', 'Hired', 6],
  ['Sana Khan', 'Data Scientist', ['Python', 'PyTorch', 'SQL'], 5, 'Referral', 'Applied', 1],
  ['Tanvi Joshi', 'Frontend Engineer', ['React', 'Redux', 'Jest'], 3, 'Careers page', 'Technical Interview', 5],
  ['Pooja Menon', 'UX Researcher', ['Interviews', 'Surveys', 'Figma'], 6, 'Agency', 'Rejected', 20, 'salary_mismatch'],
];

/** Realistic history that follows the one-step-at-a-time rule, backdated so analytics have data. */
function buildHistory(stage, daysInCurrent, by) {
  const last = stage === 'Rejected' ? 'Technical Interview' : stage;
  const steps = FLOW.slice(0, FLOW.indexOf(last) + 1);
  if (stage === 'Rejected') steps.push('Rejected');
  return steps.map((s, k) => ({
    stage: s,
    changedBy: by,
    changedAt: new Date(Date.now() - (daysInCurrent + (steps.length - 1 - k) * 3) * DAY),
  }));
}

async function run() {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--demo')) {
    console.error('Refusing to seed in production: the demo accounts have publicly known passwords.');
    console.error('For a private demo, run:  npm run seed -- --demo');
    process.exit(1);
  }
  await connectDB();
  await Promise.all([User, Candidate, Interview, Feedback, ActivityLog, Notification].map((m) => m.deleteMany({})));

  const recruiter = await User.create({ name: 'Priya Recruiter', email: 'recruiter@demo.com', password: PASSWORD, role: 'recruiter', emailVerified: true });
  const recruiter2 = await User.create({ name: 'Sameer Talent', email: 'recruiter2@demo.com', password: PASSWORD, role: 'recruiter', emailVerified: true });
  const int1 = await User.create({ name: 'Nikhil Interviewer', email: 'interviewer@demo.com', password: PASSWORD, role: 'interviewer', emailVerified: true });
  const int2 = await User.create({ name: 'Rhea Reviewer', email: 'interviewer2@demo.com', password: PASSWORD, role: 'interviewer', emailVerified: true });

  const candidates = [];
  for (const [i, [name, position, skills, exp, source, stage, days, reason]] of people.entries()) {
    const owner = i % 2 ? recruiter2 : recruiter;
    const stageHistory = buildHistory(stage, days, owner._id);
    candidates.push(
      await Candidate.create({
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        phone: `+91 98${String(10000000 + i * 1234567).slice(0, 8)}`,
        position, skills, experienceYears: exp, source, stage, stageHistory,
        createdAt: stageHistory[0].changedAt,
        createdBy: owner._id,
        ...(reason ? { rejectionReason: reason, rejectionNote: '' } : {}),
        notes: i < 3 ? [{ author: recruiter._id, authorName: recruiter.name, role: 'recruiter', text: 'Strong profile, prioritise this week.' }] : [],
      })
    );
  }

  const mk = (c, interviewer, offsetH, type, status = 'scheduled', mode = 'video') =>
    Interview.create({
      candidate: c._id, interviewer: interviewer._id, scheduledBy: recruiter._id,
      scheduledAt: hours(offsetH), durationMins: 60, type, mode, status,
      location: mode === 'video' ? 'https://meet.example.com/hiring' : 'HQ - Room 4B',
    });

  const upcoming = [
    await mk(candidates[0], int1, 26, 'technical'),
    await mk(candidates[1], int1, 50, 'technical'),
    await mk(candidates[2], int2, 5, 'screening', 'scheduled', 'phone'),
    await mk(candidates[4], int2, 74, 'hr', 'scheduled', 'onsite'),
    await mk(candidates[11], int1, 98, 'technical'),
    await mk(candidates[8], int2, 122, 'screening', 'scheduled', 'phone'),
  ];
  const past = [
    await mk(candidates[5], int1, -72, 'technical', 'completed'),
    await mk(candidates[9], int2, -120, 'hr', 'completed'),
    await mk(candidates[6], int2, -96, 'technical', 'completed'),
    await mk(candidates[4], int1, -30, 'technical', 'scheduled'), // feedback is optional, none given
  ];

  const fbData = [
    [past[0], int1, 5, 'strong_hire', 'Great system design and communication.', 'Limited exposure to our stack.'],
    [past[1], int2, 4, 'hire', 'Culture fit, solid fundamentals.', 'Needs mentoring on testing.'],
    [past[2], int2, 2, 'no_hire', 'Good Java knowledge.', 'Struggled with concurrency and debugging.'],
  ];
  for (const [iv, who, rating, recommendation, strengths, concerns] of fbData) {
    await Feedback.create({ interview: iv._id, candidate: iv.candidate, interviewer: who._id, rating, recommendation, strengths, concerns, comments: '' });
  }
  for (const c of candidates) await recomputeScore(c._id);

  const nameOf = (id) => candidates.find((c) => String(c._id) === String(id)).name;
  await ActivityLog.insertMany([
    ...candidates.slice(0, 8).map((c, i) => ({ actor: i % 2 ? recruiter2._id : recruiter._id, action: 'candidate.created', message: `${i % 2 ? recruiter2.name : recruiter.name} added candidate ${c.name} (${c.position})`, candidate: c._id, entityType: 'Candidate', entityId: c._id })),
    ...upcoming.map((iv) => ({ actor: recruiter._id, action: 'interview.scheduled', message: `${recruiter.name} scheduled a ${iv.type} interview for ${nameOf(iv.candidate)}`, candidate: iv.candidate, entityType: 'Interview', entityId: iv._id })),
    { actor: recruiter._id, action: 'candidate.stage_changed', message: `${recruiter.name} moved Meera Iyer from HR Interview to Offered`, candidate: candidates[5]._id },
    { actor: recruiter2._id, action: 'candidate.stage_changed', message: `${recruiter2.name} moved Vikram Shah from Technical Interview to Rejected (skills gap)`, candidate: candidates[6]._id },
  ]);

  console.log('\nSeed complete. Demo logins (password: %s)', PASSWORD);
  console.log('  recruiter:    recruiter@demo.com / recruiter2@demo.com');
  console.log('  interviewer:  interviewer@demo.com / interviewer2@demo.com\n');
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
