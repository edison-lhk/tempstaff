/*
 * If you need to initialize your database with some data, you may write a script
 * to do so here.
 */
'use strict';

const bcrypt = require("bcrypt");
const {
  PrismaClient,
  Role,
  QualificationStatus,
  JobStatus,
  NegotiationStatus,
} = require("@prisma/client");
const { JOB_START_WINDOW_HOURS, NEGOTIATION_WINDOW_SECONDS } = require("../src/app");

const prisma = new PrismaClient();

const REGULAR_COUNT = 20;
const BUSINESS_COUNT = 10;
const ADMIN_COUNT = 1;
const POSITION_TYPE_COUNT = 10;
const QUALIFICATION_COUNT = 20;
const JOB_COUNT = 30;

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function startTimeNearMaxWindow(index = 0) {
  const now = new Date();
  const baseHours = JOB_START_WINDOW_HOURS - 2;
  const variation = index % 3;
  return addHours(now, baseHours - variation);
}

function addHours(date, hours) {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

async function makePassword(raw) {
  try {
    return await bcrypt.hash(raw, 10);
  } catch {
    return raw;
  }
}

function uniqueArray(arr) {
  return [...new Set(arr)];
}

async function clearDatabase() {
  await prisma.negotiation.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.job.deleteMany();
  await prisma.qualification.deleteMany();
  await prisma.positionType.deleteMany();
  await prisma.resetToken.deleteMany();
  await prisma.adminProfile.deleteMany();
  await prisma.businessProfile.deleteMany();
  await prisma.regularProfile.deleteMany();
  await prisma.account.deleteMany();
}

async function seed() {
  console.log("Seeding database...");
  await clearDatabase();

  const seededPassword = await makePassword("123123");

  const firstNames = [
    "Alice", "Brian", "Chloe", "Daniel", "Emma",
    "Felix", "Grace", "Hannah", "Isaac", "Julia",
    "Kevin", "Lily", "Mason", "Natalie", "Owen",
    "Priya", "Quinn", "Rachel", "Samuel", "Tina",
  ];

  const lastNames = [
    "Chen", "Wong", "Patel", "Lee", "Singh",
    "Martin", "Garcia", "Nguyen", "Khan", "Kim",
    "Brown", "Wilson", "Taylor", "Lopez", "Hall",
    "Scott", "Young", "Allen", "King", "Wright",
  ];

  const businessNames = [
    "Maple Dental Group",
    "Downtown Smile Clinic",
    "Lakeside Dental Care",
    "North York Hygiene Centre",
    "Queen Street Dental",
    "Harbourview Oral Health",
    "Scarborough Family Dental",
    "Midtown Hygiene Studio",
    "Oakville Dental Partners",
    "Markham Smile Hub",
  ];

  const ownerNames = [
    "Sofia Patel",
    "Michael Wong",
    "Daniel Kim",
    "Amelia Chen",
    "Nadia Singh",
    "Ethan Brown",
    "Priya Shah",
    "Olivia Martin",
    "Jason Lee",
    "Maya Ahmed",
  ];

  const positionTypeSeeds = [
    {
      name: "Dental Hygienist",
      description: "Performs preventive oral care, cleanings, and patient education.",
      hidden: false,
    },
    {
      name: "Dental Assistant",
      description: "Supports dentists during procedures and prepares treatment rooms.",
      hidden: false,
    },
    {
      name: "Receptionist",
      description: "Handles front desk operations, appointment booking, and patient intake.",
      hidden: false,
    },
    {
      name: "Sterilization Technician",
      description: "Responsible for cleaning, packaging, and sterilizing instruments.",
      hidden: false,
    },
    {
      name: "Office Administrator",
      description: "Coordinates clinic administration, scheduling, and office processes.",
      hidden: false,
    },
    {
      name: "Treatment Coordinator",
      description: "Explains treatment plans and helps patients understand next steps.",
      hidden: false,
    },
    {
      name: "Floater Assistant",
      description: "Provides flexible support across multiple operatories and tasks.",
      hidden: false,
    },
    {
      name: "Patient Care Coordinator",
      description: "Supports patient communication and clinic flow throughout the day.",
      hidden: false,
    },
    {
      name: "Evening Assistant",
      description: "Supports late-day appointments and closing tasks.",
      hidden: false,
    },
    {
      name: "Weekend Relief Hygienist",
      description: "Provides temporary weekend hygiene coverage.",
      hidden: false,
    },
  ];

  const positionTypes = [];
  for (let i = 0; i < POSITION_TYPE_COUNT; i += 1) {
    const created = await prisma.positionType.create({
      data: positionTypeSeeds[i],
    });
    positionTypes.push(created);
  }

  const regulars = [];
  for (let i = 1; i <= REGULAR_COUNT; i += 1) {
    const account = await prisma.account.create({
      data: {
        email: `regular${i}@csc309.utoronto.ca`,
        password: seededPassword,
        role: Role.regular,
        activated: true,
      },
    });

    const profile = await prisma.regularProfile.create({
      data: {
        id: account.id,
        first_name: firstNames[i - 1],
        last_name: lastNames[i - 1],
        phone_number: `416-555-${String(1000 + i).padStart(4, "0")}`,
        postal_address: `${100 + i} College Street, Toronto, ON`,
        birthday: `199${i % 10}-0${(i % 9) + 1}-1${i % 9}`,
        suspended: i === 20,
        biography: `Seeded regular worker ${i} with temporary staffing experience.`,
        available: true,
        lastActiveAt: daysFromNow(-(i % 5))
      },
    });

    regulars.push({ account, profile });
  }

  const businesses = [];
  for (let i = 1; i <= BUSINESS_COUNT; i += 1) {
    const account = await prisma.account.create({
      data: {
        email: `business${i}@csc309.utoronto.ca`,
        password: seededPassword,
        role: Role.business,
        activated: true,
      },
    });

    const profile = await prisma.businessProfile.create({
      data: {
        id: account.id,
        business_name: businessNames[i - 1],
        owner_name: ownerNames[i - 1],
        phone_number: `647-555-${String(2000 + i).padStart(4, "0")}`,
        postal_address: `${200 + i} Bay Street, Toronto, ON`,
        location: {
          lat: 43.65 + i * 0.01,
          lon: -79.38 - i * 0.01,
        },
        verified: i <= 8,
        biography: `${businessNames[i - 1]} is a seeded dental business profile used for testing staffing workflows.`
      },
    });

    businesses.push({ account, profile });
  }

  const admins = [];
  for (let i = 1; i <= ADMIN_COUNT; i += 1) {
    const account = await prisma.account.create({
      data: {
        email: `admin${i}@csc309.utoronto.ca`,
        password: seededPassword,
        role: Role.admin,
        activated: true,
      },
    });

    const profile = await prisma.adminProfile.create({
      data: {
        id: account.id,
        utorid: `adminseed${i}`,
      },
    });

    admins.push({ account, profile });
  }

  // Optional reset token demo data
  for (let i = 1; i <= 3; i += 1) {
    await prisma.resetToken.create({
      data: {
        token: `seed-reset-token-${i}`,
        accountId: regulars[i - 1].account.id,
        expiresAt: daysFromNow(7),
        used: false,
      },
    });
  }

  const qualificationStatuses = [
    QualificationStatus.created,
    QualificationStatus.submitted,
    QualificationStatus.approved,
    QualificationStatus.rejected,
    QualificationStatus.revised,
  ];

  const qualifications = [];
  for (let i = 0; i < QUALIFICATION_COUNT; i += 1) {
    const user = regulars[i % REGULAR_COUNT].profile;
    const positionType = positionTypes[i % POSITION_TYPE_COUNT];
    const status = qualificationStatuses[i % qualificationStatuses.length];

    const qualification = await prisma.qualification.create({
      data: {
        userId: user.id,
        positionTypeId: positionType.id,
        status,
        note: `Seeded qualification for ${positionType.name}.`,
        document: null,
      },
    });

    qualifications.push(qualification);
  }

  const jobs = [];
  for (let i = 0; i < JOB_COUNT; i += 1) {
    const business = businesses[i % BUSINESS_COUNT].profile;
    const positionType = positionTypes[i % POSITION_TYPE_COUNT];
    const assignedWorker = regulars[(i * 2) % REGULAR_COUNT].profile;

    let status;
    let startTime;
    let endTime;
    let workerId = null;

    if (i < 24) {
      status = JobStatus.open;
      startTime = startTimeNearMaxWindow(i);
      endTime = addHours(startTime, 8);
    } else if (i < 26) {
      status = JobStatus.filled;
      startTime = startTimeNearMaxWindow(i);
      endTime = addHours(startTime, 8);
      workerId = assignedWorker.id;
    } else if (i < 27) {
      status = JobStatus.cancelled;
      startTime = startTimeNearMaxWindow(i);
      endTime = addHours(startTime, 7);
    } else if (i < 28) {
      status = JobStatus.expired;
      startTime = startTimeNearMaxWindow(i);
      endTime = addHours(startTime, 8);
    } else {
      status = JobStatus.completed;
      startTime = startTimeNearMaxWindow(i);
      endTime = addHours(startTime, 8);
      workerId = assignedWorker.id;
    }

    const job = await prisma.job.create({
      data: {
        status,
        note: `Seeded ${status.toLowerCase()} job for ${positionType.name}.`,
        salary_min: 24 + (i % 6) * 2,
        salary_max: 32 + (i % 6) * 2,
        start_time: startTime,
        end_time: endTime,
        businessId: business.id,
        positionTypeId: positionType.id,
        workerId,
      },
    });

    jobs.push(job);
  }

  const qualifiedUsersByPositionType = new Map();

  for (const qualification of qualifications) {
    const countsAsQualified = qualification.status === QualificationStatus.approved

    if (!countsAsQualified) continue;

    if (!qualifiedUsersByPositionType.has(qualification.positionTypeId)) {
      qualifiedUsersByPositionType.set(qualification.positionTypeId, []);
    }

    qualifiedUsersByPositionType.get(qualification.positionTypeId).push(qualification.userId);
  }

  const interests = [];
  const negotiations = [];

  for (let i = 0; i < JOB_COUNT; i += 1) {
    const job = jobs[i];

    const qualifiedUserIds = uniqueArray(
      qualifiedUsersByPositionType.get(job.positionTypeId) || []
    );

    if (qualifiedUserIds.length === 0) {
      continue;
    }

    const userAId = qualifiedUserIds[i % qualifiedUserIds.length];
    const userBId =
      qualifiedUserIds.length > 1
        ? qualifiedUserIds[(i + 1) % qualifiedUserIds.length]
        : qualifiedUserIds[0];

    const userA = regulars.find((regular) => regular.profile.id === userAId)?.profile;
    const userB = regulars.find((regular) => regular.profile.id === userBId)?.profile;

    if (!userA || !userB) {
      continue;
    }

    const interestA = await prisma.interest.create({
      data: {
        jobId: job.id,
        userId: userA.id,
        candidateInterest: true,
        businessInterest:
          job.status === JobStatus.filled || job.status === JobStatus.completed
            ? true
            : i % 2 === 0
            ? true
            : null,
      },
    });
    interests.push(interestA);

    let interestB = null;

    if (userB.id !== userA.id) {
      interestB = await prisma.interest.create({
        data: {
          jobId: job.id,
          userId: userB.id,
          candidateInterest: null,
          businessInterest: true,
        },
      });
      interests.push(interestB);
    }

    const isMutualInterestA = interestA.candidateInterest === true && interestA.businessInterest === true;

    if (isMutualInterestA && job.status === JobStatus.open) {
      const now = new Date();
      const negotiation = await prisma.negotiation.create({
        data: {
          status: NegotiationStatus.active,
          jobId: job.id,
          userId: interestA.userId,
          interestId: interestA.id,
          candidateDecision: i % 2 === 0 ? true : null,
          businessDecision: null,
          expiresAt: new Date(now.getTime() + NEGOTIATION_WINDOW_SECONDS * 1000),
        },
      });
      negotiations.push(negotiation);
    }

    if (isMutualInterestA && (job.status === JobStatus.filled || job.status === JobStatus.completed)) {
      const negotiation = await prisma.negotiation.create({
        data: {
          status: NegotiationStatus.success,
          jobId: job.id,
          userId: interestA.userId,
          interestId: interestA.id,
          candidateDecision: true,
          businessDecision: true,
          expiresAt: daysFromNow(-1),
        },
      });
      negotiations.push(negotiation);
    }

    if (isMutualInterestA && job.status === JobStatus.cancelled) {
      const negotiation = await prisma.negotiation.create({
        data: {
          status: NegotiationStatus.failed,
          jobId: job.id,
          userId: interestA.userId,
          interestId: interestA.id,
          candidateDecision: true,
          businessDecision: false,
          expiresAt: daysFromNow(-2),
        },
      });
      negotiations.push(negotiation);
    }

    if (isMutualInterestA && job.status === JobStatus.expired) {
      const negotiation = await prisma.negotiation.create({
        data: {
          status: NegotiationStatus.expired,
          jobId: job.id,
          userId: interestA.userId,
          interestId: interestA.id,
          candidateDecision: null,
          businessDecision: null,
          expiresAt: daysFromNow(-3),
        },
      });
      negotiations.push(negotiation);
    }
  }

  console.log("Seed complete.");
  console.log(`Admins: ${admins.length}`);
  console.log(`Regular users: ${regulars.length}`);
  console.log(`Businesses: ${businesses.length}`);
  console.log(`Position types: ${positionTypes.length}`);
  console.log(`Qualifications: ${qualifications.length}`);
  console.log(`Jobs: ${jobs.length}`);
  console.log(`Interests: ${interests.length}`);
  console.log(`Negotiations: ${negotiations.length}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
