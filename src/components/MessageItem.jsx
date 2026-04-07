import { useState, useRef, useEffect, useCallback } from 'preact/hooks'
import MarkdownIt from 'markdown-it'
import katex from 'katex'
import { getSelectionOffsets } from '../lib/annotate.js'
import { Annotation } from './Annotation.jsx'

const md = new MarkdownIt()

// 简单的行内数学公式替换 $...$ 和 $$...$$
function renderMath(content) {
  return content
    .replace(/\$\$([^$]+)\$\$/g, (_, expr) => {
      try { return katex.renderToString(expr, { displayMode: true }) }
      catch { return `$$${expr}$$` }
    })
    .replace(/\$([^$\n]+)\$/g, (_, expr) => {
      try { return katex.renderToString(expr, { displayMode: false }) }
      catch { return `$${expr}$` }
    })
}

// 将注释高亮插入纯文本
function applyHighlights(text, annotations, currentUser) {
  if (!annotations?.length) return null
  const sorted = [...annotations].sort((a, b) => a.start_offset - b.start_offset)
  const parts = []
  let cursor = 0
  for (const ann of sorted) {
    if (ann.start_offset > cursor) parts.push(text.slice(cursor, ann.start_offset))
    const cls = ann.annotator === currentUser ? 'highlight-self' : 'highlight-other'
    parts.push(<mark class={cls} title={ann.note}>{text.slice(ann.start_offset, ann.end_offset)}</mark>)
    cursor = ann.end_offset
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

function Avatar({ name }) {
  return <div class="avatar">{name?.[0]?.toUpperCase() || '?'}</div>
}

export function MessageItem({ msg, currentUser, annotations, onAnnotationSaved, onReply, quotedMsg }) {
  const [pending, setPending] = useState(null)
  const [menu, setMenu] = useState(null)
  const containerRef = useRef(null)
  const isSelf = msg.sender === currentUser

  useEffect(() => {
    if (!menu) return
    function close() { setMenu(null) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menu])

  function handleMouseUp() {
    if (!containerRef.current) return
    const sel = getSelectionOffsets(containerRef.current)
    if (!sel) return
    setPending(sel)
  }

  function handleContextMenu(e) {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY })
  }

  function handleCopy() {
    navigator.clipboard.writeText(msg.content)
    setMenu(null)
  }

  function handleReply() {
    onReply?.(msg)
    setMenu(null)
  }

  const highlights = applyHighlights(msg.content, annotations, currentUser)
  const htmlContent = renderMath(md.render(msg.content))

  return (
    <div class={`msg-wrap ${isSelf ? 'self' : 'other'}`}>
      {!isSelf && <Avatar name={msg.sender} />}
      <div class="msg-body">
        <div class={`msg-sender ${isSelf ? 'self' : ''}`}>{msg.sender}</div>
        <div
          class={`msg-bubble ${msg.is_ai_generated ? 'ai-generated' : ''}`}
          ref={containerRef}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
        >
          {msg.is_ai_generated && <div class="ai-label">✦ AI 生成</div>}
          {quotedMsg && (
            <div class="quote-preview">
              <span class="quote-sender">{quotedMsg.sender}</span>
              <span class="quote-text">{quotedMsg.content.slice(0, 60)}{quotedMsg.content.length > 60 ? '…' : ''}</span>
            </div>
          )}
          {highlights
            ? <div class="msg-content">{highlights}</div>
            : <div class="msg-content" dangerouslySetInnerHTML={{ __html: htmlContent }} />
          }
        </div>
      </div>
      {isSelf && <Avatar name={msg.sender} />}
      {pending && (
        <Annotation
          rect={pending.rect}
          messageId={msg.id}
          annotator={currentUser}
          selection={pending}
          onDone={() => { setPending(null); onAnnotationSaved?.() }}
        />
      )}
      {menu && (
        <div class="ctx-menu" style={{ left: menu.x, top: menu.y }}>
          <button onClick={handleCopy}>复制</button>
          <button onClick={handleReply}>引用</button>
        </div>
      )}
    </div>
  )
}
