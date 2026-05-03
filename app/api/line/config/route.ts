import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    liffId: process.env.LIFF_ID || '',
  })
}
