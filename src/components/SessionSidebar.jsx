import { useState } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'

export function SessionSidebar({ sessions, currentSession, currentUser, onSelectSession, onCreateSession }) {
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  function startEdit(session) {
    if (session.creator !== currentUser) return
    setEditingId(session.id)
    setEditName(session.name)
  }

  async function saveEdit(sessionId) {
    if (!editName.trim()) return
    await supabase
      .from('sessions')
      .update({ name: editName.trim() })
      .eq('id', sessionId)
    setEditingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
  }

  return (
    <div class="session-sidebar">
      <div class="sidebar-header">
        <h3>对话列表</h3>
        <button class="new-session-btn" onClick={onCreateSession} title="新建对话">+</button>
      </div>
      <div class="session-list">
        {sessions.map(session => (
          <div
            key={session.id}
            class={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
            onClick={() => onSelectSession(session)}
          >
            {editingId === session.id ? (
              <div class="session-edit" onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  value={editName}
                  onInput={e => setEditName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveEdit(session.id)
                    if (e.key === 'Escape') cancelEdit()
                  }}
                  autoFocus
                />
                <button onClick={() => saveEdit(session.id)}>✓</button>
                <button onClick={cancelEdit}>✕</button>
              </div>
            ) : (
              <div class="session-info">
                <span class="session-name">{session.name}</span>
                {session.creator === currentUser && (
                  <button
                    class="edit-btn"
                    onClick={e => {
                      e.stopPropagation()
                      startEdit(session)
                    }}
                    title="重命名"
                  >✎</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
