import type { CSSProperties } from 'react'
import type { CharacterKind, StatusKind } from '@shared/types'
import '../styles/character.css'

export type Pose = StatusKind | 'idle'

interface Props {
  character: CharacterKind
  pose: Pose
  offline?: boolean
  size?: number | string
  className?: string
}

/**
 * Pixel-art desk buddy. Every scene is a 42×40 pixel canvas built from small
 * character grids (one letter = one pixel, "." = transparent). Pieces are drawn
 * in order, later pieces over earlier ones, and animated pieces get a class
 * that the CSS flips in whole-pixel steps so it still reads as pixel art.
 *
 *   working → behind a desk with a glowing laptop, hands tapping
 *   lunch   → steaming ramen, lifting an onigiri to their mouth
 *   away    → holding a "BRB" sign, waving
 *   custom  → shouting through a megaphone
 *   meeting → at the desk with a headset on, "…" speech bubble
 *   coffee  → standing, sipping a steaming mug
 *   workout → dumbbell curls
 *   sleeping→ eyes shut, zZz floating up
 *   idle    → waving (character picker)
 */

type Grid = string[]
interface Piece { g: Grid; x: number; y: number; cls?: string; origin?: [number, number] }

const W = 42
const H = 40
const OX = 11 // figure left edge
const OY = 7 // figure top edge (crown row)

// ---- palettes -------------------------------------------------------------
const COMMON: Record<string, string> = {
  K: '#17171C', S: '#FFDCC2', E: '#17171C', W: '#FFFFFF', B: '#FF9DB2', M: '#D7607A',
  D: '#C89F7B', d: '#A57B58', L: '#3A3F5C', l: '#9FF3FF', O: '#F4ECDF', o: '#F7C85C',
  R: '#E8788E', G: '#2F5D4B', Y: '#FFF6DC', y: '#B98A5E', X: '#8A5A12', N: '#FFB357',
  n: '#FFD166', C: '#FFC107', c: '#E0A200', Z: 'rgba(0,0,0,.28)', g: '#44475A', b: '#529CCA'
}
const PALETTE: Record<CharacterKind, Record<string, string>> = {
  boy: { ...COMMON, H: '#4A2E22', T: '#5B8CFF', A: '#5B8CFF', P: '#2F3752' },
  girl: { ...COMMON, H: '#F7B733', T: '#BEE3F8', A: '#FFFFFF', P: '#BEE3F8' }
}

// ---- heads (18 × 15) ------------------------------------------------------
const BOY_HEAD: Grid = [
  '.....K..K...K.....',
  '....KHKKHKKKHK....',
  '...KHHHHHHHHHHK...',
  '..KHHHHHHHHHHHHK..',
  '..KHHHHHHHHHHHHK..',
  '.KHHHHHHHHHHHHHHK.',
  '.KHHSSSHHSSSSHHHK.',
  '.KHSSSSSSSSSSSHHK.',
  '.KSSSEESSSSEESSSK.',
  '.KSSSEESSSSEESSSK.',
  '.KSSBBSSMMSSBBSSK.',
  '.KSSSSSSSSSSSSSSK.',
  '..KSSSSSSSSSSSSK..',
  '...KKSSSSSSSSKK...',
  '.....KKKKKKKK.....'
]
const GIRL_HEAD: Grid = [
  '......KKKKKK......',
  '....KKHHHHHHKK....',
  '...KHHHHHHHHHHK...',
  '..KHHHHHHHHHHHHK..',
  '..KHHHHHHHHHHHHK..',
  '.KHHHHHHHHHHHHHHK.',
  '.KHHSSSSSSSSHHHHK.',
  '.KHSSSSSSSSSSHHHK.',
  '.KHSSEESSSSEESHHK.',
  '.KHSSEESSSSEESHHK.',
  '.KHSBBSSMMSBBSHHK.',
  '.KHSSSSSSSSSSSHHK.',
  '.KHHSSSSSSSSSSHHK.',
  '.KHHKSSSSSSSSKHHK.',
  '.KKK.KKKKKKKK.KKK.'
]
const CROWN: Grid = [
  '.KK..KK..KK.',
  'KCCKKCCKKCCK',
  'KCCCCCCCCCCK',
  'KKKKKKKKKKKK'
]

// ---- bodies (18 wide, no arms) -------------------------------------------
const BOY_BODY: Grid = [
  '.....KTTTTTTK.....',
  '.....KTTTTTTK.....',
  '.....KTTTTTTK.....',
  '.....KTTTTTTK.....',
  '.....KTTTTTTK.....',
  '.....KTTTTTTK.....',
  '.....KTTTTTTK.....',
  '.....KPPPPPPK.....',
  '.....KPPKKPPK.....',
  '.....KPPK.KPPK....',
  '.....KPPK.KPPK....',
  '.....KKKK.KKKK....',
  '....KKKKK.KKKKK...'
]
const GIRL_BODY: Grid = [
  '.....KAAAAAAK.....',
  '.....KTAAAATK.....',
  '.....KAAAAAAK.....',
  '.....KAAAAAAK.....',
  '.....KAAAAAAK.....',
  '.....KAAAAAAK.....',
  '.....KAAAAAAK.....',
  '....KTTTTTTTTK....',
  '...KTTTTTTTTTTK...',
  '...KKKKKKKKKKKK...',
  '.....KWWK.KWWK....',
  '.....KWWK.KWWK....',
  '....KKKKK.KKKKK...'
]
const SIT_ROWS = 7 // rows of body visible above the desk

// ---- arms ----------------------------------------------------------------
const ARM_DOWN_L: Grid = ['KTTK', 'KTTK', 'KSSK', 'KSSK', '.KKK']
const ARM_DOWN_R: Grid = ['KTTK', 'KTTK', 'KSSK', 'KSSK', 'KKK.']
const SLEEVE_L: Grid = ['KTTK', 'KTTK']
const SLEEVE_R: Grid = ['KTTK', 'KTTK']
const HAND: Grid = ['KSSK', 'KSSK']
// diagonal wave (right)
const WAVE_ARM_R: Grid = ['...KTTK.', '..KTTK..', '.KTTK...', 'KTTK....', 'KKK.....']
const WAVE_HAND_R: Grid = ['.KKK.', 'KSSSK', 'KSSSK', '.KKK.']
// diagonal wave (left)
const WAVE_ARM_L: Grid = ['.KTTK...', '..KTTK..', '...KTTK.', '....KTTK', '.....KKK']
const WAVE_HAND_L: Grid = ['.KKK.', 'KSSSK', 'KSSSK', '.KKK.']
// L-shaped arm reaching out to the right, hand up (for sign / megaphone)
const HOLD_ARM_R: Grid = [
  '.....KKK.',
  '....KSSSK',
  '....KSSSK',
  '.....KTTK',
  '.....KTTK',
  '.....KTTK',
  'KTTTTTTTK',
  'KKKKKKKKK'
]

// ---- props ---------------------------------------------------------------
const SIGN: Grid = [
  'KKKKKKKKKKKKK',
  'KXXYYXXYYXXYK',
  'KXYXYXYXYXYXK',
  'KXXYYXXYYXXYK',
  'KXYXYXYXYXYXK',
  'KXXYYXYXYXXYK',
  'KKKKKKKKKKKKK'
]
const STICK: Grid = Array.from({ length: 14 }, () => 'y')
const MEGAPHONE: Grid = [
  '.....KKK',
  '...KKNNK',
  '.KKNNNNK',
  'KNNNNNNK',
  'KNNNNNNK',
  'KNNNNNNK',
  '.KKNNNNK',
  '...KKNNK',
  '.....KKK'
]
const SOUND_1: Grid = ['n', '.', '.', '.', 'n']
const SOUND_2: Grid = ['.', 'n', '.', 'n', '.']
const DESK: Grid = [
  'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
  'KDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDK',
  'KddddddddddddddddddddddddddddddddddK',
  'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
  '.KddK............................KddK',
  '.KddK............................KddK',
  '.KddK............................KddK',
  '.KddK............................KddK',
  '.KKKK............................KKKK'
]
const LAPTOP: Grid = [
  'KKKKKKKK',
  'KLLLLLLK',
  'KLLLLLLK',
  'KLLllLLK',
  'KLLLLLLK',
  'KLLLLLLK',
  'KKKKKKKK'
]
const MUG: Grid = ['KKK..', 'KWWKK', 'KWW.K', 'KWWKK', 'KKK..']
const STEAM: Grid = ['W']
const BOWL: Grid = [
  '.KKKKKKKK.',
  'KooGooWooK',
  'KOOOOOOOOK',
  'KORRRRRROK',
  '.KKKKKKKK.'
]
const ONIGIRI_HAND: Grid = ['..KK..', '.KWWK.', 'KWGGWK', '.KSSK.', '.KTTK.']
const HEADBAND: Grid = ['....gggggggggg....']
const EARCUP: Grid = ['KKK', 'KgK', 'KgK', 'KKK']
const MIC: Grid = ['K....', '.KK..', '...KK']
const BUBBLE: Grid = [
  '.KKKKKKKKK.',
  'KWWWWWWWWWK',
  'KWWWWWWWWWK',
  'KWWWWWWWWWK',
  '.KKKKKKKKK.',
  '.KK........',
  'K..........'
]
const DOT: Grid = ['b']
const ZZ: Grid = ['bbb', '..b', '.b.', 'bbb']
const DUMBBELL: Grid = ['KK...KK', 'KgKKKgK', 'KK...KK']
const SHADOW_STAND: Grid = ['ZZZZZZZZZZ']
const SHADOW_SIT: Grid = ['ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ']

// ---- scene assembly --------------------------------------------------------
function scene(character: CharacterKind, pose: Pose): Piece[] {
  const head = character === 'boy' ? BOY_HEAD : GIRL_HEAD
  const body = character === 'boy' ? BOY_BODY : GIRL_BODY
  const sit = pose === 'working' || pose === 'lunch' || pose === 'meeting'
  const hy = OY + 3 // head top
  const by = hy + 15 // body top
  const p: Piece[] = []

  if (sit) {
    p.push({ g: SHADOW_SIT, x: 3, y: H - 1 })
    p.push({ g: body.slice(0, SIT_ROWS), x: OX, y: by, cls: 'bob' })
    p.push({ g: SLEEVE_L, x: OX + 2, y: by + 2, cls: 'bob' })
    p.push({ g: SLEEVE_R, x: OX + 12, y: by + 2, cls: 'bob' })
  } else {
    p.push({ g: SHADOW_STAND, x: OX + 4, y: H - 1 })
    p.push({ g: body, x: OX, y: by, cls: 'bob' })
    // left arm
    if (pose === 'away') {
      p.push({ g: WAVE_ARM_L, x: OX - 3, y: by - 3, cls: 'bob' })
      p.push({ g: WAVE_HAND_L, x: OX - 3, y: by - 5, cls: 'bob wave-l' })
    } else {
      p.push({ g: ARM_DOWN_L, x: OX + 2, y: by + 2, cls: 'bob' })
    }
    // right arm
    if (pose === 'idle') {
      p.push({ g: WAVE_ARM_R, x: OX + 12, y: by - 3, cls: 'bob' })
      p.push({ g: WAVE_HAND_R, x: OX + 15, y: by - 5, cls: 'bob wave' })
    } else if (pose === 'away' || pose === 'custom') {
      p.push({ g: HOLD_ARM_R, x: OX + 12, y: by - 6, cls: 'bob' })
    } else if (pose === 'coffee') {
      p.push({ g: MUG, x: OX + 9, y: by + 1, cls: 'bob' })
      p.push({ g: STEAM, x: OX + 10, y: by - 1, cls: 'steam' })
      p.push({ g: STEAM, x: OX + 11, y: by - 2, cls: 'steam s2' })
      p.push({ g: SLEEVE_R, x: OX + 12, y: by + 1, cls: 'bob' })
      p.push({ g: HAND, x: OX + 12, y: by + 3, cls: 'bob' })
    } else if (pose === 'workout') {
      p.push({ g: SLEEVE_R, x: OX + 12, y: by + 1, cls: 'bob' })
      p.push({ g: DUMBBELL, x: OX + 15, y: by + 3, cls: 'lift' })
      p.push({ g: HAND, x: OX + 12, y: by + 3, cls: 'lift' })
      p.push({ g: DOT, x: OX + 18, y: hy + 5, cls: 'drop' })
    } else {
      p.push({ g: ARM_DOWN_R, x: OX + 12, y: by + 2, cls: 'bob' })
    }
  }

  // head on top of body
  if (character === 'girl') p.push({ g: CROWN, x: OX + 3, y: OY, cls: 'bob' })
  p.push({ g: head, x: OX, y: hy, cls: 'bob' })

  if (pose === 'away') {
    p.push({ g: STICK, x: OX + 18, y: OY, cls: 'swing' })
    p.push({ g: SIGN, x: OX + 12, y: 0, cls: 'swing' })
    p.push({ g: ['KSSSK', 'KSSSK'], x: OX + 16, y: by - 5, cls: 'bob' }) // hand over stick
  }
  if (pose === 'custom') {
    p.push({ g: MEGAPHONE, x: OX + 20, y: by - 10, cls: 'bob' })
    p.push({ g: SOUND_1, x: OX + 29, y: by - 8, cls: 'sound' })
    p.push({ g: SOUND_2, x: OX + 30, y: by - 8, cls: 'sound s2' })
  }

  if (pose === 'meeting') {
    p.push({ g: HEADBAND, x: OX, y: hy + 2, cls: 'bob' })
    p.push({ g: EARCUP, x: OX - 1, y: hy + 7, cls: 'bob' })
    p.push({ g: EARCUP, x: OX + 16, y: hy + 7, cls: 'bob' })
    p.push({ g: MIC, x: OX + 1, y: hy + 10, cls: 'bob' })
    p.push({ g: LAPTOP, x: OX + 5, y: by, cls: 'bob' })
    p.push({ g: DESK, x: 3, y: by + 6 })
    p.push({ g: HAND, x: OX + 2, y: by + 4 })
    p.push({ g: HAND, x: OX + 12, y: by + 4 })
    p.push({ g: BUBBLE, x: OX + 19, y: hy - 4 })
    p.push({ g: DOT, x: OX + 22, y: hy - 2, cls: 'dot' })
    p.push({ g: DOT, x: OX + 24, y: hy - 2, cls: 'dot d2' })
    p.push({ g: DOT, x: OX + 26, y: hy - 2, cls: 'dot d3' })
  }
  if (pose === 'sleeping') {
    p.push({ g: ZZ, x: OX + 19, y: hy, cls: 'zz' })
    p.push({ g: ZZ, x: OX + 22, y: hy - 5, cls: 'zz z2' })
    p.push({ g: ZZ, x: OX + 25, y: hy - 10, cls: 'zz z3' })
  }
  if (pose === 'working') {
    p.push({ g: LAPTOP, x: OX + 5, y: by, cls: 'bob' })
    p.push({ g: DESK, x: 3, y: by + 6 })
    p.push({ g: MUG, x: OX + 17, y: by + 1 })
    p.push({ g: STEAM, x: OX + 18, y: by - 1, cls: 'steam' })
    p.push({ g: STEAM, x: OX + 19, y: by - 2, cls: 'steam s2' })
    p.push({ g: HAND, x: OX + 2, y: by + 4, cls: 'type-l' })
    p.push({ g: HAND, x: OX + 12, y: by + 4, cls: 'type-r' })
  }
  if (pose === 'lunch') {
    p.push({ g: DESK, x: 3, y: by + 6 })
    p.push({ g: BOWL, x: OX + 4, y: by + 1 })
    p.push({ g: STEAM, x: OX + 6, y: by - 1, cls: 'steam' })
    p.push({ g: STEAM, x: OX + 8, y: by - 2, cls: 'steam s2' })
    p.push({ g: STEAM, x: OX + 10, y: by - 1, cls: 'steam s3' })
    p.push({ g: HAND, x: OX + 2, y: by + 4 })
    p.push({ g: ONIGIRI_HAND, x: OX + 13, y: by + 1, cls: 'eat' })
  }
  return p
}

// ---- rendering --------------------------------------------------------------
function PieceRects({ piece, pal, chew, sleepy }: { piece: Piece; pal: Record<string, string>; chew: boolean; sleepy: boolean }) {
  const rects: JSX.Element[] = []
  const consumed = new Set<string>()
  piece.g.forEach((row, r) => {
    let c = 0
    while (c < row.length) {
      const ch = row[c]
      if (ch === '.' || consumed.has(`${r}:${c}`)) { c++; continue }
      let end = c
      while (end + 1 < row.length && row[end + 1] === ch) end++
      const w = end - c + 1
      let h = 1
      let cls: string | undefined
      let style: CSSProperties | undefined
      if (ch === 'E') {
        // eyes are 2 rows tall: merge so the blink scales the whole eye
        const below = piece.g[r + 1]
        if (below && below.slice(c, end + 1) === row.slice(c, end + 1)) {
          h = 2
          for (let k = c; k <= end; k++) consumed.add(`${r + 1}:${k}`)
        }
        if (sleepy && h === 2) {
          // closed eyes: just the lower row
          rects.push(<rect key={`${r}:${c}`} x={piece.x + c} y={piece.y + r + 1} width={w} height={1} fill={pal.E} />)
          c = end + 1
          continue
        }
        cls = 'eye'
        style = { transformOrigin: `${piece.x + c + w / 2}px ${piece.y + r + h}px` }
      } else if (ch === 'M' && chew) {
        cls = 'chew'
        style = { transformOrigin: `${piece.x + c + w / 2}px ${piece.y + r}px` }
      }
      rects.push(<rect key={`${r}:${c}`} x={piece.x + c} y={piece.y + r} width={w} height={h} fill={pal[ch] ?? '#f0f'} className={cls} style={style} />)
      c = end + 1
    }
  })
  return <g className={piece.cls}>{rects}</g>
}

export function Character({ character, pose, offline = false, size = 240, className }: Props) {
  const pal = PALETTE[character]
  const pieces = scene(character, pose)
  const classes = ['ch', `ch-${pose}`, offline ? 'offline' : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <svg className={classes} viewBox={`0 0 ${W} ${H}`} width={size} height={size} role="img" aria-label={`${character}, ${pose}`}>
      {pieces.map((piece, i) => (
        <PieceRects key={i} piece={piece} pal={pal} chew={pose === 'lunch'} sleepy={pose === 'sleeping'} />
      ))}
    </svg>
  )
}
