'use client'

import React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const BASE = '/admin/collections/sponsors'

const TABS = [
  {
    key: 'sponsor',
    label: 'Sponsors',
    query: 'where[active][equals]=true&where[type][equals]=sponsor',
  },
  {
    key: 'partner',
    label: 'Partenaires',
    query: 'where[active][equals]=true&where[type][equals]=partner',
  },
  { key: 'inactive', label: 'Inactifs', query: 'where[active][equals]=false' },
  // Un `where` reel plutot qu'un marqueur maison : Payload le conserve en
  // paginant et son panneau de filtres sait le representer.
  { key: 'all', label: 'Tous', query: 'where[active][exists]=true' },
] as const

/**
 * Sans `where` dans l'URL, `baseFilter` n'a laisse passer que les sponsors
 * actifs : c'est l'onglet correspondant qui doit apparaitre selectionne.
 */
function currentTab(params: URLSearchParams): string {
  if (params.has('where[active][exists]')) return 'all'
  if (params.get('where[active][equals]') === 'false') return 'inactive'
  if (params.get('where[type][equals]') === 'partner') return 'partner'
  return 'sponsor'
}

const SponsorStatusTabs: React.FC = () => {
  const searchParams = useSearchParams()
  const current = currentTab(new URLSearchParams(searchParams.toString()))

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
        const isActive = current === tab.key

        return (
          <Link
            key={tab.key}
            href={`${BASE}?${tab.query}`}
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
