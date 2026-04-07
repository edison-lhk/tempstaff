const isNonEmptyString = (x) => typeof x === 'string' && x.trim().length > 0;

const isValidEmail = (email) => {
    if (typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const isValidPassword = (password) => {
    if (typeof password !== 'string') return false;
    if (password.length < 8 || password.length > 20) return false;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNum = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    return hasLower && hasUpper && hasNum && hasSpecial;
};

const isValidBirthday = (birthday) => {
    if (typeof birthday !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return false;
    const date = new Date(`${birthday}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return false;
    return date.toISOString().slice(0, 10) === birthday;
};

const isValidStrBool = (x) => {
    if (typeof x !== 'string') return false;
    return x === 'true' || x === 'false';
};

const parseBool = (str) => {
    return str === 'true' ? true : (str === 'false' ? false : undefined);
};

const validateAllowedFields = (fields, allowedFields, requireAtLeastOne = true) => {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    return "Invalid payload";
  }

  const allowed = new Set(allowedFields);

  for (const key of Object.keys(fields)) {
    if (!allowed.has(key)) {
      return `Invalid field`;
    }
  }

  if (requireAtLeastOne && Object.keys(fields).length === 0) {
    return "There are no fields provided";
  }

  return null;
}

const pathToRegex = (path) => {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withParams = escaped.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "[^/]+");
  return new RegExp(`^${withParams}$`);
}

module.exports = {
  isNonEmptyString,
  isValidEmail,
  isValidPassword,
  isValidBirthday,
  isValidStrBool,
  parseBool,
  validateAllowedFields,
  pathToRegex
};