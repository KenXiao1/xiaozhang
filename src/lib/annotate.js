// 计算选区相对于容器元素的文本偏移量
export function getSelectionOffsets(container) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null
  const range = sel.getRangeAt(0)
  if (!container.contains(range.commonAncestorContainer)) return null

  const preRange = document.createRange()
  preRange.selectNodeContents(container)
  preRange.setEnd(range.startContainer, range.startOffset)
  const start = preRange.toString().length

  return {
    start,
    end: start + range.toString().length,
    text: range.toString(),
    rect: range.getBoundingClientRect()
  }
}
