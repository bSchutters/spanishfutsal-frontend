import { NextRequest, NextResponse } from 'next/server'

import { estAdmin } from '@/hub/droits'
import { urlAbonnement } from '@/hub/flux/base-url'
import { chargerFluxParId } from '@/hub/flux/donnees'
import { qrPng, qrSvg } from '@/hub/flux/qr'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

/**
 * Le QR code d un flux, pour l administration : /api/hub/qr/3.png ou .svg.
 * Reserve aux administrateurs, comme la fiche qui l affiche.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: request.headers })
  if (!estAdmin(user)) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { id: segment } = await params
  const format = /\.svg$/i.test(segment) ? 'svg' : 'png'
  const id = Number(segment.replace(/\.(png|svg)$/i, ''))
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })

  const flux = await chargerFluxParId(id)
  if (!flux) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const url = urlAbonnement(flux.token)
  const nom = `qr-abonnement-${flux.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const telecharger = request.nextUrl.searchParams.get('telecharger') === '1'
  const disposition = `${telecharger ? 'attachment' : 'inline'}; filename="${nom}.${format}"`

  if (format === 'svg') {
    return new NextResponse(await qrSvg(url), {
      headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Content-Disposition': disposition, 'Cache-Control': 'private, no-store' },
    })
  }
  const png = await qrPng(url)
  return new NextResponse(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Content-Disposition': disposition, 'Cache-Control': 'private, no-store' },
  })
}
