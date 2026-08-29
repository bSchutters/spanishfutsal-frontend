'use client'

import React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const BASE = '/admin/collections/sponsors'

const TABS = [
  { label: 'Actifs', href: `${BASE}?where[active][equals]=true`, match: 'true' },
  { label: 'Inactifs', href: `${BASE}?where[active][equals]=false`, match: 'false' },
  // Un vrai `where`, que Payload conserve en paginant, et qui neutralise le
  // filtre par defaut de la collection tout en gardant tous les sponsors.
  { label: 'Tous', href: `${BASE}?where[id][exists]=true`, match: 'all' },
] as const

const SponsorStatusTabs: React.FC = () => {
  const searchParams = useSearchParams()
  const filter = searchParams.get('where[active][equals]')

  // Sans parametre, `baseFilter` n'a laisse passer que les actifs : l'onglet
  // correspondant doit donc apparaitre selectionne.
  const current = filter ?? (searchParams.has('where[id][exists]') ? 'all' : 'true')

  return (
    <nav
      style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '16px',
        borderBottom: '1px solid var(--theme-elevation-150)',
      }}
    >
      {TABS.map((tab) => {
        const isActive = current === tab.match

        return (
          <Link
            key={tab.label}
            href={tab.href}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
              color: isActive ? '#fed164' : 'var(--theme-elevation-600)',
              borderBottom: `2px solid ${isActive ? '#fed164' : 'transparent'}`,
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}

export default SponsorStatusTabs
