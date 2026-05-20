/** 32-char hex invite code (matches Convex `secureInviteCode`). */
export function generateInviteCode(): string {
  const buf = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < buf.length; i++) {
      buf[i] = Math.floor(Math.random() * 256);
    }
  }
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
