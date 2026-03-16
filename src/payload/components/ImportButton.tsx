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
    <div style={{ marginBottom: '20px', padding: '20px', background: 'var(--theme-elevation-50)', borderRadius: '8px' }}>
      <h3 style={{ margin: '0 0 10px 0' }}>Import LFFS</h3>
      <p style={{ margin: '0 0 15px 0', opacity: 0.7, fontSize: '14px' }}>
        Importer les classements et matchs depuis la LFFS
      </p>
      <button
        onClick={handleImport}
        disabled={loading}
        style={{
          padding: '10px 20px',
          background: loading ? 'var(--theme-elevation-150)' : 'var(--theme-success-500)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        {loading ? 'Import en cours...' : 'Importer maintenant'}
      </button>
      {result && (
        <p style={{
          marginTop: '10px',
          padding: '10px',
          background: result.startsWith('Erreur') ? 'var(--theme-error-100)' : 'var(--theme-success-100)',
          borderRadius: '4px',
          fontSize: '13px',
        }}>
          {result}
        </p>
      )}
    </div>
  )
}

export default ImportButton
