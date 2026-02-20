import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const text = searchParams.get('text')
    const lang = searchParams.get('lang') || 'th'

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "text" is required' },
        { status: 400 }
      )
    }

    // Limit text to 200 characters
    const truncatedText = text.slice(0, 200)

    const ttsUrl = new URL('https://translate.google.com/translate_tts')
    ttsUrl.searchParams.set('ie', 'UTF-8')
    ttsUrl.searchParams.set('tl', lang)
    ttsUrl.searchParams.set('client', 'tw-ob')
    ttsUrl.searchParams.set('q', truncatedText)

    const response = await fetch(ttsUrl.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch TTS audio' },
        { status: response.status }
      )
    }

    const audioBuffer = await response.arrayBuffer()

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Error fetching TTS:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch TTS audio' },
      { status: 500 }
    )
  }
}
