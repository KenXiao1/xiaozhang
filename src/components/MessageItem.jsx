import { useState, useRef, useEffect } from 'preact/hooks'
import MarkdownIt from 'markdown-it'
import katex from 'katex'
import { getSelectionOffsets } from '../lib/annotate.js'
import { supabase } from '../lib/supabase.js'

const md = new MarkdownIt()

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

// 在渲染后的 HTML 中插入高亮 mark 标签
function applyHighlightsToHtml(html, annotations, currentUser) {
  if (!annotations?.length) return html
  // 用 DOM 解析，避免破坏 HTML 结构
  const div = document.createElement('div')
  div.innerHTML = html

  const sorted = [...annotations].sort((a, b) => a.start_offset - b.start_offset)

  for (const ann of sorted) {
    const cls = ann.annotator === currentUser ? 'highlight-self' : 'highlight-other'
    highlightTextInNode(div, ann.start_offset, ann.end_offset, cls, ann.id, ann.note)
  }
  return div.innerHTML
}

// 在 DOM 节点中按文本偏移量高亮
function highlightTextInNode(root, start, end, cls, annId, note) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let offset = 0
  const nodes = []
  let node
  while ((node = walker.nextNode())) {
    nodes.push({ node, start: offset, end: offset + node.length })
    offset += node.length
  }
  for (const { node, start: ns, end: ne } of nodes) {
    const overlapStart = Math.max(start, ns)
    const overlapEnd = Math.min(end, ne)
    if (overlapStart >= overlapEnd) continue
    const before = node.textContent.slice(0, overlapStart - ns)
    const highlighted = node.textContent.slice(overlapStart - ns, overlapEnd - ns)
    const after = node.textContent.slice(overlapEnd - ns)
    const mark = document.createElement('mark')
    mark.className = cls
    mark.dataset.annId = annId
    mark.title = note || ''
    mark.textContent = highlighted
    const frag = document.createDocumentFragment()
    if (before) frag.appendChild(document.createTextNode(before))
    frag.appendChild(mark)
    if (after) frag.appendChild(document.createTextNode(after))
    node.parentNode.replaceChild(frag, node)
    break // 每次只处理一个注释，避免偏移量混乱
  }
}

function Avatar({ name }) {
  return <div class="avatar">{name?.[0]?.toUpperCase() || '?'}</div>
}

// Google Doc 风格注释卡片
function AnnotationCard({ annotation, onClose }) {
  return (
    <div class="ann-card">
      <div class="ann-card-header">
        <span class="ann-card-author">{annotation.annotator}</span>
        <button class="ann-card-close" onClick={onClose}>×</button>
      </div>
      <div class="ann-card-quote">"{annotation.highlighted_text}"</div>
      {annotation.note && <div class="ann-card-note">{annotation.note}</div>}
    </div>
  )
}

// 新建注释输入框（Google Doc 风格，出现在气泡右侧）
function NewAnnotationCard({ selection, messageId, annotator, onDone }) {
  const [note, setNote] = useState('')

  async function save() {
    await supabase.from('annotations').insert({
      message_id: messageId,
      annotator,
      start_offset: selection.start,
      end_offset: selection.end,
      highlighted_text: selection.text,
      note
    })
    onDone()
  }

  return (
    <div class="ann-card ann-card-new">
      <div class="ann-card-header">
        <span class="ann-card-author">{annotator}</span>
        <button class="ann-card-close" onClick={() => onDone()}>×</button>
      </div>
      <div class="ann-card-quote">"{selection.text}"</div>
      <textarea
        class="ann-card-input"
        placeholder="Add annotation..."
        value={note}
        onInput={e => setNote(e.target.value)}
        rows={2}
        autoFocus
      />
      <div class="ann-card-actions">
        <button class="ann-card-save" onClick={save}>Save</button>
      </div>
    </div>
  )
}

export function MessageItem({ msg, currentUser, annotations, onAnnotationSaved, onReply, quotedMsg, threadMode }) {
  const [pending, setPending] = useState(null)
  const [activeAnn, setActiveAnn] = useState(null)
  const [menu, setMenu] = useState(null)
  const containerRef = useRef(null)
  const isSelf = msg.sender === currentUser

  // 解析跨 session 引用
  const crossRefs = msg.cross_session_refs ? JSON.parse(msg.cross_session_refs) : []

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
    setActiveAnn(null)
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

  // 点击高亮文字显示注释卡片
  function handleBubbleClick(e) {
    const mark = e.target.closest('mark[data-ann-id]')
    if (!mark) return
    const annId = mark.dataset.annId
    const ann = annotations?.find(a => String(a.id) === annId)
    if (ann) setActiveAnn(ann)
  }

  const htmlContent = applyHighlightsToHtml(
    renderMath(md.render(msg.content)),
    annotations,
    currentUser
  )

  const bubble = (
    <div
      class={`msg-bubble ${msg.is_ai_generated ? 'ai-generated' : ''}`}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
      onClick={handleBubbleClick}
    >
      {msg.is_ai_generated && <div class="ai-label">✦ AI Generated</div>}
      {crossRefs.length > 0 && (
        <div class="cross-refs-preview">
          {crossRefs.map((ref, idx) => (
            <div key={idx} class="cross-ref-item">
              <span class="cross-ref-session">📎 {ref.sessionName}</span>
              <span class="cross-ref-sender">{ref.sender}:</span>
              <span class="cross-ref-content">{ref.content.slice(0, 50)}{ref.content.length > 50 ? '…' : ''}</span>
            </div>
          ))}
        </div>
      )}
      {quotedMsg && (
        <div class="quote-preview">
          <span class="quote-sender">{quotedMsg.sender}</span>
          <span class="quote-text">{quotedMsg.content.slice(0, 60)}{quotedMsg.content.length > 60 ? '…' : ''}</span>
        </div>
      )}
      <div class="msg-content" ref={containerRef} dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </div>
  )

  const ctxMenu = menu && (
    <div class="ctx-menu" style={{ left: menu.x, top: menu.y }}>
      <button onClick={handleCopy}>Copy</button>
      <button onClick={handleReply}>Reply</button>
    </div>
  )

  // 注释卡片显示在气泡右侧（Google Doc 风格）
  const annPanel = (
    <>
      {pending && (
        <NewAnnotationCard
          selection={pending}
          messageId={msg.id}
          annotator={currentUser}
          onDone={() => { setPending(null); onAnnotationSaved?.() }}
        />
      )}
      {activeAnn && !pending && (
        <AnnotationCard annotation={activeAnn} onClose={() => setActiveAnn(null)} />
      )}
    </>
  )

  if (threadMode) {
    return (
      <div class="msg-wrap-thread">
        <div class="msg-thread-header">
          <Avatar name={msg.sender} />
          <span class="msg-sender">{msg.sender}</span>
        </div>
        <div class="msg-thread-body msg-with-ann">
          {bubble}
          {annPanel}
        </div>
        {ctxMenu}
      </div>
    )
  }

  return (
    <div class={`msg-wrap ${isSelf ? 'self' : 'other'}`}>
      {!isSelf && <Avatar name={msg.sender} />}
      <div class="msg-body">
        <div class={`msg-sender ${isSelf ? 'self' : ''}`}>{msg.sender}</div>
        <div class="msg-with-ann">
          {bubble}
          {annPanel}
        </div>
      </div>
      {isSelf && <Avatar name={msg.sender} />}
      {ctxMenu}
    </div>
  )
}
