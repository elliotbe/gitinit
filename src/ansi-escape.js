import { reduceStr } from './utils.js'

/**
 * color: bl: black, r: red, g: green, y: yellow,
 *         b: blue, m: magenta, c: cyan, w: white
 * type: b{color}: bright, d{color}: dark
 * mode: bg{type}{color}: background
 */
const colors = [...Array(6 * 8)].map((_e, index) => {
  const color = Math.floor(index / 6)
  const type = index % 3 === 0 ? '' : `;${index % 3}`
  const mode = index % 6 < 3 ? 3 : 4
  return (...args) => `\x1b[${mode}${color}${type}m${reduceStr(...args)}\x1b[0m`
})

export const [
  bl, bbl, dbl, bgbl, bgbbl, bgdbl,
  r,  br,  dr,  bgr,  bgbr,   bgdr,
  g,  bg,  dg,  bgg,  bgbg,   bgdg,
  y,  by,  dy,  bgy,  bgby,   bgdy,
  b,  bb,  db,  bgb,  bgbb,   bgdb,
  m,  bm,  dm,  bgm,  bgbm,   bgdm,
  c,  bc,  dc,  bgc,  bgbc,   bgdc,
  w,  bw,  dw,  bgw,  bgbw,   bgdw,
] = colors // prettier-ignore

const styles = [...Array(9)].map((_e, index) => {
  return (...args) => `\x1b[0${index + 1}m${reduceStr(...args)}\x1b[0m`
})
export const [bold, faint, ital, under, blink, fastBlink, rev, conceal, cross] = styles
export const reset = '\x1b[0m'

/**
 * n = 0 - cursor to end of line
 * n = 1 - cursor to start of line
 * n = 2 - entire line
 */
export const lineClear = (n = 2) => `\x1b[${n}K`

const cursorNav = ['A', 'B', 'C', 'D'].map((val) => (n = 1) => {
  if (n === 0) return ''
  return `\x1b[${n}${val}`
})
export const [up, down, right, left] = cursorNav

export const hideCur = '\x1b[?25l'
export const showCur = '\x1b[?25h'
export const saveCur = '\x1b[s'
export const restoreCur = '\x1b[u'
