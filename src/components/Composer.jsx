import { useState } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'

export function Composer({ currentUser, replyTo }) {
  const [text, setText] = useState('')
  const [isAI, setIsAI] = useState(false)

  async function send() {
    if (!text.trim()) return
    await supabase.from('messages').insert({
      sender: currentUser,
      content: text.trim(),
      is_ai_generated: isAI,
      thread_id: replyTo || null
    })
    setText('')
    setIsAI(false)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send()
  }

  return (
    <div class="composer">
      <textarea
        value={text}
        onInput={e => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="输入消息… (Ctrl+Enter 发送)"
        rows={3}
      />
      <div class="composer-actions">
        <button
          class={`ai-toggle ${isAI ? 'active' : ''}`}
          onClick={() => setIsAI(v => !v)}
          title="标记为 AI 生成"
        >✦</button>
        <button onClick={send}>发送</button>
      </div>
    </div>
  )
}
