'use client'

import React from 'react'
import Image from 'next/image'

const Logo: React.FC = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Image
        src="/assets/images/svg/logo-asturiana.svg"
        alt="UD Asturiana"
        width={40}
        height={40}
      />
      <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--theme-text)' }}>
        UD Asturiana
      </span>
    </div>
  )
}

export default Logo
