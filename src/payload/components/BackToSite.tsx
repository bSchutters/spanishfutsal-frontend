'use client'

import React from 'react'
import Link from 'next/link'

const BackToSite: React.FC = () => {
  return (
    <Link
      href="/"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        color: '#fed164',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: 500,
        borderTop: '1px solid var(--theme-elevation-200)',
        transition: 'opacity 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
      Retour au site
    </Link>
  )
}

export default BackToSite
