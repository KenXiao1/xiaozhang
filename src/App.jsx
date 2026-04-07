import { useState, useEffect } from 'preact/hooks'
import { getUser, clearToken } from './lib/auth.js'
import { supabase } from './lib/supabase.js'
import { DappledLight } from './components/DappledLight.jsx'
import { Login } from './components/Login.jsx'
import { MessageList } from './components/MessageList.jsx'
import { Composer } from './components/Composer.jsx'
import { SessionSidebar } from './components/SessionSidebar.jsx'

export function App() {
  const [user, setUser] = useState(() => getUser())
  const [sessions, setSessions] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [annotations, setAnnotations] = useState({})
  const [mode, setMode] = useState(() => localStorage.getItem('viewMode') || 'stream')
  const [dark, setDark] = useState(false)
  const [replyTo, setReplyTo] = useState(null)

  useEffect(() => {
    if (!user) return
    loadSessions()

    const channel = supabase
      .channel('sessions-and-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions' },
        payload => setSessions(prev => [...prev, payload.new]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions' },
        payload => setSessions(prev => prev.map(s => s.id === payload.new.id ? payload.new : s)))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        payload => {
          if (payload.new.session_id === currentSession?.id) {
            setMessages(prev => [...prev, payload.new])
          }
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'annotations' },
        () => loadAnnotations())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user, currentSession])

  useEffect(() => {
    if (currentSession) {
      loadMessages()
      loadAnnotations()
    }
  }, [currentSession])

  async function createSession() {
    const sessionCount = sessions.length + 1
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        name: `Session ${sessionCount}`,
        creator: user.username
      })
      .select()
      .single()

    if (data) {
      setSessions(prev => [...prev, data])
      setCurrentSession(data)
    }
  }

  async function loadSessions() {
    const { data } = await supabase.from('sessions').select('*').order('created_at')
    setSessions(data || [])

    // 如果有 session，自动选中第一个
    if (data && data.length > 0) {
      setCurrentSession(data[0])
    } else {
      // 如果没有 session，创建一个默认的
      await createSession()
    }
  }

  async function loadMessages() {
    if (!currentSession) return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', currentSession.id)
      .order('created_at')
    setMessages(data || [])
  }

  async function loadAnnotations() {
    if (!currentSession) return
    // 只加载当前 session 的消息的注释
    const { data: sessionMessages } = await supabase
      .from('messages')
      .select('id')
      .eq('session_id', currentSession.id)

    const messageIds = (sessionMessages || []).map(m => m.id)
    if (messageIds.length === 0) {
      setAnnotations({})
      return
    }

    const { data } = await supabase
      .from('annotations')
      .select('*')
      .in('message_id', messageIds)

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

  function selectSession(session) {
    setCurrentSession(session)
    setMessages([]) // 立即清空消息，避免显示旧 session 的消息
    setReplyTo(null)
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
        <SessionSidebar
          sessions={sessions}
          currentSession={currentSession}
          currentUser={user.username}
          onSelectSession={selectSession}
          onCreateSession={createSession}
        />
        <div class="chat-main">
          <header class="chat-header">
            <div class="header-left">
              <span class="chat-title">Cheny & Xiao</span>
              <a class="github-link" href="https://github.com/KenXiao1/xiaozhang" target="_blank" rel="noopener" aria-label="GitHub">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
              </a>
            </div>
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
          <Composer currentUser={user.username} currentSession={currentSession} replyTo={replyTo} onClearReply={() => setReplyTo(null)} />
        </div>
      </div>
    </div>
  )
}
