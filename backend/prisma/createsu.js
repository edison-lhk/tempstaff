/*
 * Complete this script so that it is able to add a superuser to the database
 * Usage example: 
 *   node prisma/createsu.js clive123 clive.su@mail.utoronto.ca SuperUser123!
 */
'use strict';

const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { isNonEmptyString, isValidEmail, isValidPassword } = require("../src/utils/validators");
const { Roles } = require("../src/utils/enums");

const prisma = new PrismaClient();

const main = async () => {
    const args = process.argv.slice(2);
    if (args.length !== 3) {
        console.error("usage: node prisma/createsu.js <utorid> <email> <password>");
        process.exit(1);
    }

    const [utoridRaw, emailRaw, passwordRaw] = args;
    const utorid = utoridRaw.trim();
    const email = emailRaw.trim();
    const password = passwordRaw;

    if (!isNonEmptyString(utorid)) {
        console.error("error: utorid must be a non-empty string.");
        process.exit(1);
    }
    if (!isValidEmail(email)) {
        console.error("error: email must be a valid email address.");
        process.exit(1);
    }
    if (!isValidPassword(password)) {
        console.error("error: password must be 8-20 chars and include uppercase, lowercase, number, and special character.");
        process.exit(1);
    }

    const existingEmail = await prisma.account.findUnique({ where: { email } });
    if (existingEmail) {
        console.error("error: an account with that email already exists.");
        process.exit(1);
    }

    const existingUtorid = await prisma.adminProfile.findUnique({ where: { utorid } });
    if (existingUtorid) {
        console.error("error: an admin with that utorid already exists.");
        rocess.exit(1);
    }

    const hashed = await bcrypt.hash(password, 10);

    const created = await prisma.account.create({
        data: {
            email,
            password: hashed,
            role: Roles.Admin,
            activated: true,
            admin: {
                create: { utorid },
            },
        },
        include: {
            admin: { select: { utorid: true } },
        },
    });

    console.log(JSON.stringify({ id: created.id, utorid: created.admin.utorid, email: created.email, role: created.role, activated: created.activated, createdAt: created.createdAt.toISOString() }));
};

main()
  .catch((err) => {
    console.error("error:", err?.message ?? err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
