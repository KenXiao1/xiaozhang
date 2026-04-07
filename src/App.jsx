import { useState, useEffect } from 'preact/hooks'
import { getUser, clearToken } from './lib/auth.js'
import { supabase } from './lib/supabase.js'
import { DappledLight } from './components/DappledLight.jsx'
import { Login } from './components/Login.jsx'
import { MessageList } from './components/MessageList.jsx'
import { Composer } from './components/Composer.jsx'

export function App() {
  const [user, setUser] = useState(() => getUser())
  const [messages, setMessages] = useState([])
  const [annotations, setAnnotations] = useState({})
  const [mode, setMode] = useState(() => localStorage.getItem('viewMode') || 'stream')
  const [dark, setDark] = useState(false)
  const [replyTo, setReplyTo] = useState(null)

  useEffect(() => {
    if (!user) return
    loadMessages()
    loadAnnotations()

    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        payload => setMessages(prev => [...prev, payload.new]))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'annotations' },
        () => loadAnnotations())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  async function loadMessages() {
    const { data } = await supabase.from('messages').select('*').order('created_at')
    setMessages(data || [])
  }

  async function loadAnnotations() {
    const { data } = await supabase.from('annotations').select('*')
    const map = {}
    for (const a of data || []) {
      if (!map[a.message_id]) map[a.message_id] = []
      map[a.message_id].push(a)
    }
    setAnnotations(map)
  }

  function toggleMode(m) {
    setMode(m)
    localStorage.setItem('viewMode', m)
  }

  function toggleDark() {
    setDark(d => !d)
    document.body.classList.toggle('animation-ready', true)
    document.body.classList.toggle('dark')
  }

  if (!user) return (
    <>
      <DappledLight />
      <Login onLogin={setUser} />
    </>
  )

  return (
    <div class={dark ? 'dark' : ''}>
      <DappledLight />
      <div class="chat-layout">
        <header class="chat-header">
          <span class="chat-title">Cheny & Xiao</span>
          <div class="header-actions">
            <button class={mode === 'stream' ? 'active' : ''} onClick={() => toggleMode('stream')}>流式</button>
            <button class={mode === 'thread' ? 'active' : ''} onClick={() => toggleMode('thread')}>缩进</button>
            <button onClick={toggleDark}>☀</button>
            <button onClick={() => { clearToken(); setUser(null) }}>退出</button>
          </div>
        </header>
        <MessageList
          messages={messages}
          currentUser={user.username}
          annotations={annotations}
          mode={mode}
          onAnnotationSaved={loadAnnotations}
          onReply={setReplyTo}
        />
        <Composer currentUser={user.username} replyTo={replyTo} onClearReply={() => setReplyTo(null)} />
      </div>
    </div>
  )
}
