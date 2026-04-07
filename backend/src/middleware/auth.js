'use strict';

const { expressjwt: jwt } = require("express-jwt");
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "shhhhhhared-secret";

const auth = ({ any = false, roles = [] } = {}) => {
    return [
        jwt({
            secret: JWT_SECRET,
            algorithms: ["HS256"],
            credentialsRequired: !any
        }),
        async (req, res, next) => {
            if (!req.auth || !req.auth.id) { 
                req.account = null;
                if (any) return next();
                return res.status(401).json({ error: "Unauthorized" });
            }

            const accountId = Number(req.auth.id);
            if (!Number.isInteger(accountId)) {
                req.account = null;
                if (any) return next();
                return res.status(401).json({ error: "Unauthorized" });
            }

            const account = await prisma.account.findUnique({
                where: { id: accountId },
                select: {
                    id: true,
                    role: true,
                    activated: true,
                    regular: { select: { suspended: true } },
                    business: { select: { verified: true } },
                },
            });

            if (!account) {
                req.account = null;
                if (any) return next();
                return res.status(401).json({ error: "Account not found" });
            }

            req.account = account;

            if (roles.length > 0 && !roles.includes(account.role)) {
                if (any) return next();
                return res.status(403).json({ error: "Forbidden: insufficient permissions" });
            }

            next();
        }
    ];
};

module.exports = { auth, JWT_SECRET };