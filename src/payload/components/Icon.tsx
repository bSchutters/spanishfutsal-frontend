'use client'

import React from 'react'
import Image from 'next/image'

const Icon: React.FC = () => {
  return (
    <Image
      src="/assets/images/svg/logo-asturiana.svg"
      alt="UD Asturiana"
      width={24}
      height={24}
    />
  )
}

export default Icon
