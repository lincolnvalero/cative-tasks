export interface ExtractedTask {
  id: string
  text: string
  selected: boolean
}

// Extrai itens de lista do conteúdo de uma nota
// Reconhece: - item, * item, • item, · item, 1. item, 1) item, [ ] item
export function extractTasksFromNote(content: string): ExtractedTask[] {
  const lines = content.split('\n')
  const seen = new Set<string>()
  const tasks: ExtractedTask[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Regex: captura qualquer forma de bullet/lista
    const match = trimmed.match(
      /^(?:[-*•·◦▸▪➤>]|\d+[.)]\s+|\[[ xX✓]\]\s+)\s*(.+)/
    )
    if (!match) continue

    let text = match[1].trim()
    // Limpar markdown inline
    text = text.replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .trim()

    // Filtrar: tamanho mínimo 3 chars, máximo 200, sem duplicatas
    if (text.length >= 3 && text.length <= 200 && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase())
      tasks.push({ id: crypto.randomUUID(), text, selected: true })
    }
  }

  return tasks
}

// Conta itens de lista sem extrair tudo
export function countListItems(content: string): number {
  return content.split('\n').filter(line =>
    /^(?:[-*•·◦▸▪➤>]|\d+[.)]\s+|\[[ xX✓]\]\s+)\s*.{3,}/.test(line.trim())
  ).length
}
