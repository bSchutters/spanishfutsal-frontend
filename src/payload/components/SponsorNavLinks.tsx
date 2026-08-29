'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

const BASE = '/admin/collections/sponsors'

const LISTS = [
  { label: 'Sponsors actifs', filter: 'true' },
  { label: 'Sponsors inactifs', filter: 'false' },
]

const SponsorNavLinks: React.FC = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('where[active][equals]')

  return (
    <nav style={{ padding: '8px 0' }}>
      {LISTS.map(({ label, filter }) => {
        const isActive = pathname === BASE && current === filter

        return (
          <Link
            key={filter}
            href={`${BASE}?where[active][equals]=${filter}`}
            style={{
              display: 'block',
              padding: '4px 0',
              fontSize: '14px',
              textDecoration: 'none',
              color: isActive ? '#fed164' : 'var(--theme-text)',
              fontWeight: isActive ? 600 : 400,
            }}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export default SponsorNavLinks
