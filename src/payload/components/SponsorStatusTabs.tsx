'use client'

import React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const BASE = '/admin/collections/sponsors'

const TABS = [
  { label: 'Tous', value: null, href: BASE },
  { label: 'Actifs', value: 'true', href: `${BASE}?where[active][equals]=true` },
  { label: 'Inactifs', value: 'false', href: `${BASE}?where[active][equals]=false` },
] as const

const SponsorStatusTabs: React.FC = () => {
  const searchParams = useSearchParams()
  const current = searchParams.get('where[active][equals]')

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
        const isActive = current === tab.value

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
