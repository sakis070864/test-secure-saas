import { NextResponse } from 'next/server';
import { decodeToken } from '@/lib/emailValidator';
import { performDeepScan } from '@/lib/scanner';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const payload = decodeToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Report link expired or invalid. Please purchase a new scan.' }, { status: 404 });
  }

  try {
    const result = await performDeepScan(payload.url);
    return NextResponse.json({
      result,
      email: payload.email,
      url: payload.url,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Scan failed' }, { status: 500 });
  }
}
