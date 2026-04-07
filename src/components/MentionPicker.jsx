import { useState, useEffect, useRef } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'

export function MentionPicker({ currentSession, onSelect, onClose, position, searchQuery }) {
  const [step, setStep] = useState('sessions') // 'sessions' | 'messages'
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const pickerRef = useRef(null)

  useEffect(() => {
    loadSessions()

    // 点击外部关闭
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (selectedSession) {
      loadMessages(selectedSession.id)
    }
  }, [selectedSession])

  // 重置选中索引当搜索词或步骤改变时
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery, step])

  async function loadSessions() {
    const { data } = await supabase.from('sessions').select('*').order('created_at', { ascending: false })
    // 过滤掉当前 session
    setSessions((data || []).filter(s => s.id !== currentSession?.id))
  }

  async function loadMessages(sessionId) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(20)
    setMessages(data || [])
  }

  function selectSession(session) {
    setSelectedSession(session)
    setStep('messages')
  }

  function selectMessage(msg) {
    onSelect({
      sessionId: selectedSession.id,
      sessionName: selectedSession.name,
      messageId: msg.id,
      sender: msg.sender,
      content: msg.content
    })
  }

  function goBack() {
    setStep('sessions')
    setSelectedSession(null)
    setMessages([])
  }

  // 关键词过滤
  const filteredSessions = sessions.filter(s =>
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredMessages = messages.filter(m =>
    !searchQuery ||
    m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.sender.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 键盘导航
  useEffect(() => {
    function handleKeyDown(e) {
      const items = step === 'sessions' ? filteredSessions : filteredMessages
      if (items.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % items.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + items.length) % items.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (step === 'sessions') {
          selectSession(items[selectedIndex])
        } else {
          selectMessage(items[selectedIndex])
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [step, selectedIndex, filteredSessions, filteredMessages])

  return (
    <div
      ref={pickerRef}
      class="mention-picker"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      {step === 'sessions' ? (
        <>
          <div class="mention-picker-header">
            <span>Select Session {searchQuery && `(${filteredSessions.length})`}</span>
          </div>
          <div class="mention-picker-list">
            {filteredSessions.length === 0 ? (
              <div class="mention-picker-empty">
                {searchQuery ? `No sessions matching "${searchQuery}"` : 'No other sessions'}
              </div>
            ) : (
              filteredSessions.map((session, idx) => (
                <div
                  key={session.id}
                  class={`mention-picker-item ${idx === selectedIndex ? 'selected' : ''}`}
                  onClick={() => selectSession(session)}
                >
                  <span class="mention-session-name">{session.name}</span>
                  <span class="mention-session-creator">by {session.creator}</span>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div class="mention-picker-header">
            <button class="mention-back-btn" onClick={goBack}>‹</button>
            <span>{selectedSession.name} {searchQuery && `(${filteredMessages.length})`}</span>
          </div>
          <div class="mention-picker-list">
            {filteredMessages.length === 0 ? (
              <div class="mention-picker-empty">
                {searchQuery ? `No messages matching "${searchQuery}"` : 'No messages in this session'}
              </div>
            ) : (
              filteredMessages.map((msg, idx) => (
                <div
                  key={msg.id}
                  class={`mention-picker-item ${idx === selectedIndex ? 'selected' : ''}`}
                  onClick={() => selectMessage(msg)}
                >
                  <div class="mention-msg-sender">{msg.sender}</div>
                  <div class="mention-msg-content">
                    {msg.content.slice(0, 60)}{msg.content.length > 60 ? '…' : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
