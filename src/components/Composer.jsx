import { useState, useRef } from 'preact/hooks'
import MarkdownIt from 'markdown-it'
import { supabase } from '../lib/supabase.js'
import { MentionPicker } from './MentionPicker.jsx'

const md = new MarkdownIt()

export function Composer({ currentUser, currentSession, replyTo, onClearReply }) {
  const [text, setText] = useState('')
  const [isAI, setIsAI] = useState(false)
  const [preview, setPreview] = useState(false)
  const [showMentionPicker, setShowMentionPicker] = useState(false)
  const [mentionPickerPos, setMentionPickerPos] = useState({ top: 0, left: 0 })
  const [mentionSearchQuery, setMentionSearchQuery] = useState('')
  const [crossSessionRefs, setCrossSessionRefs] = useState([])
  const textareaRef = useRef(null)

  async function send() {
    if (!text.trim() || !currentSession) return

    const messageData = {
      session_id: currentSession.id,
      sender: currentUser,
      content: text.trim(),
      is_ai_generated: isAI,
      thread_id: replyTo?.id || null
    }

    // 如果有跨 session 引用，存储在 metadata 中
    if (crossSessionRefs.length > 0) {
      messageData.cross_session_refs = JSON.stringify(crossSessionRefs)
    }

    await supabase.from('messages').insert(messageData)
    setText('')
    setIsAI(false)
    setCrossSessionRefs([])
    onClearReply?.()
  }

  function onInput(e) {
    const value = e.target.value
    setText(value)

    // 检测 @ 符号和搜索词
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = value.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    // 检查是否在 @ 后面输入（@ 后面没有空格）
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
      const hasSpace = textAfterAt.includes(' ') || textAfterAt.includes('\n')

      if (!hasSpace && cursorPos >= lastAtIndex + 1) {
        // 正在 @ 后面输入，显示选择器并更新搜索词
        if (!showMentionPicker) {
          const textarea = textareaRef.current
          const rect = textarea.getBoundingClientRect()
          // 修复位置计算：在输入框上方显示
          setMentionPickerPos({
            top: rect.top - 420, // 选择器高度约 400px + 间距
            left: rect.left
          })
          setShowMentionPicker(true)
        }
        setMentionSearchQuery(textAfterAt)
      } else if (hasSpace) {
        // @ 后面有空格，关闭选择器
        setShowMentionPicker(false)
        setMentionSearchQuery('')
      }
    } else {
      // 没有 @，关闭选择器
      setShowMentionPicker(false)
      setMentionSearchQuery('')
    }
  }

  function onMentionSelect(mention) {
    // 找到最后一个 @ 的位置
    const lastAtIndex = text.lastIndexOf('@')
    if (lastAtIndex === -1) return

    // 找到 @ 后面的内容（搜索词）
    const beforeAt = text.slice(0, lastAtIndex)
    const afterAtWithSearch = text.slice(lastAtIndex + 1)

    // 找到搜索词后面的内容（可能有空格或其他字符）
    const spaceIndex = afterAtWithSearch.search(/[\s\n]/)
    const afterSearch = spaceIndex !== -1 ? afterAtWithSearch.slice(spaceIndex) : ''

    const mentionText = `[@${mention.sessionName}:${mention.sender}]`
    setText(beforeAt + mentionText + afterSearch)

    // 保存引用信息
    setCrossSessionRefs(prev => [...prev, {
      sessionId: mention.sessionId,
      sessionName: mention.sessionName,
      messageId: mention.messageId,
      sender: mention.sender,
      content: mention.content
    }])

    setShowMentionPicker(false)
    setMentionSearchQuery('')

    // 聚焦回输入框
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  function onKeyDown(e) {
    // 如果选择器打开，不处理 Enter 和上下键（让 MentionPicker 处理）
    if (showMentionPicker && ['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) {
      return
    }

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send()
    if (e.key === 'Escape' && showMentionPicker) {
      setShowMentionPicker(false)
      setMentionSearchQuery('')
      e.preventDefault()
    }
  }

  return (
    <div class="composer">
      {showMentionPicker && (
        <MentionPicker
          currentSession={currentSession}
          onSelect={onMentionSelect}
          onClose={() => {
            setShowMentionPicker(false)
            setMentionSearchQuery('')
          }}
          position={mentionPickerPos}
          searchQuery={mentionSearchQuery}
        />
      )}
      {crossSessionRefs.length > 0 && (
        <div class="cross-refs-bar">
          <span>Cross-session refs:</span>
          {crossSessionRefs.map((ref, idx) => (
            <span key={idx} class="cross-ref-tag">
              {ref.sessionName}:{ref.sender}
              <button onClick={() => setCrossSessionRefs(prev => prev.filter((_, i) => i !== idx))}>✕</button>
            </span>
          ))}
        </div>
      )}
      {replyTo && (
        <div class="reply-bar">
          <span>Reply to <b>{replyTo.sender}</b>: {replyTo.content.slice(0, 40)}{replyTo.content.length > 40 ? '…' : ''}</span>
          <button onClick={onClearReply}>✕</button>
        </div>
      )}
      {preview
        ? <div class="composer-preview msg-content" dangerouslySetInnerHTML={{ __html: md.render(text || ' ') }} />
        : <textarea
            ref={textareaRef}
            value={text}
            onInput={onInput}
            onKeyDown={onKeyDown}
            placeholder="Type a message... (Type @ to mention other sessions, Ctrl+Enter to send)"
            rows={3}
          />
      }
      <div class="composer-actions">
        <button
          class={`ai-toggle ${isAI ? 'active' : ''}`}
          onClick={() => setIsAI(v => !v)}
          title="Mark as AI-generated"
        >✦</button>
        <button class={preview ? 'active' : ''} onClick={() => setPreview(v => !v)}>Preview</button>
        <button onClick={send}>Send</button>
      </div>
    </div>
  )
}
