'use client'

import React from 'react'
import Link from 'next/link'

const DashboardLink: React.FC = () => {
  return (
    <nav style={{ padding: '0 16px 8px' }}>
      <Link
        href="/admin"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 0',
          color: 'var(--theme-text)',
          textDecoration: 'none',
          fontSize: '13px',
        }}
      >
        Dashboard
      </Link>
    </nav>
  )
}

export default DashboardLink
