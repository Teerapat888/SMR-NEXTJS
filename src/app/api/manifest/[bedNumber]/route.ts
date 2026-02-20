import { NextRequest, NextResponse } from 'next/server'
import { formatBedNumber } from '@/lib/helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bedNumber: string }> }
) {
  const { bedNumber } = await params
  const label = formatBedNumber(bedNumber)
  const prefix = (label === 'จุดคัดกรอง' || label === 'VVIP') ? '' : 'เตียง '

  const manifest = {
    name: `Smart ER - ${prefix}${label}`,
    short_name: `${prefix}${label}`,
    description: `ระบบจัดการเตียงผู้ป่วย - ${prefix}${label}`,
    start_url: `/bed/${bedNumber}`,
    scope: `/bed/${bedNumber}`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f1f5f9',
    theme_color: '#0d9488',
    icons: [
      {
        src: `/api/pwa-icon/${bedNumber}?size=192`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/api/pwa-icon/${bedNumber}?size=512`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/api/pwa-icon/${bedNumber}?size=512&maskable=1`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
