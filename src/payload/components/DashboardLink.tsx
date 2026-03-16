'use client'

import React from 'react'
import Link from 'next/link'

const DashboardLink: React.FC = () => {
  return (
    <Link
      href="/admin"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        color: 'var(--theme-text)',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: 500,
        borderBottom: '1px solid var(--theme-elevation-200)',
        transition: 'opacity 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
      Dashboard
    </Link>
  )
}

export default DashboardLink
