import { useState, useEffect, useRef } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'

export function MentionPicker({ currentSession, onSelect, onClose, position }) {
  const [step, setStep] = useState('sessions') // 'sessions' | 'messages'
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [messages, setMessages] = useState([])
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

  return (
    <div
      ref={pickerRef}
      class="mention-picker"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      {step === 'sessions' ? (
        <>
          <div class="mention-picker-header">
            <span>选择对话</span>
          </div>
          <div class="mention-picker-list">
            {sessions.length === 0 ? (
              <div class="mention-picker-empty">没有其他对话</div>
            ) : (
              sessions.map(session => (
                <div
                  key={session.id}
                  class="mention-picker-item"
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
            <span>{selectedSession.name}</span>
          </div>
          <div class="mention-picker-list">
            {messages.length === 0 ? (
              <div class="mention-picker-empty">该对话暂无消息</div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  class="mention-picker-item"
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
