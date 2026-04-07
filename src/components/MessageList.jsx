import { useEffect, useRef } from 'preact/hooks'
import { MessageItem } from './MessageItem.jsx'

export function MessageList({ messages, currentUser, annotations, mode, onAnnotationSaved }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (mode === 'thread') {
    // Gmail 模式：按 thread_id 分组
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
              annotations={annotations[root.id]} onAnnotationSaved={onAnnotationSaved} />
            {threads[root.id]?.map(reply => (
              <div key={reply.id} class="thread-reply">
                <MessageItem msg={reply} currentUser={currentUser}
                  annotations={annotations[reply.id]} onAnnotationSaved={onAnnotationSaved} />
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    )
  }

  // 流式模式（默认）
  return (
    <div class="msg-list">
      {messages.map(msg => (
        <MessageItem key={msg.id} msg={msg} currentUser={currentUser}
          annotations={annotations[msg.id]} onAnnotationSaved={onAnnotationSaved} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
