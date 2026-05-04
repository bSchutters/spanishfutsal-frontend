import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { tags } = await request.json() as { tags?: string[] }

    if (!tags || !Array.isArray(tags)) {
      return NextResponse.json({ error: 'Missing tags array' }, { status: 400 })
    }

    for (const tag of tags) {
      revalidateTag(tag)
    }

    return NextResponse.json({ revalidated: tags })
  } catch (error) {
    console.error('Revalidation error:', error)
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 })
  }
}
