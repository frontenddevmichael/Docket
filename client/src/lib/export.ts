export interface CsvColumn<T> {
  key: string
  header: string
  render?: (row: T) => string | number | null | undefined
}

export function csvFromRows<T extends object>(rows: T[], columns: CsvColumn<T>[]): string {
  const escape = (value: string): string => {
    if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
    return value
  }
  const header = columns.map((c) => escape(c.header)).join(',')
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const raw = c.render ? c.render(row) : ((row as Record<string, unknown>)[c.key] as string | number | null | undefined)
        return escape(raw === undefined || raw === null ? '' : String(raw))
      })
      .join(','),
  )
  return [header, ...lines].join('\r\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}