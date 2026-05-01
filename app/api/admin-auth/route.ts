import { NextResponse } from 'next/server';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

export function createAdminToken(): string {
  const ts = Date.now().toString();
  const sig = crypto.createHmac('sha256', ADMIN_PASSWORD).update(ts).digest('hex').slice(0, 16);
  return `ADMIN_${ts}_${sig}`;
}

export function verifyAdminToken(token: string): boolean {
  if (!ADMIN_PASSWORD || !token.startsWith('ADMIN_')) return false;
  const parts = token.split('_');
  if (parts.length !== 3) return false;
  const [, ts, sig] = parts;
  // Token valid for 2 hours
  const age = Date.now() - parseInt(ts, 10);
  if (isNaN(age) || age > 2 * 60 * 60 * 1000) return false;
  const expected = crypto.createHmac('sha256', ADMIN_PASSWORD).update(ts).digest('hex').slice(0, 16);
  return sig === expected;
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
    }

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = createAdminToken();
    return NextResponse.json({ token });

  } catch {
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}
