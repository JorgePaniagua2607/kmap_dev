const crypto = require('crypto');

function generateEnrollmentCode(prefix = 'KMAP') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    suffix += chars[bytes[i] % chars.length];
  }
  return `${prefix}-${suffix}`;
}

module.exports = {
  generateEnrollmentCode
};
