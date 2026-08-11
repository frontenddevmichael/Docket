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

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Dependency-free Excel export (SpreadsheetML 2003, opens in Excel/LibreOffice). */
export function downloadXlsx<T extends object>(filename: string, rows: T[], columns: CsvColumn<T>[], sheetName = 'Sheet1'): void {
  const cell = (raw: string | number | null | undefined): string => {
    if (raw === null || raw === undefined || raw === '') return '<Cell />'
    if (typeof raw === 'number') return `<Cell><Data ss:Type="Number">${raw}</Data></Cell>`
    return `<Cell><Data ss:Type="String">${xmlEscape(String(raw))}</Data></Cell>`
  }
  const headerRow =
    `<Row>${columns.map((c) => cell(c.header)).join('')}</Row>`
  const bodyRows = rows
    .map((row) => {
      const cells = columns.map((c) => {
        const value = c.render ? c.render(row) : (row as Record<string, unknown>)[c.key] as string | number | null | undefined
        return cell(value)
      })
      return `<Row>${cells.join('')}</Row>`
    })
    .join('')

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Worksheet ss:Name="${xmlEscape(sheetName)}">
    <Table>
      ${headerRow}
      ${bodyRows}
    </Table>
  </Worksheet>
</Workbook>`

  const blob = new Blob(['\uFEFF' + xml], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}