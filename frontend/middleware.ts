import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Pega o token do localStorage via cookie ou header
  // Por enquanto, vamos permitir acesso (a verificação será feita no client)
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/teams/:path*', '/championships/:path*'],
};
