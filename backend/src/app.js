'use strict';

const express = require("express");
const cors = require('cors');
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require("@prisma/client");
const { auth, JWT_SECRET } = require("./middleware/auth");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { getIo } = require('./io');
const {
  isNonEmptyString,
  isValidEmail,
  isValidPassword,
  isValidBirthday,
  isValidStrBool,
  parseBool,
  validateAllowedFields,
  pathToRegex
} = require("./utils/validators");
const { Roles, QualificationStatus } = require("./utils/enums");

dotenv.config();
const prisma = new PrismaClient();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

let RESET_COOLDOWN_SECONDS = 1;
let NEGOTIATION_WINDOW_SECONDS = 15 * 60;
let JOB_START_WINDOW_HOURS = 7 * 24;
let AVAILABILITY_TIMEOUT_SECONDS = 5 * 60;

const authResetsLastRequestMsByIp = new Map();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const role = req.account.role;
        const folder = role === Roles.Regular ? "users" : "businesses";
        let upload_path;

        if (req.url.includes("document")) {
            const qualificationId = req.params.qualificationId;
            upload_path = path.join(__dirname, "uploads", folder, `${req.account.id}`, "qualifications", `${qualificationId}`);
        } else {
            upload_path = path.join(__dirname, "uploads", folder, `${req.account.id}`);
        }
        fs.mkdirSync(upload_path, { recursive: true });
        cb(null, upload_path);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        if (req.url.includes("resume")) {
            cb(null, `resume${ext}`);
        } else if (req.url.includes("document")) {
            cb(null, `document${ext}`);
        } else {
            cb(null, `avatar${ext}`);
        }
    },
});

const upload = multer({ storage });

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371.2;
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
}

function create_app(io = null) {
    const app = express();
    app.use(express.json());
    app.use(cors({
        origin: FRONTEND_URL,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }));

    app.set('trust proxy', true);

    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    const allowedEndpoints = {
        "/users": ["POST", "GET"],
        "/users/me": ["GET", "PATCH"],
        "/users/me/available": ["PATCH"],
        "/users/me/avatar": ["PUT"],
        "/users/me/resume": ["PUT"],
        "/users/me/invitations": ["GET"],
        "/users/me/interests": ["GET"],
        "/users/me/qualifications": ["GET"],
        "/users/me/jobs": ["GET"],
        "/users/:userId/suspended": ["PATCH"],
        "/businesses": ["POST", "GET"],
        "/businesses/me": ["GET", "PATCH"],
        "/businesses/me/avatar": ["PUT"],
        "/businesses/me/jobs": ["POST", "GET"],
        "/businesses/me/jobs/:jobId": ["PATCH", "DELETE"],
        "/businesses/:businessId/verified": ["PATCH"],
        "/businesses/:businessId": ["GET"],
        "/auth/resets": ["POST"],
        "/auth/resets/:resetToken": ["POST"],
        "/auth/tokens": ["POST"],
        "/position-types": ["POST", "GET"],
        "/position-types/:positionTypeId": ["PATCH", "DELETE"],
        "/qualifications": ["GET", "POST"],
        "/qualifications/:qualificationId/document": ["PUT"],
        "/qualifications/:qualificationId": ["GET", "PATCH"],
        "/system/reset-cooldown": ["PATCH"],
        "/system/negotiation-window": ["PATCH"],
        "/system/job-start-window": ["PATCH"],
        "/system/availability-timeout": ["PATCH"],
        "/jobs": ["GET"],
        "/jobs/:jobId/no-show": ["PATCH"],
        "/jobs/:jobId/interested": ["PATCH"],
        "/jobs/:jobId/candidates": ["GET"],
        "/jobs/:jobId/candidates/:userId/interested": ["PATCH"],
        "/jobs/:jobId/candidates/:userId": ["GET"],
        "/jobs/:jobId/interests": ["GET"],
        "/jobs/:jobId": ["GET"],
        "/negotiations": ["POST"],
        "/negotiations/me": ["GET"],
        "/negotiations/me/decision": ["PATCH"]
    };

    // TODO: add routes here
    app.post("/users", async (req, res) => {
        const error = validateAllowedFields(req.body, ["first_name", "last_name", "email", "password", "phone_number", "postal_address", "birthday"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const { first_name, last_name, email, password, phone_number, postal_address, birthday } = req.body;

        if (!isNonEmptyString(first_name) || !isNonEmptyString(last_name)) {
            return res.status(400).json({ error: 'Missing or invalid name' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Missing or invalid email' });
        }
        if (!isValidPassword(password)) {
            return res.status(400).json({ error: 'Missing or invalid password' });
        }
        if (phone_number !== undefined && typeof phone_number !== 'string') {
            return res.status(400).json({ error: 'Invalid phone_number' });
        }
        if (postal_address !== undefined && typeof postal_address !== 'string') {
            return res.status(400).json({ error: 'Invalid postal_address' });
        }
        if (birthday !== undefined && !isValidBirthday(birthday)) {
            return res.status(400).json({ error: 'Invalid birthday' });
        }

        const existing = await prisma.account.findUnique({ where: { email: email.trim() }, select: { id: true } });
        if (existing) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        const resetToken = uuidv4();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const created = await prisma.account.create({
            data: {
                email: email.trim(),
                password: await bcrypt.hash(password, 10),
                role: Roles.Regular,
                activated: false,
                regular: {
                    create: {
                        first_name: first_name.trim(),
                        last_name: last_name.trim(),
                        phone_number: phone_number ?? '',
                        postal_address: postal_address ?? '',
                        birthday: birthday ?? '1970-01-01',
                    }
                },
                resetTokens: {
                    create: {
                        token: resetToken,
                        expiresAt,
                    }
                },
            },
            include: {
                regular: true,
                resetTokens: {
                    where: { token: resetToken },
                    select: { token: true, expiresAt: true },
                },
            },
        });

        return res.status(201).json({
            id: created.id,
            first_name: created.regular.first_name,
            last_name: created.regular.last_name,
            email: created.email,
            activated: created.activated,
            role: created.role,
            phone_number: created.regular.phone_number,
            postal_address: created.regular.postal_address,
            birthday: created.regular.birthday,
            createdAt: created.createdAt.toISOString(),
            resetToken: created.resetTokens[0].token,
            expiresAt: created.resetTokens[0].expiresAt.toISOString(),
        });
    });

    app.get("/users", auth({ roles: [Roles.Admin] }), async (req, res) => {
        const error = validateAllowedFields(req.query, ["keyword", "activated", "suspended", "page", "limit"], false);
        if (error) {
            return res.status(400).json({ error });
        }

        const { keyword, activated, suspended, page = "1", limit = "10" } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        if (!Number.isInteger(pageNum) || pageNum < 1) {
            return res.status(400).json({ error: "Invalid page" });
        }
        if (!Number.isInteger(limitNum) || limitNum < 1) {
            return res.status(400).json({ error: "Invalid limit" });
        }

        if (activated !== undefined && !isValidStrBool(activated)) {
            return res.status(400).json({ error: "Invalid activated" });
        }
        if (suspended !== undefined && !isValidStrBool(suspended)) {
            return res.status(400).json({ error: "Invalid suspended" });
        }

        const activatedBool = parseBool(activated);
        const suspendedBool = parseBool(suspended);

        const where = {};

        if (keyword !== undefined) {
            if (typeof keyword !== "string") {
                return res.status(400).json({ error: "Invalid keyword" });
            }

            where.OR = [
                { first_name: { contains: keyword } },
                { last_name: { contains: keyword } },
                { phone_number: { contains: keyword } },
                { postal_address: { contains: keyword } },
                { account: { email: { contains: keyword } } },
            ];
        }

        if (activated !== undefined) {
            where.account = { activated: activatedBool };
        }
        if (suspended !== undefined) {
            where.suspended = suspendedBool;
        }

        const [count, users] = await Promise.all([
            prisma.regularProfile.count({ where }),
            prisma.regularProfile.findMany({
                where,
                include: { account: { select: { email: true, activated: true } } },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
        ]);

        const results = users.map(user => ({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.account.email,
            activated: user.account.activated,
            suspended: user.suspended,
            role: Roles.Regular,
            phone_number: user.phone_number,
            postal_address: user.postal_address,
            avatar: user.avatar
        }));

        return res.status(200).json({ count, results });
    });

    app.get("/users/me", auth({ roles: [Roles.Regular] }), async (req, res) => {
        const account = await prisma.account.findUnique({
            where: { id: req.account.id },
            select: {
                id: true,
                email: true,
                activated: true,
                role: true,
                createdAt: true,
                regular: {
                    select: {
                        first_name: true,
                        last_name: true,
                        phone_number: true,
                        postal_address: true,
                        birthday: true,
                        suspended: true,
                        avatar: true,
                        resume: true,
                        biography: true,
                        available: true,
                        lastActiveAt: true,
                    },
                },
            },
        });

        if (!account || !account.regular) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        let available = account.regular.available;

        const now = Date.now();
        const lastActiveMs = new Date(account.regular.lastActiveAt).getTime();

        if (now - lastActiveMs > AVAILABILITY_TIMEOUT_SECONDS * 1000) {
            available = false;
        }

        return res.status(200).json({
            id: account.id,
            first_name: account.regular.first_name,
            last_name: account.regular.last_name,
            email: account.email,
            activated: account.activated,
            suspended: account.regular.suspended,
            available,
            role: account.role,
            phone_number: account.regular.phone_number,
            postal_address: account.regular.postal_address,
            birthday: account.regular.birthday,
            createdAt: account.createdAt.toISOString(),
            avatar: account.regular.avatar,
            resume: account.regular.resume,
            biography: account.regular.biography,
        });
    });

    app.patch("/users/me", auth({ roles: [Roles.Regular] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["first_name", "last_name", "phone_number", "postal_address", "birthday", "avatar", "biography"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const { first_name, last_name, phone_number, postal_address, birthday, avatar, biography } = req.body;

        const data = { id: req.account.id };

        if (first_name !== undefined) {
            if (!isNonEmptyString(first_name)) {
                return res.status(400).json({ error: "Invalid first_name" });
            }

            data.first_name = first_name;
        }
        if (last_name !== undefined) {
            if (!isNonEmptyString(last_name)) {
                return res.status(400).json({ error: "Invalid last_name" });
            }

            data.last_name = last_name;
        }
        if (phone_number !== undefined) {
            if (typeof phone_number !== 'string') {
                return res.status(400).json({ error: "Invalid phone_number" });
            }

            data.phone_number = phone_number;
        }
        if (postal_address !== undefined) {
            if (typeof postal_address !== 'string') {
                return res.status(400).json({ error: "Invalid postal_address" });
            }

            data.postal_address = postal_address;
        }
        if (birthday !== undefined) {
            if (!isValidBirthday(birthday)) {
                return res.status(400).json({ error: "Invalid birthday" });
            }

            data.birthday = birthday;
        }
        if (avatar !== undefined) {
            if (avatar !== null && typeof avatar !== 'string') {
                return res.status(400).json({ error: "Invalid avatar" });
            }

            data.avatar = avatar;
        }
        if (biography !== undefined) {
            if (typeof biography !== 'string') {
                return res.status(400).json({ error: "Invalid biography" });
            }

            data.biography = biography;
        }

        await prisma.regularProfile.update({ where: { id: req.account.id }, data });

        return res.status(200).json(data);
    });

    app.patch("/users/me/available", auth({ roles: [Roles.Regular] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["available"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const { available } = req.body;
        if (typeof available !== 'boolean') {
            return res.status(400).json({ error: "Invalid available" });
        }

        const data = { available };

        if (available) {
            const regular = await prisma.regularProfile.findUnique({
                where: { id: req.account.id },
                select: { suspended: true }
            });

            if (!regular) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            if (regular.suspended) {
                return res.status(400).json({ error: "Suspended users cannot set available" });
            }

            const approvedCount = await prisma.qualification.count({ where: { userId: req.account.id, status: QualificationStatus.Approved } });

            if (approvedCount === 0) {
                return res.status(400).json({ error: "No approved qualifications" });
            }

            data.lastActiveAt = new Date();
        }

        await prisma.regularProfile.update({ where: { id: req.account.id }, data });

        return res.status(200).json({ available });
    });

    app.put("/users/me/avatar", auth({ roles: [Roles.Regular] }), upload.single("file"), async (req, res) => {
        try {
            const allowedMimeTypes = ["image/jpeg", "image/png"];

            if (!allowedMimeTypes.includes(req.file.mimetype)) {
                return res.status(400).json({ error: "Invalid file type. Please upload an image (JPG, PNG)" });
            }

            const file_path = req.file.path.replace(__dirname, "").replace(/\\/g, "/");
            const data = { avatar: file_path };

            await prisma.regularProfile.update({ where: { id: req.account.id }, data });

            return res.status(200).json({ avatar: file_path });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    });

    app.put("/users/me/resume", auth({ roles: [Roles.Regular] }), upload.single("file"), async (req, res) => {
        try {
            if (req.file.mimetype !== "application/pdf") {
                return res.status(400).json({ error: "Invalid file type. Only PDF documents are allowed" });
            }

            const file_path = req.file.path.replace(__dirname, "").replace(/\\/g, "/");
            const data = { resume: file_path };
                
            await prisma.regularProfile.update({ where: { id: req.account.id }, data });
            
            return res.status(200).json({ resume: file_path });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    });

    app.get("/users/me/invitations", auth({ roles: [Roles.Regular] }), async (req, res) => {
        const error = validateAllowedFields(req.query, ["page", "limit"], false);
        if (error) {
            return res.status(400).json({ error });
        }
    
        const { page = "1", limit = "10" } = req.query;
    
        const pageNum = Number(page);
        const limitNum = Number(limit);
        if (!Number.isInteger(pageNum) || pageNum < 1) {
            return res.status(400).json({ error: "Invalid page" });
        }
        if (!Number.isInteger(limitNum) || limitNum < 1) {
            return res.status(400).json({ error: "Invalid limit" });
        }
    
        const now = new Date();
        const negotiationCutoff = new Date(now.getTime() + NEGOTIATION_WINDOW_SECONDS * 1000);
        const where = {
            userId: req.account.id,
            businessInterest: true,
            OR: [
                { candidateInterest: false },
                { candidateInterest: null }
            ],
            job: {
                status: "open",
                start_time: { gt: negotiationCutoff },
            },
        };
    
        const [count, interests] = await Promise.all([
            prisma.interest.count({ where }),
            prisma.interest.findMany({
                where,
                orderBy: { updatedAt: "desc" },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
                select: {
                    job: {
                        select: {
                            id: true,
                            status: true,
                            salary_min: true,
                            salary_max: true,
                            start_time: true,
                            end_time: true,
                            updatedAt: true,
                            positionType: {
                                select: { id: true, name: true },
                            },
                            business: {
                                select: { id: true, business_name: true },
                            },
                        },
                    },
                },
            }),
        ]);
    
        const results = interests.map(({ job }) => ({
            id: job.id,
            status: job.status,
            position_type: job.positionType,
            business: {
                id: job.business.id,
                business_name: job.business.business_name,
            },
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            start_time: job.start_time.toISOString(),
            end_time: job.end_time.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
        }));
    
        return res.status(200).json({ count, results });
    });

    app.get("/users/me/interests", auth({ roles: [Roles.Regular] }), async (req, res) => {
        const error = validateAllowedFields(req.query, ["page", "limit"], false);
        if (error) {
            return res.status(400).json({ error });
        }
    
        const { page = "1", limit = "10" } = req.query;
    
        const pageNum = Number(page);
        const limitNum = Number(limit);
        if (!Number.isInteger(pageNum) || pageNum < 1) {
            return res.status(400).json({ error: "Invalid page" });
        }
        if (!Number.isInteger(limitNum) || limitNum < 1) {
            return res.status(400).json({ error: "Invalid limit" });
        }
    
        const now = new Date();
        const negotiationCutoff = new Date(now.getTime() + NEGOTIATION_WINDOW_SECONDS * 1000);
    
        const where = {
            userId: req.account.id,
            candidateInterest: true,
            job: {
                status: "open",
                start_time: { gt: negotiationCutoff },
            },
        };
    
        const [count, interests] = await Promise.all([
            prisma.interest.count({ where }),
            prisma.interest.findMany({
                where,
                orderBy: { updatedAt: "desc" },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
                select: {
                    id: true,
                    candidateInterest: true,
                    businessInterest: true,
                    job: {
                        select: {
                            id: true,
                            status: true,
                            salary_min: true,
                            salary_max: true,
                            start_time: true,
                            end_time: true,
                            updatedAt: true,
                            positionType: {
                                select: { id: true, name: true },
                            },
                            business: {
                                select: { id: true, business_name: true },
                            },
                        },
                    },
                },
            }),
        ]);
    
        const results = interests.map((interest) => ({
            interest_id: interest.id,
            mutual: interest.candidateInterest === true && interest.businessInterest === true,
            job: {
                id: interest.job.id,
                status: interest.job.status,
                position_type: interest.job.positionType,
                business: {
                    id: interest.job.business.id,
                    business_name: interest.job.business.business_name,
                },
                salary_min: interest.job.salary_min,
                salary_max: interest.job.salary_max,
                start_time: interest.job.start_time.toISOString(),
                end_time: interest.job.end_time.toISOString(),
                updatedAt: interest.job.updatedAt.toISOString(),
            },
        }));
    
        return res.status(200).json({ count, results });
    });

    app.get("/users/me/qualifications", auth({ roles: [Roles.Regular] }), async (req, res) => {
        const { page = "1", limit = "10" } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);

        if (!Number.isInteger(pageNum) || pageNum < 1) {
            return res.status(400).json({ error: "Invalid page" });
        }

        if (!Number.isInteger(limitNum) || limitNum < 1) {
            return res.status(400).json({ error: "Invalid limit" });
        }

        const where = {
            userId: req.account.id,
        };

        const count = await prisma.qualification.count({ where });

        const results = await prisma.qualification.findMany({
            where,
            include: {
                positionType: true,
            },
            orderBy: {
                updatedAt: "desc",
            },
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
        });

        return res.json({ count, results });
    });

    app.get("/users/me/jobs", auth({ roles: [Roles.Regular] }), async (req, res) => {
        const { page = "1", limit = "10" } = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
    
        const jobs = await prisma.job.findMany({
            where: { workerId: req.account.id },
            orderBy: { start_time: "desc" },
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            select: {
                id: true,
                status: true,
                salary_min: true,
                salary_max: true,
                start_time: true,
                end_time: true,
                updatedAt: true,
                positionType: { select: { id: true, name: true } },
                business: { select: { id: true, business_name: true } },
            },
        });
    
        const count = await prisma.job.count({ where: { workerId: req.account.id } });
    
        return res.status(200).json({
            count,
            results: jobs.map(job => ({
                id: job.id,
                status: job.status,
                position_type: job.positionType,
                business: job.business,
                salary_min: job.salary_min,
                salary_max: job.salary_max,
                start_time: job.start_time.toISOString(),
                end_time: job.end_time.toISOString(),
                updatedAt: job.updatedAt.toISOString(),
            })),
        });
    });

    app.patch("/users/:userId(\\d+)/suspended", auth({ roles: [Roles.Admin] }), async(req, res) => {
        const error = validateAllowedFields(req.body, ["suspended"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const { suspended } = req.body;

        const userId = parseInt(req.params.userId);
        if (isNaN(userId) || userId < 1) {
            return res.status(400).json({ error: "Invalid userId" });
        }

        if (typeof suspended !== 'boolean') {
            return res.status(400).json({ error: "Invalid suspended value" });
        }

        const existing = await prisma.regularProfile.findUnique({ where: { id: userId } });
        if (!existing) {
            return res.status(404).json({ error: "User not found" });
        }

        const updated = await prisma.regularProfile.update({
            where: { id: userId },
            data: { suspended },
            include: {
                account: {
                    select: { email: true, activated: true }
                }
            }
        });

        return res.status(200).json({
            id: updated.id,
            first_name: updated.first_name,
            last_name: updated.last_name,
            email: updated.account.email,
            activated: updated.account.activated,
            suspended: updated.suspended,
            role: Roles.Regular,
            phone_number: updated.phone_number,
            postal_address: updated.postal_address
        });
    });

    app.post("/businesses", async (req, res) => {
        const error = validateAllowedFields(req.body, ["business_name", "owner_name", "email", "password", "phone_number", "postal_address", "location"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const { business_name, owner_name, email, password, phone_number, postal_address, location } = req.body;

        if (!isNonEmptyString(business_name)) {
            return res.status(400).json({ error: "Missing or invalid business_name" });
        }
        if (!isNonEmptyString(owner_name)) {
            return res.status(400).json({ error: "Missing or invalid owner_name" });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: "Missing or invalid email" });
        }
        if (!isValidPassword(password)) {
            return res.status(400).json({ error: "Missing or invalid password" });
        }
        if (!isNonEmptyString(phone_number)) {
            return res.status(400).json({ error: "Missing or invalid phone_number" });
        }
        if (!isNonEmptyString(postal_address)) {
            return res.status(400).json({ error: "Missing or invalid postal_address" });
        }
        if (!location || typeof location !== "object" || Array.isArray(location)) {
            return res.status(400).json({ error: "Missing or invalid location" });
        }

        const { lon, lat } = location;
        if (typeof lon !== "number" || typeof lat !== "number" || Number.isNaN(lon) || Number.isNaN(lat)) {
            return res.status(400).json({ error: "Missing or invalid location.lon/lat" });
        }

        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return res.status(400).json({ error: "location out of range" });
        }

        const existing = await prisma.account.findUnique({ where: { email: email.trim() }, select: { id: true } });
        if (existing) {
            return res.status(409).json({ error: "Email already exists" });
        }

        const resetToken = uuidv4();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const created = await prisma.account.create({
            data: {
                email: email.trim(),
                password: await bcrypt.hash(password, 10),
                role: Roles.Business,
                activated: false,
                business: {
                    create: {
                        business_name: business_name.trim(),
                        owner_name: owner_name.trim(),
                        phone_number: phone_number.trim(),
                        postal_address: postal_address.trim(),
                        location: { lon, lat },
                        verified: false,
                    },
                },
                resetTokens: {
                    create: { 
                        token: resetToken, 
                        expiresAt,
                    }
                },
            },
            include: {
                business: true,
                resetTokens: {
                    where: { token: resetToken },
                    select: { token: true, expiresAt: true },
                },
            },
        });

        return res.status(201).json({
            id: created.id,
            business_name: created.business.business_name,
            owner_name: created.business.owner_name,
            email: created.email,
            activated: created.activated,
            verified: created.business.verified,
            role: created.role,
            phone_number: created.business.phone_number,
            postal_address: created.business.postal_address,
            location: created.business.location,
            createdAt: created.createdAt.toISOString(),
            resetToken: created.resetTokens[0].token,
            expiresAt: created.resetTokens[0].expiresAt.toISOString(),
        });
    });

    app.get("/businesses", auth({ any: true, roles: [Roles.Admin] }), async (req, res) => {
        const error = validateAllowedFields(req.query, ["keyword", "activated", "verified", "sort", "order", "page", "limit"], false);
        if (error) {
            return res.status(400).json({ error });
        }

        const isAdmin = req.account?.role === Roles.Admin;

        const { keyword, activated, verified, sort, order = "asc", page = "1", limit = "10" } = req.query;

        if (!isAdmin) {
            if (activated !== undefined || verified !== undefined || sort === 'owner_name') {
                return res.status(400).json({ error: "Admin-only query fields" });
            }
        }

        if (sort !== undefined && !["business_name", "email", "owner_name"].includes(sort)) {
            return res.status(400).json({ error: "Invalid sort" });
        }

        if (order !== "asc" && order !== "desc") {
            return res.status(400).json({ error: "Invalid order" });
        }

        const pageNum = Number(page);
        const limitNum = Number(limit);
        if (!Number.isInteger(pageNum) || pageNum < 1) {
            return res.status(400).json({ error: "Invalid page" });
        }
        if (!Number.isInteger(limitNum) || limitNum < 1) {
            return res.status(400).json({ error: "Invalid limit" });
        }

        if (activated !== undefined && !isValidStrBool(activated)) {
            return res.status(400).json({ error: "Invalid activated" });
        }
        if (verified !== undefined && !isValidStrBool(verified)) {
            return res.status(400).json({ error: "Invalid verified" });
        }

        const activatedBool = parseBool(activated);
        const verifiedBool = parseBool(verified);

        const where = {};

        if (keyword !== undefined) {
            if (typeof keyword !== "string") {
                return res.status(400).json({ error: "Invalid keyword" });
            }
            where.OR = [
                { business_name: { contains: keyword } },
                { phone_number: { contains: keyword } },
                { postal_address: { contains: keyword } },
                { account: { email: { contains: keyword } } },
                ...(isAdmin ? [{ owner_name: { contains: keyword } }] : []),
            ];
        }

        if (isAdmin) {
            if (activatedBool !== undefined) {
                where.account = { activated: activatedBool };
            }
            if (verifiedBool !== undefined) {
                where.verified = verifiedBool;
            }
        } else {
            where.account = { activated: true };
            where.verified = true;
        }

        let orderBy = undefined;
        if (sort !== undefined) {
            if (sort === "email") {
                orderBy = { account: { email: order } };
            } else if (sort === "business_name") {
                orderBy = { business_name: order };
            } else if (sort === "owner_name") {
                orderBy = { owner_name: order };
            }
        }

        const [count, businesses] = await Promise.all([
            prisma.businessProfile.count({ where }),
            prisma.businessProfile.findMany({
                where,
                include: { account: { select: { email: true, activated: true } } },
                orderBy,
                skip: (pageNum - 1) * limitNum,
                take: limitNum
            })
        ]);

        const results = businesses.map(business => {
            const result = {
                id: business.id,
                business_name: business.business_name,
                email: business.account.email,
                role: Roles.Business,
                phone_number: business.phone_number,
                postal_address: business.postal_address,
                location: business.location,
                avatar: business.avatar,
                biography: business.biography
            };

            if (isAdmin) {
                result.owner_name = business.owner_name;
                result.verified = business.verified;
                result.activated = business.account.activated;
            }

            return result;
        });

        return res.status(200).json({ count, results });
    });

    app.get("/businesses/me", auth({ roles: [Roles.Business] }), async (req, res) => {
        const account = await prisma.account.findUnique({
            where: { id: req.account.id },
            select: {
                id: true,
                email: true,
                role: true,
                activated: true,
                createdAt: true,
                business: {
                    select: {
                        business_name: true,
                        owner_name: true,
                        phone_number: true,
                        postal_address: true,
                        location: true,
                        avatar: true,
                        biography: true,
                        verified: true
                    }
                }
            }
        });

        if (!account || !account.business) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        return res.status(200).json({
            id: account.id,
            business_name: account.business.business_name,
            email: account.email,
            role: account.role,
            owner_name: account.business.owner_name,
            phone_number: account.business.phone_number,
            postal_address: account.business.postal_address,
            location: account.business.location,
            avatar: account.business.avatar,
            biography: account.business.biography,
            activated: account.activated,
            verified: account.business.verified,
            createdAt: account.createdAt.toISOString(),
        });
    });

    app.patch("/businesses/me", auth({ roles: [Roles.Business] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["business_name", "owner_name", "phone_number", "postal_address", "location", "avatar", "biography"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const { business_name, owner_name, phone_number, postal_address, location, avatar, biography } = req.body;

        const data = { id: req.account.id };

        if (business_name !== undefined) {
            if (!isNonEmptyString(business_name)) {
                return res.status(400).json({ error: "Invalid business_name" });
            }

            data.business_name = business_name;
        }
        if (owner_name !== undefined) {
            if (!isNonEmptyString(owner_name)) {
                return res.status(400).json({ error: "Invalid owner_name" });
            }

            data.owner_name = owner_name;
        }
        if (phone_number !== undefined) {
            if (typeof phone_number !== 'string') {
                return res.status(400).json({ error: "Invalid phone_number" });
            }

            data.phone_number = phone_number;
        }
        if (postal_address !== undefined) {
            if (typeof postal_address !== 'string') {
                return res.status(400).json({ error: "Invalid postal_address" });
            }

            data.postal_address = postal_address;
        }
        if (location !== undefined) {
            if (typeof location !== "object" || Array.isArray(location)) {
                return res.status(400).json({ error: "Invalid location" });
            }

            const { lon, lat } = location;
            if (typeof lon !== "number" || typeof lat !== "number" || isNaN(lon) || isNaN(lat)) {
                return res.status(400).json({ error: "Missing or invalid location.lon/lat" });
            }

            data.location = { lon, lat };
        }
        if (avatar !== undefined) {
            if (avatar !== null && typeof avatar !== 'string') {
                return res.status(400).json({ error: "Invalid avatar" });
            }

            data.avatar = avatar;
        }
        if (biography !== undefined) {
            if (typeof biography !== 'string') {
                return res.status(400).json({ error: "Invalid biography" });
            }

            data.biography = biography;
        }

        await prisma.businessProfile.update({ where: { id: req.account.id }, data });

        return res.status(200).json(data);
    });

    app.put("/businesses/me/avatar", auth({ roles: [Roles.Business] }), upload.single("file"), async (req, res) => {
        try {
            const allowedMimeTypes = ["image/jpeg", "image/png"];

            if (!allowedMimeTypes.includes(req.file.mimetype)) {
                return res.status(400).json({ error: "Invalid file type. Please upload an image (JPG, PNG)" });
            }

            const file_path = req.file.path.replace(__dirname, "").replace(/\\/g, "/");
            const data = { avatar: file_path };

            await prisma.businessProfile.update({ where: { id: req.account.id }, data });

            return res.status(200).json({ avatar: file_path });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    });

    app.post("/businesses/me/jobs", auth({ roles: [Roles.Business] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["position_type_id", "salary_min", "salary_max", "start_time", "end_time", "note"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const { position_type_id, salary_min, salary_max, start_time, end_time, note = "" } = req.body;
        if (!Number.isInteger(position_type_id) || position_type_id < 1) {
            return res.status(400).json({ error: "Invalid or missing position_type_id" });
        }
        if (typeof salary_min !== "number" || isNaN(salary_min) || salary_min < 0) {
            return res.status(400).json({ error: "Invalid or missing salary_min" });
        }
        if (typeof salary_max !== "number" || isNaN(salary_max) || salary_max < salary_min) {
            return res.status(400).json({ error: "Invalid or missing salary_max" });
        }
        if (!isNonEmptyString(start_time)) {
            return res.status(400).json({ error: "Invalid or missing start_time" });
        }
        if (!isNonEmptyString(end_time)) {
            return res.status(400).json({ error: "Invalid or missing end_time" });
        }
        if (typeof note !== "string") {
            return res.status(400).json({ error: "Invalid note" });
        }

        const startDate = new Date(start_time);
        const endDate = new Date(end_time);
        if (isNaN(startDate.getTime())) {
            return res.status(400).json({ error: "Invalid start_time format" });
        }
        if (isNaN(endDate.getTime())) {
            return res.status(400).json({ error: "Invalid end_time format" });
        }
        const now = new Date();

        // checks time to not be in the past
        if (startDate <= now) {
            return res.status(400).json({ error: "start_time must be in the future" });
        }
        if (endDate <= now) {
            return res.status(400).json({ error: "end_time must be in the future" });
        }

        if (endDate <= startDate) {
            return res.status(400).json({ error: "end_time must be after start_time" });
        }

        const maxStartTime = new Date(now.getTime() + JOB_START_WINDOW_HOURS * 60 * 60 * 1000);
        if (startDate > maxStartTime) {
            return res.status(400).json({ error: "start_time is too far in the future" });
        }

        const negotiationCutoff = new Date(now.getTime() + NEGOTIATION_WINDOW_SECONDS * 1000);
        if (startDate <= negotiationCutoff) {
            return res.status(400).json({ error: "Not enough time for a negotiation window before start_time" });
        }

        const business = await prisma.businessProfile.findUnique({
            where: { id: req.account.id },
            select: { id: true, business_name: true, verified: true },
        });
        if (!business) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!business.verified) {
            return res.status(403).json({ error: "Business is not verified" });
        }

        const positionType = await prisma.positionType.findUnique({
            where: { id: position_type_id },
            select: { id: true, name: true, hidden: true },
        });
    
        if (!positionType || positionType.hidden) {
            return res.status(400).json({ error: "Position type not found" });
        }

        const created = await prisma.job.create({
            data: {
                status: "open",
                salary_min,
                salary_max,
                start_time: startDate,
                end_time: endDate,
                note,
                businessId: req.account.id,
                positionTypeId: position_type_id,
            },
            select: {
                id: true,
                status: true,
                salary_min: true,
                salary_max: true,
                start_time: true,
                end_time: true,
                note: true,
                updatedAt: true,
                business: {
                    select: { id: true, business_name: true },
                },
                positionType: {
                    select: { id: true, name: true },
                },
            },
        });


        return res.status(201).json({
            id: created.id,
            status: created.status,
            position_type: created.positionType,
            business: created.business,
            worker: null,
            note: created.note,
            salary_min: created.salary_min,
            salary_max: created.salary_max,
            start_time: created.start_time.toISOString(),
            end_time: created.end_time.toISOString(),
            updatedAt: created.updatedAt.toISOString(),
        });

    });

    app.get("/businesses/me/jobs", auth({ roles: [Roles.Business] }), async (req, res) => {
        const error = validateAllowedFields(req.query, [ "position_type_id", "salary_min", "salary_max", "start_time", "end_time", 
            "status", "page", "limit"
        ], false);
        if (error) {
            return res.status(400).json({ error });
        }
    
        const {
            position_type_id,
            salary_min,
            salary_max,
            start_time,
            end_time,
            page = "1",
            limit = "10",
        } = req.query;

        let statusFilter = req.query.status;
        const validStatuses = ["open", "filled", "cancelled", "expired", "completed"];
        const defaultStatuses = ["open", "filled"];
    
        if (statusFilter === undefined) {
            statusFilter = defaultStatuses;
        } else {
            if (!Array.isArray(statusFilter)) {
                statusFilter = [statusFilter];
            }
            for (const s of statusFilter) {
                if (!validStatuses.includes(s)) {
                    return res.status(400).json({ error: `Invalid status value: ${s}` });
                }
            }
        }
    
        const pageNum = Number(page);
        const limitNum = Number(limit);
        if (!Number.isInteger(pageNum) || pageNum < 1) {
            return res.status(400).json({ error: "Invalid page" });
        }
        if (!Number.isInteger(limitNum) || limitNum < 1) {
            return res.status(400).json({ error: "Invalid limit" });
        }
    
        let positionTypeIdNum;
        if (position_type_id !== undefined) {
            positionTypeIdNum = Number(position_type_id);
            if (!Number.isInteger(positionTypeIdNum) || positionTypeIdNum < 1) {
                return res.status(400).json({ error: "Invalid position_type_id" });
            }
        }
    
        let salaryMinNum;
        if (salary_min !== undefined) {
            salaryMinNum = Number(salary_min);
            if (isNaN(salaryMinNum) || salaryMinNum < 0) {
                return res.status(400).json({ error: "Invalid salary_min" });
            }
        }
    
        let salaryMaxNum;
        if (salary_max !== undefined) {
            salaryMaxNum = Number(salary_max);
            if (isNaN(salaryMaxNum) || salaryMaxNum < 0) {
                return res.status(400).json({ error: "Invalid salary_max" });
            }
        }
    
        let startDate;
        if (start_time !== undefined) {
            startDate = new Date(start_time);
            if (isNaN(startDate.getTime())) {
                return res.status(400).json({ error: "Invalid start_time format" });
            }
        }
    
        let endDate;
        if (end_time !== undefined) {
            endDate = new Date(end_time);
            if (isNaN(endDate.getTime())) {
                return res.status(400).json({ error: "Invalid end_time format" });
            }
        }
    
        
        const where = {
            businessId: req.account.id,
            status: { in: statusFilter },
        };
        if (positionTypeIdNum !== undefined) {
            where.positionTypeId = positionTypeIdNum;
        }
        if (salaryMinNum !== undefined) {
            where.salary_min = { gt: salaryMinNum };
        }
        if (salaryMaxNum !== undefined) {
            where.salary_max = { gt: salaryMaxNum };
        }
        if (startDate !== undefined) {
            where.start_time = { gte: startDate };
        }
        if (endDate !== undefined) {
            where.end_time = { lte: endDate };
        }
    
        const [count, jobs] = await Promise.all([
            prisma.job.count({ where }),
            prisma.job.findMany({
                where,
                orderBy: { updatedAt: "desc" },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
                select: {
                    id: true,
                    status: true,
                    salary_min: true,
                    salary_max: true,
                    start_time: true,
                    end_time: true,
                    updatedAt: true,
                    businessId: true,
                    positionType: {
                        select: { id: true, name: true },
                    },
                    worker: {
                        select: { id: true, first_name: true, last_name: true },
                    },
                },
            }),
        ]);
    
        const results = jobs.map(job => ({
            id: job.id,
            status: job.status,
            position_type: job.positionType,
            business_id: job.businessId,
            worker: job.worker ?? null,
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            start_time: job.start_time.toISOString(),
            end_time: job.end_time.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
        }));
    
        return res.status(200).json({ count, results });
    });

    app.patch("/businesses/me/jobs/:jobId(\\d+)", auth({ roles: [Roles.Business] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["salary_min", "salary_max", "start_time", "end_time", "note"]);
        if (error) {
            return res.status(400).json({ error });
        }
    
        const jobId = parseInt(req.params.jobId);
        if (isNaN(jobId) || jobId < 1) {
            return res.status(400).json({ error: "Invalid jobId" });
        }
    
        const { salary_min, salary_max, start_time, end_time, note } = req.body;
    
        if (salary_min !== undefined && (typeof salary_min !== "number" || isNaN(salary_min) || salary_min < 0)) {
            return res.status(400).json({ error: "Invalid salary_min" });
        }
        if (salary_max !== undefined && (typeof salary_max !== "number" || isNaN(salary_max))) {
            return res.status(400).json({ error: "Invalid salary_max" });
        }
        if (note !== undefined && typeof note !== "string") {
            return res.status(400).json({ error: "Invalid note" });
        }
    
        let startDate, endDate;
        if (start_time !== undefined) {
            startDate = new Date(start_time);
            if (isNaN(startDate.getTime())) {
                return res.status(400).json({ error: "Invalid start_time format" });
            }
        }
        if (end_time !== undefined) {
            endDate = new Date(end_time);
            if (isNaN(endDate.getTime())) {
                return res.status(400).json({ error: "Invalid end_time format" });
            }
        }
    
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: {
                id: true,
                status: true,
                businessId: true,
                salary_min: true,
                salary_max: true,
                start_time: true,
                end_time: true,
            },
        });
    
        if (!job || job.businessId !== req.account.id) {
            return res.status(400).json({ error: "Job not found" });
        }
    
        const now = new Date();
        if (job.status !== "open" || job.start_time <= now) {
            return res.status(409).json({ error: "Job is no longer open" });
        }
   
        const start = startDate ?? job.start_time;
        const end = endDate ?? job.end_time;
        const salaryMin = salary_min ?? job.salary_min;
        const salaryMax = salary_max ?? job.salary_max;
        if (end <= start) {
            return res.status(400).json({ error: "end_time must be after start_time" });
        }
        if (salaryMax < salaryMin) {
            return res.status(400).json({ error: "salary_max must be >= salary_min" });
        }
    

        if (startDate !== undefined) {
            if (startDate <= now) {
                return res.status(400).json({ error: "start_time must be in the future" });
            }
            const maxStartTime = new Date(now.getTime() + JOB_START_WINDOW_HOURS * 60 * 60 * 1000);
            if (startDate > maxStartTime) {
                return res.status(400).json({ error: "start_time is too far in the future" });
            }
            const negotiationCutoff = new Date(now.getTime() + NEGOTIATION_WINDOW_SECONDS * 1000);
            if (startDate <= negotiationCutoff) {
                return res.status(400).json({ error: "Not enough time for a negotiation window before start_time" });
            }
        }
        if (endDate !== undefined && endDate <= now) {
            return res.status(400).json({ error: "end_time must be in the future" });
        }

        const data = {};
        if (salary_min !== undefined) data.salary_min = salary_min;
        if (salary_max !== undefined) data.salary_max = salary_max;
        if (startDate !== undefined) data.start_time = startDate;
        if (endDate !== undefined) data.end_time = endDate;
        if (note !== undefined) data.note = note;
    
        const updated = await prisma.job.update({
            where: { id: jobId },
            data,
            select: {
                id: true,
                salary_min: true,
                salary_max: true,
                start_time: true,
                end_time: true,
                note: true,
                updatedAt: true,
            },
        });
    

        const response = {
            id: updated.id,
            updatedAt: updated.updatedAt.toISOString(),
        };
        if (salary_min !== undefined) response.salary_min = updated.salary_min;
        if (salary_max !== undefined) response.salary_max = updated.salary_max;
        if (startDate !== undefined) response.start_time = updated.start_time.toISOString();
        if (endDate !== undefined) response.end_time = updated.end_time.toISOString();
        if (note !== undefined) response.note = updated.note;
    
        return res.status(200).json(response);
    });

    app.delete("/businesses/me/jobs/:jobId(\\d+)", auth({ roles: [Roles.Business] }), async (req, res) => {
        const jobId = parseInt(req.params.jobId);
        if (isNaN(jobId) || jobId < 1) {
            return res.status(400).json({ error: "Invalid jobId" });
        }
    
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: {
                id: true,
                status: true,
                businessId: true,
            },
        });
    
        if (!job || job.businessId !== req.account.id) {
            return res.status(404).json({ error: "Job not found" });
        }
    
        const now = new Date();
        if (job.status !== "open" && job.status !== "expired") {
            return res.status(409).json({ error: "Job cannot be deleted in its current state" });
        }
    
        const activeNegotiation = await prisma.negotiation.findFirst({
            where: {
                jobId,
                status: "active",
                expiresAt: { gt: now },
            },
            select: { id: true },
        });
    
        if (activeNegotiation) {
            return res.status(409).json({ error: "Job has an active negotiation" });
        }

        await prisma.$transaction([
            prisma.interest.deleteMany({ where: { jobId } }),
            prisma.negotiation.deleteMany({ where: { jobId } }),
            prisma.job.delete({ where: { id: jobId } }),
        ]);
    
        return res.status(204).end();
    });

    app.patch("/businesses/:businessId(\\d+)/verified", auth({ roles: [Roles.Admin] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["verified"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const { verified } = req.body;

        const businessId = parseInt(req.params.businessId);
        if (isNaN(businessId) || businessId < 1) {
            return res.status(400).json({ error: "Invalid businessId" });
        }

        if (typeof verified !== 'boolean') {
            return res.status(400).json({ error: "Invalid verified value" });
        }

        const existing = await prisma.businessProfile.findUnique({ where: { id: businessId }});
        if (!existing) {
            return res.status(404).json({ error: "Business not found" });
        }

        const updated = await prisma.businessProfile.update({
            where: { id: businessId },
            data: { verified },
            include: { account: { select: { email: true, activated: true } } }
        });

        return res.status(200).json({
            id: updated.id,
            business_name: updated.business_name,
            owner_name: updated.owner_name,
            email: updated.account.email,
            activated: updated.account.activated,
            verified: updated.verified,
            role: Roles.Business,
            phone_number: updated.phone_number,
            postal_address: updated.postal_address
        });
    });

    app.get("/businesses/:businessId(\\d+)", auth({ any: true, roles: [Roles.Admin] }), async (req, res) => {
        const isAdmin = req.account?.role === Roles.Admin;

        const businessId = parseInt(req.params.businessId);
        if (isNaN(businessId) || businessId < 1) {
            return res.status(400).json({ error: "Invalid businessId" });
        }

        const business = await prisma.businessProfile.findUnique({
            where: { id: businessId },
            include: {
                account: {
                    select: {
                        email: true,
                        activated: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!business) {
            return res.status(404).json({ error: "Business not Found" });
        }

        const result = {
            id: business.id,
            business_name: business.business_name,
            email: business.account.email,
            role: Roles.Business,
            phone_number: business.phone_number,
            postal_address: business.postal_address,
            location: business.location,
            avatar: business.avatar,
            biography: business.biography
        };

        if (isAdmin) {
            result.owner_name = business.owner_name;
            result.activated = business.account.activated;
            result.verified = business.verified;
            result.createdAt = business.account.createdAt.toISOString();
        }

        return res.status(200).json(result);
    });

    app.post("/auth/resets", async (req, res) => {
        const error = validateAllowedFields(req.body, ["email"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const ip = req.ip;
        const now = Date.now();
        const last = authResetsLastRequestMsByIp.get(ip);

        if (last !== undefined && now - last < RESET_COOLDOWN_SECONDS * 1000) {
            return res.status(429).json({ error: "Too many requests" });
        }

        authResetsLastRequestMsByIp.set(ip, now);

        const { email } = req.body;

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid or missing email' });
        }

        const account = await prisma.account.findUnique({ where: { email: email.trim() }, select: { id: true } });
        if (!account) {
            return res.status(404).json({ error: "Account not found" });
        }

        const resetToken = uuidv4();
        const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000);

        await prisma.resetToken.create({
            data: {
                token: resetToken,
                expiresAt,
                accountId: account.id
            }
        });

        return res.status(202).json({ expiresAt: expiresAt.toISOString(), resetToken });
    });

    app.post("/auth/resets/:resetToken", async (req, res) => {
        const error = validateAllowedFields(req.body, ["email", "password"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const resetToken = req.params.resetToken;
        const { email, password } = req.body;

        if (!isValidEmail(email)) {
            return res.status(401).json({ error: 'Invalid or missing email' });
        }
        if (password !== undefined && !isValidPassword(password)) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = await prisma.resetToken.findUnique({ 
            where: { token: resetToken },
            include: {
                account: { select: { id: true, email: true, activated: true } }
            }
        });

        if (!token) {
            return res.status(401).json({ error: "Reset token not found" });
        }
        if (token.used) {
            return res.status(401).json({ error: "Reset token already used" });
        }

        const now = new Date();
        if (now >= token.expiresAt) {
            return res.status(410).json({ error: "Reset token expired" });
        }

        if (token.account.email !== email.trim()) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        await prisma.$transaction(async (tx) => {
            await tx.resetToken.update({ where: { token: resetToken }, data: { used: true } });
            await tx.account.update({ where: { id: token.account.id }, data: { activated: true } });

            if (password !== undefined) {
                const hashed = await bcrypt.hash(password, 10);
                await tx.account.update({ where: { id: token.account.id }, data: { password: hashed } });
            }
        });

        return res.status(200).json({ activated: true });
    });

    app.post("/auth/tokens", async (req, res) => {
        const error = validateAllowedFields(req.body, ["email", "password"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const { email, password } = req.body;

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid or missing email' });
        }
        if (!isNonEmptyString(password)) {
            return res.status(400).json({ error: 'Missing password' });
        }

        const account = await prisma.account.findUnique({ where: { email: email.trim() }, select: { id: true, role: true, email: true, password: true, activated: true } });
        if (!account) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const match = await bcrypt.compare(password, account.password);
        if (!match) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (!account.activated) {
            return res.status(403).json({ error: "Account is not yet activated" });
        }

        const jwt_expires_seconds = 7 * 24 * 60 * 60;
        const expiresAt = new Date(Date.now() + jwt_expires_seconds * 1000);
        const token = jwt.sign({ id: account.id, role: account.role }, JWT_SECRET, { algorithm: "HS256", expiresIn: jwt_expires_seconds });

        return res.status(200).json({ token, expiresAt: expiresAt.toISOString() });
    });

    app.post("/position-types", auth({ roles: [Roles.Admin] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["name", "description", "hidden"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const { name, description, hidden = true } = req.body;

        if (!isNonEmptyString(name)) {
            return res.status(400).json({ error: "Invalid or missing name" });
        }
        if (!isNonEmptyString(description)) {
            return res.status(400).json({ error: "Invalid or missing description" });
        }
        if (typeof hidden !== 'boolean') {
            return res.status(400).json({ error: "Invalid hidden value" });
        }

        const created = await prisma.positionType.create({ data: { name: name.trim(), description: description.trim(), hidden: hidden } });

        return res.status(201).json({
            id: created.id,
            name: created.name,
            description: created.description,
            hidden: created.hidden,
            num_qualified: 0
        });
    });

    app.get("/position-types", auth({ roles: [Roles.Regular, Roles.Business, Roles.Admin] }), async (req, res) => {
        const error = validateAllowedFields(req.query, ["keyword", "name", "hidden", "num_qualified", "page", "limit"], false);
        if (error) {
            return res.status(400).json({ error });
        }

         const isAdmin = req.account?.role === Roles.Admin;
        const { keyword, name = "asc", hidden, num_qualified, page = "1", limit = "10" } = req.query;

        if (name !== 'asc' && name !== 'desc') {
            return res.status(400).json({ error: "Invalid name sort direction" });
        }

        if (!isAdmin) {
            if (hidden !== undefined || num_qualified !== undefined) {
                return res.status(400).json({ error: "Admin-only query fields" });
            }
        }

        const pageNum = Number(page);
        const limitNum = Number(limit);
        if (!Number.isInteger(pageNum) || pageNum < 1) {
            return res.status(400).json({ error: "Invalid page" });
        }
        if (!Number.isInteger(limitNum) || limitNum < 1) {
            return res.status(400).json({ error: "Invalid limit" });
        }

        if (hidden !== undefined && !isValidStrBool(hidden)) {
            return res.status(400).json({ error: "Invalid hidden" });
        }
        const hiddenBool = isAdmin && hidden !== undefined ? parseBool(hidden) : undefined;

        if (num_qualified !== undefined && num_qualified !== 'asc' && num_qualified !== 'desc') {
            return res.status(400).json({ error: "Invalid num_qualified sort direction" });
        }
        const numQualifiedSort = isAdmin? (num_qualified !== undefined ? num_qualified : 'asc') : undefined;

        const where = {};

        if (!isAdmin) {
            where.hidden = false;
        }

        if (keyword !== undefined) {
            if (typeof keyword !== 'string') {
                return res.status(400).json({ error: "Invalid keyword" });
            }

            where.OR = [
                { name: { contains: keyword } },
                { description: { contains: keyword } },
            ];
        }

        if (hiddenBool !== undefined) {
            where.hidden = hiddenBool;
        }

        let orderBy;
        if (isAdmin) {
            orderBy = [
                { qualifications: { _count: numQualifiedSort } },
                { name },
            ];
        } else {
            orderBy = [{ name }];
        }

        const [count, positionTypes] = await Promise.all([
            prisma.positionType.count({ where }),
            prisma.positionType.findMany({
                where,
                orderBy,
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
                include: {
                    _count: { select: { qualifications: true } }
                },
            }),
        ]);

        const results = positionTypes.map((positionType) => {
            const result = {
                id: positionType.id,
                name: positionType.name,
                description: positionType.description,
            };

            if (isAdmin) {
                result.hidden = positionType.hidden;
                result.num_qualified = positionType._count.qualifications;
            }

            return result;
        });

        return res.status(200).json({ count, results });
    });

    app.patch("/position-types/:positionTypeId(\\d+)", auth({ roles: [Roles.Admin] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["name", "description", "hidden"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const { name, description, hidden } = req.body;

        const positionTypeId = parseInt(req.params.positionTypeId);
        if (isNaN(positionTypeId) || positionTypeId < 1) {
            return res.status(400).json({ error: "Invalid positionTypeId" });
        }

        const data = {};
        const response = { id: positionTypeId };
        
        if (name !== undefined) {
            if (!isNonEmptyString(name)) {
                return res.status(400).json({ error: "Invalid name" });
            }
            data.name = name.trim();
            response.name = data.name;
        }

        if (description !== undefined) {
            if (!isNonEmptyString(description)) {
                return res.status(400).json({ error: "Invalid description" });
            }
            data.description = description.trim();
            response.description = data.description;
        }

        if (hidden !== undefined) {
            if (typeof hidden !== "boolean") {
                return res.status(400).json({ error: "Invalid hidden" });
            }
            data.hidden = hidden;
            response.hidden = data.hidden;
        }

        const exists = await prisma.positionType.findUnique({ where: { id: positionTypeId }, select: { id: true } });
        if (!exists) {
            return res.status(404).json({ error: "Position type not found" });
        }

        await prisma.positionType.update({ where: { id: positionTypeId }, data });

        return res.status(200).json(response);
    });

    app.delete("/position-types/:positionTypeId(\\d+)", auth({ roles: [Roles.Admin] }), async (req, res) => {
        const positionTypeId = parseInt(req.params.positionTypeId);

        if (isNaN(positionTypeId) || positionTypeId < 1) {
            return res.status(400).json({ error: "Invalid positionTypeId" });
        }

        const exists = await prisma.positionType.findUnique({ where: { id: positionTypeId }, select: { id: true } });
        if (!exists) {
            return res.status(404).json({ error: "Position type not found" });
        }

        const numQualified = await prisma.qualification.count({ where: { positionTypeId } });

        if (numQualified > 0) {
            return res.status(409).json({ error: "Position type has qualified users" });
        }

        await prisma.positionType.delete({ where: { id: positionTypeId } });

        return res.status(204).end();
    });

    app.get("/qualifications", auth({ roles: [Roles.Admin] }), async (req, res) => {
        const error = validateAllowedFields(req.query, ["keyword", "page", "limit"], false);
        if (error) {
            return res.status(400).json({ error });
        }

        const { keyword, page = '1', limit = '10' } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        if (!Number.isInteger(pageNum) || pageNum < 1) {
            return res.status(400).json({ error: "Invalid page" });
        }
        if (!Number.isInteger(limitNum) || limitNum < 1) {
            return res.status(400).json({ error: "Invalid limit" });
        }

        const where = { status: { in: [QualificationStatus.Submitted, QualificationStatus.Revised] } };

        if (keyword !== undefined) {
            if (typeof keyword !== "string") {
                return res.status(400).json({ error: "Invalid keyword" });
            }

            where.user = {
                OR: [
                    { first_name: { contains: keyword } },
                    { last_name: { contains: keyword } },
                    { phone_number: { contains: keyword } },
                    { account: { email: { contains: keyword } } },
                ],
            };
        }

        const [count, qualifications] = await Promise.all([
            prisma.qualification.count({ where }),
            prisma.qualification.findMany({
                where,
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
                select: {
                    id: true,
                    status: true,
                    note: true,
                    updatedAt: true,
                    user: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                        },
                    },
                    positionType: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            }),
        ]);

        const results = qualifications.map((qualification) => ({
            id: qualification.id,
            status: qualification.status,
            note: qualification.note,
            user: qualification.user,
            position_type: qualification.positionType,
            updatedAt: qualification.updatedAt.toISOString(),
        }));

        return res.status(200).json({ count, results });
    });

    app.post("/qualifications", auth({ roles: [Roles.Regular] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["position_type_id", "note"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const { position_type_id, note = "" } = req.body;

        if (!Number.isInteger(position_type_id) || position_type_id < 1) {
            return res.status(400).json({ error: "Invalid position_type_id" });
        }

        if (typeof note !== "string") {
            return res.status(400).json({ error: "Invalid note" });
        }

        const positionType = await prisma.positionType.findFirst({ where: { id: position_type_id, hidden: false } });
        if (!positionType) {
            return res.status(404).json({ error: "Position type not found" });
        }

        let created;
        try {
            created = await prisma.qualification.create({
                data: {
                    status: QualificationStatus.Created,
                    note,
                    document: null,
                    userId: req.account.id,
                    positionTypeId: position_type_id
                },
                select: {
                    id: true,
                    status: true,
                    note: true,
                    document: true,
                    updatedAt: true,
                    user: { select: { id: true, first_name: true, last_name: true } },
                    positionType: { select: { id: true, name: true } },
                }
            });
        } catch(e) {
            return res.status(409).json({ error: "Qualification already exists for this position type" });
        }

        return res.status(201).json({
            id: created.id,
            status: created.status,
            note: created.note,
            document: created.document,
            user: created.user,
            position_type: created.positionType,
            updatedAt: created.updatedAt.toISOString(),
        });
    });

    app.put("/qualifications/:qualificationId(\\d+)/document", auth({ roles: [Roles.Regular] }), upload.single("file"), async (req, res) => {
        try {
            if (req.file.mimetype !== "application/pdf") {
                return res.status(400).json({ error: "Invalid file type. Only PDF documents are allowed" });
            }

            const file_path = req.file.path.replace(__dirname, "").replace(/\\/g, "/");

            const qualificationId = parseInt(req.params.qualificationId);
            if (isNaN(qualificationId) || qualificationId < 1) {
                return res.status(400).json({ error: "Invalid qualificationId" });
            }

            const qualification = await prisma.qualification.findUnique({
                where: { id: qualificationId },
                select: { id: true, userId: true },
            });

            if (!qualification) {
                return res.status(404).json({ error: "Qualification not found" });
            }

            if (qualification.userId !== req.account.id) {
                return res.status(403).json({ error: "Forbidden" });
            }

            await prisma.qualification.update({
                where: { id: qualificationId },
                data: { document: file_path },
            });

            return res.status(200).json({ document: file_path });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    });

    app.get("/qualifications/:qualificationId(\\d+)", auth({ roles: [Roles.Regular, Roles.Business, Roles.Admin] }), async (req, res) => {
        const qualificationId = parseInt(req.params.qualificationId);

        if (isNaN(qualificationId) || qualificationId < 1) {
            return res.status(400).json({ error: "Invalid qualificationId" });
        }

        const qualification = await prisma.qualification.findUnique({
            where: { id: qualificationId },
            select: {
                id: true,
                status: true,
                note: true,
                document: true,
                updatedAt: true,
                userId: true,
                positionTypeId: true,
                positionType: {
                    select: { id: true, name: true, description: true },
                },
                user: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        phone_number: true,
                        postal_address: true,
                        birthday: true,
                        suspended: true,
                        avatar: true,
                        biography: true,
                        resume: true,
                        account: {
                        select: {
                            email: true,
                            role: true,
                            activated: true,
                            createdAt: true,
                        },
                        },
                    },
                },
            },
        });

        if (!qualification) {
            return res.status(404).json({ error: "Qualification not found" });
        }

        const role = req.account.role;

        if (role === Roles.Regular && qualification.userId !== req.account.id) {
            return res.status(404).json({ error: "Qualification not found" });
        }
        if (role === Roles.Business) {
            if (qualification.status !== QualificationStatus.Approved) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const validInterest = await prisma.interest.findFirst({
                where: {
                    userId: qualification.userId,
                    candidateInterest: true,
                    job: {
                        businessId: req.account.id,
                        positionTypeId: qualification.positionTypeId
                    }
                }
            });

            if (!validInterest) {
                return res.status(403).json({ error: "Forbidden" });
            }
        }

        const result = {
            id: qualification.id,
            document: qualification.document,
            note: qualification.note,
            position_type: {
                id: qualification.positionType.id,
                name: qualification.positionType.name,
                description: qualification.positionType.description,
            },
            updatedAt: qualification.updatedAt.toISOString(),
            user: {
                id: qualification.user.id,
                first_name: qualification.user.first_name,
                last_name: qualification.user.last_name,
                role: Roles.Regular,
                avatar: qualification.user.avatar,
                resume: qualification.user.resume,
                biography: qualification.user.biography,
            }
        };

        if (role !== Roles.Business) {
            result.user.email = qualification.user.account.email;
            result.user.phone_number = qualification.user.phone_number;
            result.user.postal_address = qualification.user.postal_address;
            result.user.birthday = qualification.user.birthday;
            result.user.activated = qualification.user.account.activated;
            result.user.suspended = qualification.user.suspended;
            result.user.createdAt = qualification.user.account.createdAt.toISOString();
            result.status = qualification.status;
        }

        return res.status(200).json(result);
    });

    app.patch("/qualifications/:qualificationId(\\d+)", auth({ roles: [Roles.Regular, Roles.Admin] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["status", "note"], false);
        if (error) {
            return res.status(400).json({ error });
        }

        const qualificationId = parseInt(req.params.qualificationId);

        if (isNaN(qualificationId) || qualificationId < 1) {
            return res.status(400).json({ error: "Invalid qualificationId" });
        }

        const { status, note } = req.body;

        if (status !== undefined && typeof status !== "string") {
            return res.status(400).json({ error: "Invalid status" });
        }
        if (note !== undefined && typeof note !== "string") {
            return res.status(400).json({ error: "Invalid note" });
        }
        if (status === undefined && note === undefined) {
            return res.status(400).json({ error: "No fields to update" });
        }

        const qualification = await prisma.qualification.findUnique({
            where: { id: qualificationId },
            select: { id: true, status: true, userId: true }
        });

        if (!qualification) {
            return res.status(404).json({ error: "Qualification not found" });
        }

        if (req.account.role === Roles.Regular && qualification.userId !== req.account.id) {
            return res.status(403).json({ error: "Qualification not found" });
        }

        if (status !== undefined) {
            const validStatus = new Set(Object.values(QualificationStatus));
            if (!validStatus.has(status)) {
                return res.status(400).json({ error: "Invalid status value" });
            }

            if (req.account.role === Roles.Admin) {
                const fromOk = qualification.status === QualificationStatus.Submitted || qualification.status === QualificationStatus.Revised;
                const toOk = status === QualificationStatus.Approved || status === QualificationStatus.Rejected;
                if (!fromOk || !toOk) {
                    return res.status(403).json({ error: "Forbidden" });
                }
            }

            if (req.account.role === Roles.Regular) {
                const ok = 
                    (qualification.status === QualificationStatus.Created && status === QualificationStatus.Submitted) ||
                    ((qualification.status === QualificationStatus.Approved || qualification.status === QualificationStatus.Rejected) && status === QualificationStatus.Revised);

                if (!ok) {
                    return res.status(403).json({ error: "Forbidden" });
                }
            }
        }

        const data = {};
        if (status !== undefined) data.status = status;
        if (note !== undefined) data.note = note;

        const updated = await prisma.qualification.update({
            where: { id: qualificationId },
            data,
            select: {
                id: true,
                status: true,
                note: true,
                document: true,
                updatedAt: true,
                user: { select: { id: true, first_name: true, last_name: true } },
                positionType: { select: { id: true, name: true } },
            },
        });

        return res.status(200).json({
            id: updated.id,
            status: updated.status,
            document: updated.document,
            note: updated.note,
            user: updated.user,
            position_type: updated.positionType,
            updatedAt: updated.updatedAt.toISOString(),
        });
    });

    app.patch("/system/reset-cooldown", auth({ roles: [Roles.Admin] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["reset_cooldown"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const { reset_cooldown } = req.body;

        if (!Number.isInteger(reset_cooldown) || reset_cooldown < 0) {
            return res.status(400).json({ error: "Invalid reset_cooldown" });
        }

        RESET_COOLDOWN_SECONDS = reset_cooldown;

        return res.status(200).json({ reset_cooldown: RESET_COOLDOWN_SECONDS });
    });

    app.patch("/system/negotiation-window", auth({ roles: [Roles.Admin] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["negotiation_window"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const { negotiation_window } = req.body;

        if (!Number.isInteger(negotiation_window) || negotiation_window <= 0) {
            return res.status(400).json({ error: "Invalid negotiation_window" });
        }

        NEGOTIATION_WINDOW_SECONDS = negotiation_window;

        return res.status(200).json({ negotiation_window: NEGOTIATION_WINDOW_SECONDS });
    });

    app.patch("/system/job-start-window", auth({ roles: [Roles.Admin] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["job_start_window"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const { job_start_window } = req.body;

        if (!Number.isInteger(job_start_window) || job_start_window <= 0) {
            return res.status(400).json({ error: "Invalid job_start_window" });
        }

        JOB_START_WINDOW_HOURS = job_start_window;

        return res.status(200).json({ job_start_window: JOB_START_WINDOW_HOURS });
    });

    app.patch("/system/availability-timeout", auth({ roles: [Roles.Admin] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["availability_timeout"]);
        if (error) {
            return res.status(400).json({ error });
        }

        const { availability_timeout } = req.body;

        if (!Number.isInteger(availability_timeout) || availability_timeout <= 0) {
            return res.status(400).json({ error: "Invalid availability_timeout" });
        }

        AVAILABILITY_TIMEOUT_SECONDS = availability_timeout;

        return res.status(200).json({ availability_timeout: AVAILABILITY_TIMEOUT_SECONDS });
    });

    app.get("/jobs", auth({ roles: [Roles.Regular] }), async (req, res) => {
        const error = validateAllowedFields(req.query, [
            "lat", "lon", "position_type_id", "business_id",
            "sort", "order", "page", "limit"
        ], false);
        if (error) {
            return res.status(400).json({ error });
        }

        const {
            lat, lon,
            position_type_id,
            business_id,
            sort = "start_time",
            order = "asc",
            page = "1",
            limit = "10"
        } = req.query;

        const hasLat = lat !== undefined;
        const hasLon = lon !== undefined;
        const hasLocation = hasLat && hasLon;
        let latNum, lonNum;

        if (hasLat || hasLon) {
            latNum = Number(lat);
            lonNum = Number(lon);
        }

        const validSorts = ["updatedAt", "start_time", "salary_min", "salary_max", "distance", "eta"];
        if (!validSorts.includes(sort)) {
            return res.status(400).json({ error: "Invalid sort" });
        }

        if ((sort === "distance" || sort === "eta") && !hasLocation) {
            return res.status(400).json({ error: "lat and lon are required when sorting by distance or eta" });
        }

        if (order !== "asc" && order !== "desc") {
            return res.status(400).json({ error: "Invalid order" });
        }
        const pageNum = Number(page);
        const limitNum = Number(limit);
        if (!Number.isInteger(pageNum) || pageNum < 1) {
            return res.status(400).json({ error: "Invalid page" });
        }
        if (!Number.isInteger(limitNum) || limitNum < 1) {
            return res.status(400).json({ error: "Invalid limit" });
        }

        let positionTypeIdNum, businessIdNum;
        if (position_type_id !== undefined) {
            positionTypeIdNum = Number(position_type_id);
            if (!Number.isInteger(positionTypeIdNum) || positionTypeIdNum < 1) {
                return res.status(400).json({ error: "Invalid position_type_id" });
            }
        }
        if (business_id !== undefined) {
            businessIdNum = Number(business_id);
            if (!Number.isInteger(businessIdNum) || businessIdNum < 1) {
                return res.status(400).json({ error: "Invalid business_id" });
            }
        }

        const approvedQualifications = await prisma.qualification.findMany({
            where: {
                userId: req.account.id,
                status: QualificationStatus.Approved,
            },
            select: { positionTypeId: true },
        });

        const approvedPositionTypeIds = approvedQualifications.map(q => q.positionTypeId);
        const now = new Date();
        const negotiationCutoff = new Date(now.getTime() + NEGOTIATION_WINDOW_SECONDS * 1000);

        const where = {
            status: "open",
            start_time: { gt: negotiationCutoff },
            positionTypeId: { in: approvedPositionTypeIds },
        };

        if (positionTypeIdNum !== undefined) {
            where.positionTypeId = positionTypeIdNum;
            if (!approvedPositionTypeIds.includes(positionTypeIdNum)) {
                return res.status(200).json({ count: 0, results: [] });
            }
        }
        if (businessIdNum !== undefined) {
            where.businessId = businessIdNum;
        }

        let orderBy = undefined;
        if (sort === "updatedAt") {
            orderBy = { updatedAt: order };
        } else if (sort === "start_time") {
            orderBy = { start_time: order };
        } else if (sort === "salary_min") {
            orderBy = { salary_min: order };
        } else if (sort === "salary_max") {
            orderBy = { salary_max: order };
        }

        const useDbPagination = sort !== "distance" && sort !== "eta";

        const [count, jobs] = await Promise.all([
            prisma.job.count({ where }),
            prisma.job.findMany({
                where,
                orderBy,
                ...(useDbPagination ? {
                    skip: (pageNum - 1) * limitNum,
                    take: limitNum,
                } : {}),
                select: {
                    id: true,
                    status: true,
                    salary_min: true,
                    salary_max: true,
                    start_time: true,
                    end_time: true,
                    updatedAt: true,
                    business: {
                        select: {
                            id: true,
                            business_name: true,
                            location: true,
                        },
                    },
                    positionType: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            }),
        ]);

        let results = jobs.map(job => {
            const result = {
                id: job.id,
                status: job.status,
                position_type: job.positionType,
                business: {
                    id: job.business.id,
                    business_name: job.business.business_name,
                },
                salary_min: job.salary_min,
                salary_max: job.salary_max,
                start_time: job.start_time.toISOString(),
                end_time: job.end_time.toISOString(),
                updatedAt: job.updatedAt.toISOString(),
            };
    
            if (hasLocation) {
                const loc = job.business.location;
                const dist = haversine(latNum, lonNum, loc.lat, loc.lon);
                result.distance = Math.round(dist * 10) / 10;
                result.eta = Math.round((dist / 30) * 60); 
            }

            
    
            return result;
        });

        if (sort === "distance" || sort === "eta") {
            const field = sort;
            results.sort((a, b) => order === "asc" ? a[field] - b[field] : b[field] - a[field]);
            results = results.slice((pageNum - 1) * limitNum, pageNum * limitNum);
        }

        return res.status(200).json({ count, results });
    });
    
    app.patch("/jobs/:jobId(\\d+)/no-show", auth({ roles: [Roles.Business] }), async (req, res) => {
        const jobId = parseInt(req.params.jobId);
        if (isNaN(jobId) || jobId < 1) {
            return res.status(400).json({ error: "Invalid jobId" });
        }
    
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: {
                id: true,
                status: true,
                businessId: true,
                workerId: true,
                start_time: true,
                end_time: true,
            },
        });
    
        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }
        
        if (job.businessId !== req.account.id) {
            return res.status(403).json({ error: "Access Forbidden" });
        }
    
        if (job.status !== "filled") {
            return res.status(409).json({ error: "Job is not filled" });
        }
    
        const now = new Date();
        if (now < job.start_time) {
            return res.status(409).json({ error: "Job has not started yet" });
        }
        if (now >= job.end_time) {
            return res.status(409).json({ error: "Job has already ended" });
        }
    
        const updated = await prisma.$transaction(async (tx) => {
            const updatedJob = await tx.job.update({
                where: { id: jobId },
                data: { status: "cancelled" },
                select: {
                    id: true,
                    status: true,
                    updatedAt: true,
                },
            });
    
            await tx.regularProfile.update({
                where: { id: job.workerId },
                data: { suspended: true },
            });
    
            return updatedJob;
        });
    
        return res.status(200).json({
            id: updated.id,
            status: updated.status,
            updatedAt: updated.updatedAt.toISOString(),
        });
    });

    app.patch("/jobs/:jobId(\\d+)/interested", auth({ roles: [Roles.Regular] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["interested"]);
        if (error) {
            return res.status(400).json({ error });
        }
    
        const jobId = parseInt(req.params.jobId);
        if (isNaN(jobId) || jobId < 1) {
            return res.status(400).json({ error: "Invalid jobId" });
        }
    
        const { interested } = req.body;
        if (typeof interested !== "boolean") {
            return res.status(400).json({ error: "Invalid or missing interested" });
        }

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: {
                id: true,
                status: true,
                positionTypeId: true,
                start_time: true,
                businessId: true,
            },
        });
    
        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }
    
        const now = new Date();
        const negotiationCutoff = new Date(now.getTime() + NEGOTIATION_WINDOW_SECONDS * 1000);
        const isAvailable = job.status === "open" && job.start_time > negotiationCutoff;
    
        if (!isAvailable) {
            return res.status(409).json({ error: "Job is no longer available" });
        }
    
        const qualification = await prisma.qualification.findFirst({
            where: {
                userId: req.account.id,
                positionTypeId: job.positionTypeId,
                status: QualificationStatus.Approved,
            },
            select: { id: true },
        });
    
        if (!qualification) {
            return res.status(403).json({ error: "Forbidden" });
        }
    
        
        const existing = await prisma.interest.findUnique({
            where: { jobId_userId: { jobId, userId: req.account.id } },
        });
        if ((!interested && !existing) ||
            (!interested && existing && existing.candidateInterest === false)) {
            return res.status(400).json({ error: "No interest to withdraw" });
        }
    
        if (interested) {
            const activeNegotiation = await prisma.negotiation.findFirst({
                where: {
                    jobId,
                    userId: req.account.id,
                    status: "active",
                    expiresAt: { gt: now },
                },
                select: { id: true },
            });
    
            if (activeNegotiation) {
                return res.status(409).json({ error: "Currently in a negotiation for this job" });
            }
        }
    
        let interest;
        if (interested) {
            interest = await prisma.$transaction(async (tx) => {
                const upserted = await tx.interest.upsert({
                    where: { jobId_userId: { jobId, userId: req.account.id } },
                    create: {
                        jobId,
                        userId: req.account.id,
                        candidateInterest: true,
                        businessInterest: null,
                    },
                    update: {
                        candidateInterest: true,
                    },
                });
                await tx.regularProfile.update({
                    where: { id: req.account.id },
                    data: { lastActiveAt: new Date() },
                });
                return upserted;
            });
        } else {
            interest = await prisma.interest.update({
                where: { jobId_userId: { jobId, userId: req.account.id } },
                data: { candidateInterest: false },
            });
        }
    
        return res.status(200).json({
            id: interest.id,
            job_id: interest.jobId,
            candidate: {
                id: req.account.id,
                interested: interest.candidateInterest,
            },
            business: {
                id: job.businessId,
                interested: interest.businessInterest ?? null,
            },
        });
    });

    app.get("/jobs/:jobId(\\d+)/candidates", auth({ roles: [Roles.Business] }), async (req, res) => {
        const error = validateAllowedFields(req.query, ["page", "limit"], false);
        if (error) {
            return res.status(400).json({ error });
        }
    
        const jobId = parseInt(req.params.jobId);
        if (isNaN(jobId) || jobId < 1) {
            return res.status(400).json({ error: "Invalid jobId" });
        }
    
        const { page = "1", limit = "10" } = req.query;
    
        const pageNum = Number(page);
        const limitNum = Number(limit);
        if (!Number.isInteger(pageNum) || pageNum < 1) {
            return res.status(400).json({ error: "Invalid page" });
        }
        if (!Number.isInteger(limitNum) || limitNum < 1) {
            return res.status(400).json({ error: "Invalid limit" });
        }
    
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: {
                id: true,
                businessId: true,
                positionTypeId: true,
                start_time: true,
                end_time: true,
                status: true,
            },
        });
    
        if (!job || job.businessId !== req.account.id) {
            return res.status(404).json({ error: "Job not found" });
        }
    
        const candidates = await prisma.regularProfile.findMany({
            where: {
                account: { activated: true },
                suspended: false,
                available: true,
                qualifications: {
                    some: {
                        positionTypeId: job.positionTypeId,
                        status: QualificationStatus.Approved,
                    },
                },
                NOT: {
                    jobs: {
                        some: {
                            status: "filled",
                            start_time: { lt: job.end_time },
                            end_time: { gt: job.start_time },
                        },
                    },
                },
            },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                interests: {
                    where: { jobId },
                    select: { businessInterest: true },
                },
            },
            orderBy: { id: "asc" },
        });
        const total = candidates.length;

        const paginated = candidates.slice((pageNum - 1) * limitNum, pageNum * limitNum);
        const results = paginated.map((user) => {
            const interestRecord = user.interests[0] ?? null;
            const invited = interestRecord?.businessInterest === true;
            return {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                invited,
            };
        });
    
        return res.status(200).json({ count: total, results });
    });

    app.patch("/jobs/:jobId(\\d+)/candidates/:userId(\\d+)/interested", auth({ roles: [Roles.Business] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["interested"]);
        if (error) {
            return res.status(400).json({ error });
        }
    
        const jobId = parseInt(req.params.jobId);
        if (isNaN(jobId) || jobId < 1) {
            return res.status(400).json({ error: "Invalid jobId" });
        }
    
        const userId = parseInt(req.params.userId);
        if (isNaN(userId) || userId < 1) {
            return res.status(400).json({ error: "Invalid userId" });
        }
    
        const { interested } = req.body;
        if (typeof interested !== "boolean") {
            return res.status(400).json({ error: "Invalid or missing interested" });
        }

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: {
                id: true,
                businessId: true,
                positionTypeId: true,
                start_time: true,
                end_time: true,
                status: true,
            },
        });
    
        if (!job || job.businessId !== req.account.id) {
            return res.status(404).json({ error: "Job not found" });
        }
    
        const now = new Date();
        const negotiationCutoff = new Date(now.getTime() + NEGOTIATION_WINDOW_SECONDS * 1000);
        if (job.status !== "open" || job.start_time <= negotiationCutoff) {
            return res.status(409).json({ error: "Job is not open" });
        }
    
        const user = await prisma.regularProfile.findUnique({
            where: { id: userId },
            select: {
                id: true,
                suspended: true,
                available: true,
                lastActiveAt: true,
                account: {
                    select: { activated: true },
                },
                qualifications: {
                    where: {
                        positionTypeId: job.positionTypeId,
                        status: QualificationStatus.Approved,
                    },
                    select: { id: true },
                },
                jobs: {
                    where: {
                        status: "filled",
                        start_time: { lt: job.end_time },
                        end_time: { gt: job.start_time },
                    },
                    select: { id: true },
                },
            },
        });
    
        if (!user || user.qualifications.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
    
        if (interested) {
            const isDiscoverable =
                user.account.activated &&
                !user.suspended &&
                user.available &&
                user.jobs.length === 0;
    
            if (!isDiscoverable) {
                return res.status(403).json({ error: "Forbidden" });
            }
        }
    
        const existing = await prisma.interest.findUnique({
            where: { jobId_userId: { jobId, userId } },
        });
        if (!interested && (!existing || existing.businessInterest !== true)) {
            return res.status(400).json({ error: "No invitation to withdraw" });
        }

        const interest = await prisma.interest.upsert({
            where: { jobId_userId: { jobId, userId } },
            create: {
                jobId,
                userId,
                candidateInterest: null,
                businessInterest: interested,
            },
            update: {
                businessInterest: interested,
            },
        });
    
        return res.status(200).json({
            id: interest.id,
            job_id: interest.jobId,
            candidate: {
                id: userId,
                interested: interest.candidateInterest ?? null,
            },
            business: {
                id: req.account.id,
                interested: interest.businessInterest,
            },
        });
    });

    app.get("/jobs/:jobId(\\d+)/candidates/:userId(\\d+)", auth({ roles: [Roles.Business] }), async (req, res) => {
        const jobId = parseInt(req.params.jobId);
        if (isNaN(jobId) || jobId < 1) {
            return res.status(400).json({ error: "Invalid jobId" });
        }
    
        const userId = parseInt(req.params.userId);
        if (isNaN(userId) || userId < 1) {
            return res.status(400).json({ error: "Invalid userId" });
        }

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: {
                id: true,
                businessId: true,
                positionTypeId: true,
                start_time: true,
                end_time: true,
                status: true,
                workerId: true,
                positionType: {
                    select: { id: true, name: true, description: true },
                },
            },
        });
    
        if (!job || job.businessId !== req.account.id) {
            return res.status(404).json({ error: "Job not found" });
        }
    
        const user = await prisma.regularProfile.findUnique({
            where: { id: userId },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar: true,
                resume: true,
                biography: true,
                suspended: true,
                available: true,
                lastActiveAt: true,
                account: {
                    select: {
                        activated: true,
                        email: true,
                    },
                },
                phone_number: true,
                qualifications: {
                    where: {
                        positionTypeId: job.positionTypeId,
                        status: QualificationStatus.Approved,
                    },
                    select: {
                        id: true,
                        positionTypeId: true,
                        document: true,
                        note: true,
                        updatedAt: true,
                    },
                },
                jobs: {
                    where: {
                        status: "filled",
                        start_time: { lt: job.end_time },
                        end_time: { gt: job.start_time },
                    },
                    select: { id: true },
                },
            },
        });
    
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
    
        const qualification = user.qualifications[0] ?? null;
        if (!qualification) {
            return res.status(404).json({ error: "User not found" });
        }
    
        const now = new Date();
        const isFilledWorker = job.workerId === userId;
        const isWithinJobPeriod = now < job.end_time;
        const unconditionalAccess = isFilledWorker && isWithinJobPeriod;
    
        if (!unconditionalAccess) {    
            const isActivated = user.account.activated;
            const isNotSuspended = !user.suspended;
            const isAvailable = user.available;
            const hasNoConflict = user.jobs.length === 0;
    
            const isDiscoverable = isActivated && isNotSuspended && isAvailable && hasNoConflict;
            if (!isDiscoverable) {
                return res.status(403).json({ error: "Forbidden" });
            }
        }

        const result = {
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                avatar: user.avatar,
                resume: user.resume,
                biography: user.biography,
                qualification: {
                    id: qualification.id,
                    position_type_id: qualification.positionTypeId,
                    document: qualification.document,
                    note: qualification.note,
                    updatedAt: qualification.updatedAt.toISOString(),
                },
                ...(isFilledWorker && {
                    email: user.account.email,
                    phone_number: user.phone_number,
                }),
            },
            job: {
                id: job.id,
                status: job.status,
                position_type: job.positionType,
                start_time: job.start_time.toISOString(),
                end_time: job.end_time.toISOString(),
            },
        };
    
        return res.status(200).json(result);
    });

    app.get("/jobs/:jobId(\\d+)/interests", auth({ roles: [Roles.Business] }), async (req, res) => {
        const error = validateAllowedFields(req.query, ["page", "limit"], false);
        if (error) {
            return res.status(400).json({ error });
        }
    
        const jobId = parseInt(req.params.jobId);
        if (isNaN(jobId) || jobId < 1) {
            return res.status(400).json({ error: "Invalid jobId" });
        }
    
        const { page = "1", limit = "10" } = req.query;
    
        const pageNum = Number(page);
        const limitNum = Number(limit);
        if (!Number.isInteger(pageNum) || pageNum < 1) {
            return res.status(400).json({ error: "Invalid page" });
        }
        if (!Number.isInteger(limitNum) || limitNum < 1) {
            return res.status(400).json({ error: "Invalid limit" });
        }
    
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: { id: true, businessId: true },
        });
    
        if (!job || job.businessId !== req.account.id) {
            return res.status(404).json({ error: "Job not found" });
        }
    
        const where = {
            jobId,
            candidateInterest: true,
        };
    
        const [count, interests] = await Promise.all([
            prisma.interest.count({ where }),
            prisma.interest.findMany({
                where,
                orderBy: { updatedAt: "desc" },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
                select: {
                    id: true,
                    candidateInterest: true,
                    businessInterest: true,
                    user: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                        },
                    },
                },
            }),
        ]);
    
        const results = interests.map((interest) => ({
            interest_id: interest.id,
            mutual: interest.candidateInterest === true && interest.businessInterest === true,
            user: {
                id: interest.user.id,
                first_name: interest.user.first_name,
                last_name: interest.user.last_name,
            },
        }));
    
        return res.status(200).json({ count, results });
    });

    app.get("/jobs/:jobId(\\d+)", auth({ roles: [Roles.Regular, Roles.Business] }), async (req, res) => {
        const jobId = parseInt(req.params.jobId);
        if (isNaN(jobId) || jobId < 1) {
            return res.status(400).json({ error: "Invalid jobId" });
        }
    
        const isRegular = req.account.role === Roles.Regular;
        const isBusiness = req.account.role === Roles.Business;
    
        const { lat, lon } = req.query;
    
        if (isBusiness && (lat !== undefined || lon !== undefined)) {
            return res.status(400).json({ error: "Businesses cannot specify lat or lon" });
        }
    
        let latNum, lonNum, hasLocation = false;
        if (isRegular && (lat !== undefined || lon !== undefined)) {
            if (lat === undefined || lon === undefined) {
                return res.status(400).json({ error: "Both lat and lon must be provided together" });
            }
            latNum = Number(lat);
            lonNum = Number(lon);
            if (isNaN(latNum) || isNaN(lonNum)) {
                return res.status(400).json({ error: "Invalid lat/lon" });
            }
            hasLocation = true;
        }
    
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: {
                id: true,
                status: true,
                note: true,
                salary_min: true,
                salary_max: true,
                start_time: true,
                end_time: true,
                updatedAt: true,
                businessId: true,
                positionTypeId: true,
                workerId: true,
                business: {
                    select: {
                        id: true,
                        business_name: true,
                        location: true,
                    },
                },
                positionType: {
                    select: { id: true, name: true },
                },
                worker: {
                    select: { id: true, first_name: true, last_name: true },
                },
            },
        });
    
        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }
    
        if (isBusiness && job.businessId !== req.account.id) {
            return res.status(404).json({ error: "Job not found" });
        }
        
        const now = new Date();
        if (isRegular) {
            const isOpen = job.status === "open" && job.start_time > now;
            const isTheirJob = job.workerId === req.account.id;
    
            if (!isOpen && !isTheirJob) {
                return res.status(404).json({ error: "Job not found" });
            }
    
            const qualification = await prisma.qualification.findFirst({
                where: {
                    userId: req.account.id,
                    positionTypeId: job.positionTypeId,
                    status: QualificationStatus.Approved,
                },
                select: { id: true },
            });
    
            if (!qualification) {
                return res.status(403).json({ error: "Forbidden" });
            }
        }
    
        const result = {
            id: job.id,
            status: job.status,
            position_type: job.positionType,
            business: {
                id: job.business.id,
                business_name: job.business.business_name,
            },
            worker: job.worker ?? null,
            note: job.note,
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            start_time: job.start_time.toISOString(),
            end_time: job.end_time.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
        };

        if (hasLocation) {
            const loc = job.business.location;
            const distKm = haversine(latNum, lonNum, loc.lat, loc.lon);
            result.distance = Math.round(distKm * 10) / 10;
            result.eta = Math.round((distKm / 30) * 60);
        }
    
        return res.status(200).json(result);
    });

    app.post("/negotiations", auth({ roles: [Roles.Regular, Roles.Business] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["interest_id"]);
        if (error) {
            return res.status(400).json({ error });
        }
    
        const { interest_id } = req.body;
        if (!Number.isInteger(interest_id) || interest_id < 1) {
            return res.status(400).json({ error: "Invalid or missing interest_id" });
        }
    
        const isRegular = req.account.role === Roles.Regular;
        const isBusiness = req.account.role === Roles.Business;
    
        const interest = await prisma.interest.findUnique({
            where: { id: interest_id },
            select: {
                id: true,
                jobId: true,
                userId: true,
                candidateInterest: true,
                businessInterest: true,
                job: {
                    select: {
                        id: true,
                        status: true,
                        businessId: true,
                        positionTypeId: true,
                        start_time: true,
                        end_time: true,
                        salary_min: true,
                        salary_max: true,
                        positionType: {
                            select: { id: true, name: true },
                        },
                        business: {
                            select: { id: true, business_name: true },
                        },
                    },
                },
                user: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        suspended: true,
                        available: true,
                        lastActiveAt: true,
                        account: {
                            select: { activated: true },
                        },
                        jobs: {
                            where: {
                                status: "filled",
                            },
                            select: {
                                id: true,
                                start_time: true,
                                end_time: true,
                            },
                        },
                    },
                },
                negotiations: {
                    where: { status: "active" },
                    select: {
                        id: true,
                        status: true,
                        expiresAt: true,
                        createdAt: true,
                        updatedAt: true,
                        candidateDecision: true,
                        businessDecision: true,
                    },
                },
            },
        });
    
        if (!interest || isRegular && interest.userId !== req.account.id ||
            isBusiness && interest.job.businessId !== req.account.id) {
            return res.status(404).json({ error: "Interest not found" });
        }

        const now = new Date();

        const formatDecision = (d) => d === true ? "accept" : d === false ? "decline" : null;
        const existingActive = interest.negotiations.find(n => n.expiresAt > now);
        if (existingActive) {
            
            return res.status(200).json({
                id: existingActive.id,
                status: existingActive.status,
                createdAt: existingActive.createdAt.toISOString(),
                updatedAt: existingActive.updatedAt.toISOString(),
                expiresAt: existingActive.expiresAt.toISOString(),
                job: {
                    id: interest.job.id,
                    status: interest.job.status,
                    position_type: interest.job.positionType,
                    business: interest.job.business,
                    salary_min: interest.job.salary_min,
                    salary_max: interest.job.salary_max,
                    start_time: interest.job.start_time.toISOString(),
                    end_time: interest.job.end_time.toISOString(),
                },
                user: {
                    id: interest.user.id,
                    first_name: interest.user.first_name,
                    last_name: interest.user.last_name,
                },
                decisions: {
                    candidate: formatDecision(existingActive.candidateDecision),
                    business: formatDecision(existingActive.businessDecision),   
                },
            });
        }
    
        const negotiationCutoff = new Date(now.getTime() + NEGOTIATION_WINDOW_SECONDS * 1000);
        if (interest.job.status !== "open" || interest.job.start_time <= negotiationCutoff) {
            return res.status(409).json({ error: "Job is no longer available for negotiation" });
        }
    
        if (interest.candidateInterest !== true || interest.businessInterest !== true) {
            return res.status(403).json({ error: "Interest is not mutual" });
        }

        const hasConflict = interest.user.jobs.some(j =>
            j.start_time < interest.job.end_time && j.end_time > interest.job.start_time
        );
        const isDiscoverable =
            interest.user.account.activated &&
            !interest.user.suspended &&
            interest.user.available &&
            !hasConflict;

        if (!isDiscoverable) {
            return res.status(403).json({ error: "Regular user is not discoverable" });
        }
    
        const [userActiveNegotiation, jobActiveNegotiation] = await Promise.all([
            prisma.negotiation.findFirst({
                where: {
                    userId: interest.userId,
                    status: "active",
                    expiresAt: { gt: now },
                },
                select: { id: true, expiresAt: true },
            }),
            prisma.negotiation.findFirst({
                where: {
                    jobId: interest.jobId,
                    status: "active",
                    expiresAt: { gt: now },
                },
                select: { id: true, expiresAt: true },
            }),
        ]);
    
        if (userActiveNegotiation || jobActiveNegotiation) {
            const active = userActiveNegotiation ?? jobActiveNegotiation;
            const waitSeconds = Math.ceil((active.expiresAt.getTime() - now.getTime()) / 1000);
            return res.status(409).json({
                error: "A negotiation is already in progress",
                wait_seconds: waitSeconds,
            });
        }
    
        const expiresAt = new Date(now.getTime() + NEGOTIATION_WINDOW_SECONDS * 1000);
        const negotiation = await prisma.negotiation.create({
            data: {
                status: "active",
                jobId: interest.jobId,
                userId: interest.userId,
                interestId: interest.id,
                expiresAt,
                candidateDecision: null,
                businessDecision: null,
            },
            select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                expiresAt: true,
                candidateDecision: true,
                businessDecision: true,
            },
        });

        const io = getIo();
        if (io) {
            const negotiationRoom = `negotiation:${negotiation.id}`;
            const candidateRoom = `account:${interest.userId}`;
            const businessRoom = `account:${interest.job.businessId}`;
        
            const candidateSockets = await io.in(candidateRoom).fetchSockets();
            const businessSockets = await io.in(businessRoom).fetchSockets();
        
            for (const s of [...candidateSockets, ...businessSockets]) {
                s.join(negotiationRoom);
            }

            io.to(candidateRoom).emit('negotiation:started', { negotiation_id: negotiation.id });
            io.to(businessRoom).emit('negotiation:started', { negotiation_id: negotiation.id });
        }
    
        return res.status(201).json({
            id: negotiation.id,
            status: negotiation.status,
            createdAt: negotiation.createdAt.toISOString(),
            updatedAt: negotiation.updatedAt.toISOString(),
            expiresAt: negotiation.expiresAt.toISOString(),
            job: {
                id: interest.job.id,
                status: interest.job.status,
                position_type: interest.job.positionType,
                business: interest.job.business,
                salary_min: interest.job.salary_min,
                salary_max: interest.job.salary_max,
                start_time: interest.job.start_time.toISOString(),
                end_time: interest.job.end_time.toISOString(),
            },
            user: {
                id: interest.user.id,
                first_name: interest.user.first_name,
                last_name: interest.user.last_name,
            },
            decisions: {
                candidate: formatDecision(negotiation.candidateDecision),
                business: formatDecision(negotiation.businessDecision),
            },
        });
    });

    app.get("/negotiations/me", auth({ roles: [Roles.Regular, Roles.Business] }), async (req, res) => {
        const now = new Date();
        const isRegular = req.account.role === Roles.Regular;
        const isBusiness = req.account.role === Roles.Business;
    
        const where = {
            status: "active",
            expiresAt: { gt: now },
            ...(isRegular && { userId: req.account.id }),
            ...(isBusiness && { job: { businessId: req.account.id } }),
        };
    
        const negotiation = await prisma.negotiation.findFirst({
            where,
            select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                expiresAt: true,
                candidateDecision: true,
                businessDecision: true,
                job: {
                    select: {
                        id: true,
                        status: true,
                        salary_min: true,
                        salary_max: true,
                        start_time: true,
                        end_time: true,
                        updatedAt: true,
                        positionType: {
                            select: { id: true, name: true },
                        },
                        business: {
                            select: { id: true, business_name: true },
                        },
                    },
                },
                user: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                    },
                },
            },
        });
    
        if (!negotiation) {
            return res.status(404).json({ error: "No active negotiation found" });
        }
        
        const formatDecision = (d) => d === true ? "accept" : d === false ? "decline" : null;

        return res.status(200).json({
            id: negotiation.id,
            status: negotiation.status,
            createdAt: negotiation.createdAt.toISOString(),
            updatedAt: negotiation.updatedAt.toISOString(),
            expiresAt: negotiation.expiresAt.toISOString(),
            job: {
                id: negotiation.job.id,
                status: negotiation.job.status,
                position_type: negotiation.job.positionType,
                business: negotiation.job.business,
                salary_min: negotiation.job.salary_min,
                salary_max: negotiation.job.salary_max,
                start_time: negotiation.job.start_time.toISOString(),
                end_time: negotiation.job.end_time.toISOString(),
                updatedAt: negotiation.job.updatedAt.toISOString(),
            },
            user: {
                id: negotiation.user.id,
                first_name: negotiation.user.first_name,
                last_name: negotiation.user.last_name,
            },
            decisions: {
                candidate: formatDecision(negotiation.candidateDecision),
                business: formatDecision(negotiation.businessDecision), 
            },
        });
    });

    app.patch("/negotiations/me/decision", auth({ roles: [Roles.Regular, Roles.Business] }), async (req, res) => {
        const error = validateAllowedFields(req.body, ["decision", "negotiation_id"]);
        if (error) {
            return res.status(400).json({ error });
        }
    
        const { decision, negotiation_id } = req.body;
        if (!Number.isInteger(negotiation_id) || negotiation_id < 1) {
            return res.status(400).json({ error: "Invalid or missing negotiation_id" });
        }
        if (decision !== "accept" && decision !== "decline") {
            return res.status(400).json({ error: "Invalid or missing decision" });
        }
    
        const isRegular = req.account.role === Roles.Regular;
        const isBusiness = req.account.role === Roles.Business;
        const now = new Date();

        const activeWhere = {
            id: negotiation_id,
            status: "active",
            expiresAt: { gt: now },
            ...(isRegular && { userId: req.account.id }),
            ...(isBusiness && { job: { businessId: req.account.id } }),
        };
    
        const negotiation = await prisma.negotiation.findFirst({
            where: activeWhere,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                status: true,
                createdAt: true,
                expiresAt: true,
                updatedAt: true,
                jobId: true,
                userId: true,
                interestId: true,
                candidateDecision: true,
                businessDecision: true,
                job: {
                    select: {
                        id: true,
                        businessId: true,
                    },
                },
            },
        });
    
        if (!negotiation) {
            return res.status(404).json({ error: "No active negotiation found" });
        }
        if (negotiation.id !== negotiation_id) {
            return res.status(409).json({ error: "negotiation_id does not match your current active negotiation" });
        }
    
        const isAccept = decision === "accept";
        const candidateDecision = isRegular ? isAccept : (negotiation.candidateDecision ?? null);
        const businessDecision = isBusiness ? isAccept : (negotiation.businessDecision ?? null);
    
        const formatDecision = (d) => d === true ? "accept" : d === false ? "decline" : null;
    
        const bothAccepted = candidateDecision === true && businessDecision === true;
        const anyDeclined = candidateDecision === false || businessDecision === false;
    
        let updatedNegotiation;
        if (bothAccepted) {
            updatedNegotiation = await prisma.$transaction(async (tx) => {
                const updated = await tx.negotiation.update({
                    where: { id: negotiation.id },
                    data: {
                        status: "success",
                        candidateDecision,
                        businessDecision,
                    },
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
                        expiresAt: true,
                        updatedAt: true,
                        candidateDecision: true,
                        businessDecision: true,
                    },
                });
    
                await tx.job.update({
                    where: { id: negotiation.jobId },
                    data: {
                        status: "filled",
                        workerId: negotiation.userId,
                    },
                });
    
                await tx.regularProfile.update({
                    where: { id: negotiation.userId },
                    data: { lastActiveAt: new Date() },
                });
    
                return updated;
            });

            const io = getIo();
            if (io) {
                const room = `negotiation:${negotiation.id}`;
                const sockets = await io.in(room).fetchSockets();
                for (const s of sockets) {
                    s.leave(room);
                }
            }
        } 
        else if (anyDeclined) {
            updatedNegotiation = await prisma.$transaction(async (tx) => {
                const updated = await tx.negotiation.update({
                    where: { id: negotiation.id },
                    data: {
                        status: "failed",
                        candidateDecision,
                        businessDecision,
                    },
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
                        expiresAt: true,
                        updatedAt: true,
                        candidateDecision: true,
                        businessDecision: true,
                    },
                });
                await tx.interest.update({
                    where: { id: negotiation.interestId },
                    data: {
                        candidateInterest: null,
                        businessInterest: null,
                    },
                });

                await tx.regularProfile.update({
                    where: { id: negotiation.userId },
                    data: {
                        lastActiveAt: new Date(),
                        available: true,
                    },
                });
    
                return updated;
            });
            const io = getIo();
            if (io) {
                const room = `negotiation:${negotiation.id}`;
                const sockets = await io.in(room).fetchSockets();
                for (const s of sockets) {
                    s.leave(room);
                }
            }
        } 
        else {
            updatedNegotiation = await prisma.negotiation.update({
                where: { id: negotiation.id },
                data: {
                    candidateDecision: isRegular ? isAccept : undefined,
                    businessDecision: isBusiness ? isAccept : undefined,
                },
                select: {
                    id: true,
                    status: true,
                    createdAt: true,
                    expiresAt: true,
                    updatedAt: true,
                    candidateDecision: true,
                    businessDecision: true,
                },
            });
        }

        const io = getIo();
        io.to(`negotiation:${updatedNegotiation.id}`).emit("negotiation:status_updated", {
            id: updatedNegotiation.id,
            status: updatedNegotiation.status,
            decisions: {
                candidate: formatDecision(updatedNegotiation.candidateDecision),
                business: formatDecision(updatedNegotiation.businessDecision),
            },
        });
    
        return res.status(200).json({
            id: updatedNegotiation.id,
            status: updatedNegotiation.status,
            createdAt: updatedNegotiation.createdAt.toISOString(),
            expiresAt: updatedNegotiation.expiresAt.toISOString(),
            updatedAt: updatedNegotiation.updatedAt.toISOString(),
            decisions: {
                candidate: formatDecision(updatedNegotiation.candidateDecision),
                business: formatDecision(updatedNegotiation.businessDecision),
            },
        });
    });

    app.use((req, res, next) => {
        for (const [path, methods] of Object.entries(allowedEndpoints)) {
            const regex = pathToRegex(path);
            if (regex.test(req.path)) {
                if (!methods.includes(req.method)) {
                    return res.status(405).json({ error: "Method Not Allowed" });
                }
                break;
            }
        }
        next();
    });

    app.use((req, res) => {
        return res.status(404).json({ error: "Path not found" });
    });

    return app;
}

module.exports = { JOB_START_WINDOW_HOURS, NEGOTIATION_WINDOW_SECONDS, create_app };