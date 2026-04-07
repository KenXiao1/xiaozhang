import { useEffect, useRef } from 'preact/hooks'
import { MessageItem } from './MessageItem.jsx'

function ThreadNode({ msg, msgMap, currentUser, annotations, onAnnotationSaved, onReply }) {
  const parent = msg.thread_id ? msgMap[msg.thread_id] : null
  return (
    <div class="thread-node">
      {parent && (
        <div class="thread-quoted">
          <ThreadNode msg={parent} msgMap={msgMap} currentUser={currentUser}
            annotations={annotations} onAnnotationSaved={onAnnotationSaved} onReply={onReply} />
        </div>
      )}
      <MessageItem msg={msg} currentUser={currentUser}
        annotations={annotations[msg.id]} onAnnotationSaved={onAnnotationSaved}
        onReply={onReply} />
    </div>
  )
}

export function MessageList({ messages, currentUser, annotations, mode, onAnnotationSaved, onReply }) {
  const bottomRef = useRef(null)
  const msgMap = Object.fromEntries(messages.map(m => [m.id, m]))

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (mode === 'thread') {
    // 只显示"叶子"消息（没有其他消息以它为 thread_id 的），每条叶子向上递归展示引用链
    const hasReply = new Set(messages.map(m => m.thread_id).filter(Boolean))
    const leaves = messages.filter(m => !hasReply.has(m.id))
    return (
      <div class="msg-list">
        {leaves.map(msg => (
          <ThreadNode key={msg.id} msg={msg} msgMap={msgMap}
            currentUser={currentUser} annotations={annotations}
            onAnnotationSaved={onAnnotationSaved} onReply={onReply} />
        ))}
        <div ref={bottomRef} />
      </div>
    )
  }

  // 流式模式
  return (
    <div class="msg-list">
      {messages.map(msg => (
        <MessageItem key={msg.id} msg={msg} currentUser={currentUser}
          annotations={annotations[msg.id]} onAnnotationSaved={onAnnotationSaved}
          onReply={onReply}
          quotedMsg={msg.thread_id ? msgMap[msg.thread_id] : null} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
