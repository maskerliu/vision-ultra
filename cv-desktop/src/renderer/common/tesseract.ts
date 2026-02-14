declare namespace Tesseract {
  interface Block {
    paragraphs: Paragraph[]
    text: string
    confidence: number
    bbox: Bbox
    blocktype: string
    page: Page
  }
  interface Baseline {
    x0: number
    y0: number
    x1: number
    y1: number
  }
  interface RowAttributes {
    ascenders: number
    descenders: number
    rowHeight: number
  }

  interface Bbox {
    x0: number
    y0: number
    x1: number
    y1: number
  }

  interface Line {
    words: Word[]
    text: string
    confidence: number
    baseline: Baseline
    rowAttributes: RowAttributes
    bbox: Bbox
  }

  interface Paragraph {
    lines: Line[]
    text: string
    confidence: number
    bbox: Bbox
    is_ltr: boolean
  }

  interface Symbol {
    text: string
    confidence: number
    bbox: Bbox
    is_superscript: boolean
    is_subscript: boolean
    is_dropcap: boolean
  }

  interface Choice {
    text: string
    confidence: number
  }
  interface Word {
    symbols: Symbol[]
    choices: Choice[]
    text: string
    confidence: number
    bbox: Bbox
    font_name: string
  }
  interface Page {
    page_id: number
    blocks: Block[] | null
  }
}

export { Tesseract }
