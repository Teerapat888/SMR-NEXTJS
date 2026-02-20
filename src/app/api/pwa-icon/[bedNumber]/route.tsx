import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { formatBedNumber } from '@/lib/helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bedNumber: string }> }
) {
  const { bedNumber } = await params
  const { searchParams } = new URL(request.url)
  const size = parseInt(searchParams.get('size') || '192', 10)
  const maskable = searchParams.get('maskable') === '1'

  const label = formatBedNumber(bedNumber)
  const isSpecial = label === 'จุดคัดกรอง' || label === 'VVIP'
  const displayText = isSpecial ? label : bedNumber

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
          borderRadius: maskable ? 0 : size * 0.2,
          padding: maskable ? size * 0.15 : 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: isSpecial ? size * 0.15 : size * 0.45,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {displayText}
        </div>
        <div
          style={{
            display: 'flex',
            color: 'rgba(255,255,255,0.8)',
            fontSize: size * 0.1,
            fontWeight: 600,
            marginTop: size * 0.03,
          }}
        >
          Smart ER
        </div>
      </div>
    ),
    { width: size, height: size }
  )
}
