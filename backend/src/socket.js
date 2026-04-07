'use strict';

const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware/auth');
const { setIo } = require('./io');

const prisma = new PrismaClient();

function attach_sockets(server) {
  const io = new Server(server, { cors: { origin: '*' } });

  setIo(io);

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
        return next(new Error('Not authenticated'));
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        const account = await prisma.account.findUnique({
            where: { id: payload.id },
            select: { id: true, role: true, activated: true },
        });

        if (!account || !account.activated) {
            return next(new Error('Not authenticated'));
        }
        socket.accountId = account.id;
        socket.role = account.role;
        next();
    } catch (err) {
        return next(new Error('Not authenticated'));
    }
  });

  io.on('connection', async (socket) => {
    // TODO: join rooms, handle events, etc.
    socket.join(`account:${socket.accountId}`);
        const now = new Date();
        const activeNegotiation = await prisma.negotiation.findFirst({
            where: {
                status: 'active',
                expiresAt: { gt: now },
                OR: [
                    { userId: socket.accountId },
                    { job: { businessId: socket.accountId } },
                ],
            },
            select: { id: true },
        });

        if (activeNegotiation) {
            socket.join(`negotiation:${activeNegotiation.id}`);
        }

        socket.on('negotiation:message', async (data) => {
            const { negotiation_id, text } = data ?? {};
            if (!Number.isInteger(negotiation_id) || negotiation_id < 1) {
                return socket.emit('negotiation:error', {
                    error: 'Negotiation not found (or not active)',
                    message: 'Invalid negotiation_id',
                });
            }
            if (typeof text !== 'string' || text.trim() === '') {
                return socket.emit('negotiation:error', {
                    error: 'Negotiation not found (or not active)',
                    message: 'Invalid or missing text',
                });
            }

            const negotiation = await prisma.negotiation.findUnique({
                where: { id: negotiation_id },
                select: {
                    id: true,
                    status: true,
                    expiresAt: true,
                    userId: true,
                    job: {
                        select: { businessId: true },
                    },
                },
            });

            if (!negotiation || negotiation.status !== 'active' || negotiation.expiresAt <= now) {
                return socket.emit('negotiation:error', {
                    error: 'Negotiation not found (or not active)',
                    message: 'This negotiation does not exist or is no longer active',
                });
            }

            const isCandidate = negotiation.userId === socket.accountId;
            const isBusiness = negotiation.job.businessId === socket.accountId;
            if (!isCandidate && !isBusiness) {
                return socket.emit('negotiation:error', {
                    error: 'Not part of this negotiation',
                    message: 'You are not a party in this negotiation',
                });
            }

            const userActiveNegotiation = await prisma.negotiation.findFirst({
                where: {
                    status: 'active',
                    expiresAt: { gt: now },
                    OR: [
                        { userId: socket.accountId },
                        { job: { businessId: socket.accountId } },
                    ],
                },
                orderBy: { createdAt: 'desc' },
                select: { id: true },
            });

            if (!userActiveNegotiation || userActiveNegotiation.id !== negotiation_id) {
                return socket.emit('negotiation:error', {
                    error: 'Negotiation mismatch (negotiation id is not that of the authenticated user\'s active negotiation)',
                    message: 'The negotiation_id does not match your current active negotiation',
                });
            }

            const message = {
                negotiation_id,
                sender: {
                    role: socket.role,
                    id: socket.accountId,
                },
                text: text.trim(),
                createdAt: new Date().toISOString(),
            };

            io.to(`negotiation:${negotiation_id}`).emit('negotiation:message', message);
        });
    });

  return io;
}

module.exports = { attach_sockets };