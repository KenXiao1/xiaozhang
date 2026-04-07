import { useEffect, useRef } from 'preact/hooks'
import { MessageItem } from './MessageItem.jsx'

export function MessageList({ messages, currentUser, annotations, mode, onAnnotationSaved, onReply }) {
  const bottomRef = useRef(null)
  const msgMap = Object.fromEntries(messages.map(m => [m.id, m]))

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (mode === 'thread') {
    const threads = {}
    const roots = []
    for (const msg of messages) {
      if (!msg.thread_id) {
        roots.push(msg)
        threads[msg.id] = []
      } else {
        if (!threads[msg.thread_id]) threads[msg.thread_id] = []
        threads[msg.thread_id].push(msg)
      }
    }
    return (
      <div class="msg-list">
        {roots.map(root => (
          <div key={root.id} class="thread">
            <MessageItem msg={root} currentUser={currentUser}
              annotations={annotations[root.id]} onAnnotationSaved={onAnnotationSaved}
              onReply={onReply} />
            {threads[root.id]?.map(reply => (
              <div key={reply.id} class="thread-reply">
                <MessageItem msg={reply} currentUser={currentUser}
                  annotations={annotations[reply.id]} onAnnotationSaved={onAnnotationSaved}
                  onReply={onReply} />
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    )
  }

  // 流式模式：显示引用气泡
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
