'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import React, { useState } from 'react'

/**
 * Sur la fiche d un flux : le lien du flux, le lien de la page d abonnement,
 * le QR code a telecharger et le bouton qui regenere le jeton. Les adresses
 * sont celles du site en ligne, pas celles du navigateur, pour que le QR
 * imprime pointe au bon endroit meme genere depuis un poste de developpement.
 */
const FluxAbonnement: React.FC<{ baseUrl: string }> = ({ baseUrl }) => {
  const { id } = useDocumentInfo()
  const token = useFormFields(([fields]) => fields.token?.value as string | undefined)
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (!id || !token) {
    return <p style={{ opacity: 0.7, fontSize: '13px' }}>Enregistrez le flux : son lien et son QR code apparaitront ici.</p>
  }

  const urlFlux = `${baseUrl}/api/hub/flux/${encodeURIComponent(token)}.ics`
  const urlAbonnement = `${baseUrl}/abonnement/${encodeURIComponent(token)}`

  const regenerer = async () => {
    const confirme = window.confirm(
      'Regenerer le jeton ? Les personnes abonnees avec l ancien lien ne recevront plus rien et devront se reabonner.'
    )
    if (!confirme) return
    setEnCours(true)
    setMessage(null)
    try {
      const reponse = await fetch(`/api/hub/regenerer-jeton/${id}`, { method: 'POST', credentials: 'include' })
      if (!reponse.ok) throw new Error(String(reponse.status))
      window.location.reload()
    } catch {
      setMessage('La regeneration a echoue. Rechargez la page et reessayez.')
      setEnCours(false)
    }
  }

  const copier = async (valeur: string) => {
    try {
      await navigator.clipboard.writeText(valeur)
      setMessage('Lien copie.')
    } catch {
      setMessage('Impossible de copier, selectionnez le lien a la main.')
    }
  }

  const bouton: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid var(--theme-elevation-200)',
    background: 'var(--theme-elevation-100)',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '13px',
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: '16px',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid var(--theme-elevation-200)',
        background: 'var(--theme-elevation-50)',
      }}
    >
      <div style={{ display: 'grid', gap: '6px' }}>
        <strong style={{ fontSize: '13px' }}>Lien du flux</strong>
        <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>{urlFlux}</code>
        <div>
          <button type="button" style={bouton} onClick={() => copier(urlFlux)}>
            Copier le lien du flux
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '6px' }}>
        <strong style={{ fontSize: '13px' }}>Page d abonnement</strong>
        <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>{urlAbonnement}</code>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" style={bouton} onClick={() => copier(urlAbonnement)}>
            Copier le lien
          </button>
          <a href={urlAbonnement} target="_blank" rel="noopener noreferrer" style={{ ...bouton, textDecoration: 'none' }}>
            Ouvrir la page
          </a>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Image generee a la demande et reservee aux administrateurs : next/image n y apporterait rien. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/hub/qr/${id}.png`}
          alt={`QR code de la page d abonnement`}
          width={160}
          height={160}
          style={{ borderRadius: '8px', background: '#fff' }}
        />
        <div style={{ display: 'grid', gap: '8px', alignContent: 'start' }}>
          <strong style={{ fontSize: '13px' }}>QR code</strong>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>Il mene a la page d abonnement. A imprimer ou a envoyer.</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <a href={`/api/hub/qr/${id}.png?telecharger=1`} style={{ ...bouton, textDecoration: 'none' }}>
              Telecharger en PNG
            </a>
            <a href={`/api/hub/qr/${id}.svg?telecharger=1`} style={{ ...bouton, textDecoration: 'none' }}>
              Telecharger en SVG
            </a>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={regenerer}
          disabled={enCours}
          style={{ ...bouton, borderColor: 'var(--theme-error-500)', color: 'var(--theme-error-400)' }}
        >
          {enCours ? 'Regeneration...' : 'Regenerer le jeton'}
        </button>
        <span style={{ fontSize: '12px', opacity: 0.7 }}>L ancien lien cesse de fonctionner immediatement.</span>
      </div>

      {message ? <p style={{ margin: 0, fontSize: '12px' }}>{message}</p> : null}
    </div>
  )
}

export default FluxAbonnement
