'use strict';

const Roles = Object.freeze({
    Regular: 'regular',
    Business: 'business',
    Admin: 'admin'
});

const QualificationStatus = Object.freeze({
    Created: 'created',
    Submitted: 'submitted',
    Approved: 'approved',
    Rejected: 'rejected',
    Revised: 'revised',
});

module.exports = {
    Roles,
    QualificationStatus
};