import { useState } from 'preact/hooks'
import MarkdownIt from 'markdown-it'
import { supabase } from '../lib/supabase.js'

const md = new MarkdownIt()

export function Composer({ currentUser, replyTo, onClearReply }) {
  const [text, setText] = useState('')
  const [isAI, setIsAI] = useState(false)
  const [preview, setPreview] = useState(false)

  async function send() {
    if (!text.trim()) return
    await supabase.from('messages').insert({
      sender: currentUser,
      content: text.trim(),
      is_ai_generated: isAI,
      thread_id: replyTo?.id || null
    })
    setText('')
    setIsAI(false)
    onClearReply?.()
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send()
  }

  return (
    <div class="composer">
      {replyTo && (
        <div class="reply-bar">
          <span>引用 <b>{replyTo.sender}</b>：{replyTo.content.slice(0, 40)}{replyTo.content.length > 40 ? '…' : ''}</span>
          <button onClick={onClearReply}>✕</button>
        </div>
      )}
      {preview
        ? <div class="composer-preview msg-content" dangerouslySetInnerHTML={{ __html: md.render(text || ' ') }} />
        : <textarea
            value={text}
            onInput={e => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="输入消息… (Ctrl+Enter 发送)"
            rows={3}
          />
      }
      <div class="composer-actions">
        <button
          class={`ai-toggle ${isAI ? 'active' : ''}`}
          onClick={() => setIsAI(v => !v)}
          title="标记为 AI 生成"
        >✦</button>
        <button class={preview ? 'active' : ''} onClick={() => setPreview(v => !v)}>预览</button>
        <button onClick={send}>发送</button>
      </div>
    </div>
  )
}
