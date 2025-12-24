const defo = [
  "#1abc9c", "#2ecc71", "#3498db", "#9b59b6", "#34495e",
  "#16a085", "#27ae60", "#2980b9", "#8e44ad", "#2c3e50",
  "#f1c40f", "#e67e22", "#e74c3c", "#ecf0f1", "#95a5a6",
  "#f39c12", "#d35400", "#c0392b", "#bdc3c7", "#7f8c8d",
]

const french = [
  "#fad390", "#f8c291", "#6a89cc", "#82ccdd", "#b8e994",
  "#f6b93b", "#e55039", "#4a69bd", "#60a3bc", "#78e08f",
  "#fa983a", "#eb2f06", "#1e3799", "#3c6382", "#38ada9",
  "#e58e26", "#b71540", "#0c2461", "#0a3d62", "#079992"
]

const dutch = [
  "#FFC312", "#C4E538", "#12CBC4", "#FDA7DF", "#ED4C67",
  "#F79F1F", "#A3CB38", "#1289A7", "#D980FA", "#B53471",
  "#EE5A24", "#009432", "#0652DD", "#9980FA", "#833471",
  "#EA2027", "#006266", "#1B1464", "#5758BB", "#6F1E51"
]

const indian = [
  "#FEA47F", "#25CCF7", "#EAB543", "#55E6C1", "#CAD3C8",
  "#F97F51", "#1B9CFC", "#F8EFBA", "#58B19F", "#2C3A47",
  "#B33771", "#3B3B98", "#FD7272", "#9AECDB", "#D6A2E8",
  "#6D214F", "#182C61", "#FC427B", "#BDC581", "#82589F",
]

export class MarkColors {
  palettes: string[]

  private n: number = 20

  private _palettes: Map<string, string[]> = new Map()

  constructor(palette = 'defo') {
    this._palettes.set('defo', defo)
    this._palettes.set('french', french)
    this._palettes.set('dutch', dutch)
    this._palettes.set('indian', indian)

    this.palettes = ['defo', 'french', 'dutch', 'indian']
  }

  get(i: number, palette = 'defo') { return this._palettes.get(palette)[Math.floor(i) % this.n] }

  static hexToRgba(hex: string, alpha = 255) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? `rgba(${[parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)].join(
        ", "
      )}, ${alpha})`
      : null
  }

  static reverseColor(hex: string, alpha = 255) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? `rgba(${[255 - parseInt(result[1], 16), 255 - parseInt(result[2], 16), 255 - parseInt(result[3], 16)].join(
        ", "
      )}, ${alpha})`
      : null
  }

  static GREEN = '#32EEDB'
  static RED = '#FF2C35'
  static BLUE = '#157AB3'
  static YELLOW = '#F8E16C'
  static WHITE = '#ffffff'
  static SILVERY = '#f1f2f6'
  static PURPLE = '#7F00FF'
}


export const MARK_COLORS = new MarkColors()