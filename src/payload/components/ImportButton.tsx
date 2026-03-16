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
        if (data.rankings?.message === 'unchanged') parts.push('Classement inchange')
        if (data.matches?.created) parts.push(`${data.matches.created} matchs crees`)
        if (data.matches?.updated) parts.push(`${data.matches.updated} matchs mis a jour`)
        if (data.message) parts.push(data.message)
        setResult(parts.length > 0 ? parts.join(' · ') : 'Import termine, rien de nouveau')
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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      marginBottom: '24px',
      padding: '16px 20px',
      background: 'var(--theme-elevation-100)',
      borderRadius: '8px',
      border: '1px solid var(--theme-elevation-200)',
    }}>
      <div>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Import LFFS</h4>
        <p style={{ margin: '2px 0 0', opacity: 0.6, fontSize: '13px' }}>
          Classements et matchs
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {result && (
          <span style={{
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '4px',
            background: result.startsWith('Erreur')
              ? 'rgba(255, 107, 107, 0.15)'
              : 'rgba(254, 209, 100, 0.15)',
            color: result.startsWith('Erreur') ? '#ff6b6b' : '#fed164',
          }}>
            {result}
          </span>
        )}
        <button
          onClick={handleImport}
          disabled={loading}
          type="button"
          style={{
            padding: '8px 16px',
            background: loading ? 'var(--theme-elevation-200)' : '#fed164',
            color: '#122642',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 700,
            opacity: loading ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Import...' : 'Importer'}
        </button>
      </div>
    </div>
  )
}

export default ImportButton
