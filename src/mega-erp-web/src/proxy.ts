import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    // exp is in seconds; Date.now() is in milliseconds
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  const { pathname } = request.nextUrl

  const hasValidToken = token && !isTokenExpired(token)

  if (pathname.startsWith('/dashboard') && !hasValidToken) {
    const response = NextResponse.redirect(new URL('/auth/login', request.url))
    // Clear the stale cookie if present
    if (token) response.cookies.delete('auth-token')
    return response
  }
  if (pathname.startsWith('/auth') && hasValidToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}
