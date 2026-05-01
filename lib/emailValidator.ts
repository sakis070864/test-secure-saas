// ═══════════════════════════════════════════════════════════════
//  TOKEN SYSTEM — SaaS Version (Stripe-gated, no email restriction)
//  Users who PAY get full access regardless of email domain
// ═══════════════════════════════════════════════════════════════

type TokenPayload = {
  email: string;
  url: string;
  exp: number;
  sessionId: string; // Stripe session ID
};

export function createToken(email: string, url: string, sessionId: string): string {
  const payload: TokenPayload = {
    email,
    url,
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days for paid users
    sessionId,
  };
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString('base64url');
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf-8');
    const payload: TokenPayload = JSON.parse(json);
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
