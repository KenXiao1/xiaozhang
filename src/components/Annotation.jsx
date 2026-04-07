import { useState } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'

export function Annotation({ rect, messageId, annotator, selection, onDone }) {
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

  const style = {
    position: 'fixed',
    top: rect.bottom + window.scrollY + 6,
    left: Math.max(8, rect.left + window.scrollX),
    zIndex: 100
  }

  return (
    <div class="annotation-bubble" style={style}>
      <textarea
        placeholder="添加注释…"
        value={note}
        onInput={e => setNote(e.target.value)}
        rows={3}
      />
      <div class="annotation-actions">
        <button onClick={save}>保存</button>
        <button onClick={onDone}>取消</button>
      </div>
    </div>
  )
}
