'use client'

import React, { useState } from 'react'

const ImportButton: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleImport = async () => {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/import/trigger', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()

      if (data.success) {
        const parts = []
        if (data.rankings?.updated) parts.push(`${data.rankings.updated} classements`)
        if (data.rankings?.message === 'unchanged') parts.push('classement inchange')
        if (data.matches?.created) parts.push(`${data.matches.created} matchs crees`)
        if (data.matches?.updated) parts.push(`${data.matches.updated} matchs mis a jour`)
        if (data.message) parts.push(data.message)
        setResult(parts.length > 0 ? parts.join(', ') : 'Import termine, rien de nouveau')
      } else {
        const errors = []
        if (data.rankings?.error) errors.push(`Rankings: ${data.rankings.error}`)
        if (data.matches?.error) errors.push(`Matches: ${data.matches.error}`)
        setResult(`Erreur: ${errors.join(' | ') || data.error || 'Erreur inconnue'}`)
      }
    } catch (err) {
      setResult(`Erreur: ${err instanceof Error ? err.message : 'Erreur reseau'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      marginBottom: '24px',
      padding: '24px',
      background: 'var(--theme-elevation-100)',
      borderRadius: '8px',
      border: '1px solid var(--theme-elevation-200)',
    }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Import LFFS</h3>
      <p style={{ margin: '0 0 16px 0', opacity: 0.7, fontSize: '14px' }}>
        Importer les classements et matchs depuis la LFFS
      </p>
      <button
        onClick={handleImport}
        disabled={loading}
        type="button"
        style={{
          padding: '10px 24px',
          background: loading ? 'var(--theme-elevation-200)' : '#fed164',
          color: '#122642',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 700,
          transition: 'opacity 0.2s',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Import en cours...' : 'Importer maintenant'}
      </button>
      {result && (
        <p style={{
          marginTop: '12px',
          padding: '10px 14px',
          background: result.startsWith('Erreur')
            ? 'rgba(255, 107, 107, 0.15)'
            : 'rgba(254, 209, 100, 0.15)',
          color: result.startsWith('Erreur') ? '#ff6b6b' : '#fed164',
          borderRadius: '6px',
          fontSize: '13px',
          border: result.startsWith('Erreur')
            ? '1px solid rgba(255, 107, 107, 0.3)'
            : '1px solid rgba(254, 209, 100, 0.3)',
        }}>
          {result}
        </p>
      )}
    </div>
  )
}

export default ImportButton
