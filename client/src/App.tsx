import { CHAIN } from '@tonconnect/ui'
import {
  TonConnectButton,
  useIsConnectionRestored,
  useTonAddress,
  useTonConnectUI,
  useTonWallet,
} from '@tonconnect/ui-react'
import React, { useEffect, useRef, useState } from 'react'
import './App.css'
import { AdminPortal } from './components/AdminPortal'
import { LeaderboardPanel } from './components/LeaderboardPanel'
import { QuestsPanel } from './components/QuestsPanel'

type GamePhase = 'idle' | 'running' | 'gameover'
type AppTab = 'play' | 'top' | 'info' | 'admin'
type TxStatus = 'idle' | 'pending' | 'sent' | 'error'
type GameoverPopup = 'record' | 'gameover' | null

type LeaderboardEntry = {
  player: string
  bestScore: number
  updatedAt: number
}

type Pipe = {
  x: number
  gapY: number
  passed: boolean
}

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  alpha: number
  life: number
  maxLife: number
}

type FloatingCoin = {
  id: number
  startX: number
  startY: number
  targetX: number
  targetY: number
  delay: number
}

const CANVAS_WIDTH = 360
const CANVAS_HEIGHT = 560
const GROUND_HEIGHT = 92
const BIRD_X = 100
const BIRD_RADIUS = 16
const PIPE_WIDTH = 68
const PIPE_GAP = Number(import.meta.env.VITE_GAME_PIPE_GAP) || 155
const PIPE_SPEED = Number(import.meta.env.VITE_GAME_PIPE_SPEED) || 2.8
const FLAP_FORCE = Number(import.meta.env.VITE_GAME_FLAP_FORCE) || -6.8
const GRAVITY = Number(import.meta.env.VITE_GAME_GRAVITY) || 0.38
const BEST_SCORE_KEY = 'happy-bird-ton-best-score'
const LEADERBOARD_KEY = 'happy-bird-ton-leaderboard'

/* --- Custom Sound Effects Synthesizer using Web Audio API --- */
class SoundEffects {
  private ctx: AudioContext | null = null

  private init() {
    if (!this.ctx) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        this.ctx = new AudioContextClass()
      } catch {
        return
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  playFlap() {
    this.init()
    if (!this.ctx) return
    
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(140, now)
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.08)

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.08)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.08)
  }

  playPoint() {
    this.init()
    if (!this.ctx) return
    
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, now) // D5
    osc.frequency.setValueAtTime(587.33, now + 0.08)
    osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.08) // A5

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.linearRampToValueAtTime(0.12, now + 0.08)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.28)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.28)
  }

  playExplosion() {
    this.init()
    if (!this.ctx) return
    
    const now = this.ctx.currentTime
    const bufferSize = this.ctx.sampleRate * 0.4
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(800, now)
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.3)

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.25, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.4)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.ctx.destination)

    noise.start(now)
    noise.stop(now + 0.4)
  }

  playClaim() {
    this.init()
    if (!this.ctx) return
    
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    // Ascending arpeggio chime
    const freqs = [261.63, 329.63, 392.00, 523.25] // C4, E4, G4, C5
    freqs.forEach((f, idx) => {
      osc.frequency.setValueAtTime(f, now + idx * 0.07)
    })

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.linearRampToValueAtTime(0.12, now + 0.25)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.35)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.35)
  }
}

const sfx = new SoundEffects()

/* --- Telegram Haptic Feedback Utility --- */
const triggerHaptic = (type: 'light' | 'success' | 'error') => {
  try {
    const webApp = window.Telegram?.WebApp as any
    if (!webApp) return
    if (type === 'light') {
      webApp.HapticFeedback?.impactOccurred('light')
    } else if (type === 'success') {
      webApp.HapticFeedback?.notificationOccurred('success')
    } else if (type === 'error') {
      webApp.HapticFeedback?.notificationOccurred('error')
    }
  } catch {
    // Silently ignore if haptics are unsupported
  }
}

function getStoredBestScore() {
  const storedBest = window.localStorage.getItem(BEST_SCORE_KEY)
  const parsedBest = storedBest ? Number.parseInt(storedBest, 10) : 0

  return Number.isNaN(parsedBest) ? 0 : parsedBest
}

function getStoredLeaderboard() {
  const stored = window.localStorage.getItem(LEADERBOARD_KEY)

  if (!stored) {
    return [] as LeaderboardEntry[]
  }

  try {
    const parsed = JSON.parse(stored)

    if (!Array.isArray(parsed)) {
      return [] as LeaderboardEntry[]
    }

    return parsed
      .filter((item): item is LeaderboardEntry => {
        return (
          typeof item === 'object' &&
          item !== null &&
          typeof item.player === 'string' &&
          typeof item.bestScore === 'number' &&
          typeof item.updatedAt === 'number'
        )
      })
      .sort((a, b) => b.bestScore - a.bestScore || b.updatedAt - a.updatedAt)
  } catch {
    return [] as LeaderboardEntry[]
  }
}

function saveLeaderboard(entries: LeaderboardEntry[]) {
  window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries))
}

function shortAddress(address: string) {
  if (address.length <= 12) {
    return address
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function getSpeedMultiplier(score: number) {
  return 1 + Math.min(score, 80) * 0.022
}

function randomPipeY() {
  const min = 150
  const max = CANVAS_HEIGHT - GROUND_HEIGHT - 150

  return min + Math.random() * (max - min)
}

function createPipe(offset = 0): Pipe {
  return {
    x: CANVAS_WIDTH + offset,
    gapY: randomPipeY(),
    passed: false,
  }
}

/* Stable background assets coordinates for parallax effect */
const STARS = [
  { x: 25, y: 40, s: 1.5, p: 0.5 },
  { x: 85, y: 110, s: 1, p: 1.2 },
  { x: 145, y: 65, s: 2, p: 2.8 },
  { x: 215, y: 150, s: 1.2, p: 0.7 },
  { x: 285, y: 85, s: 1.8, p: 2.1 },
  { x: 340, y: 130, s: 1.5, p: 1.5 },
  { x: 45, y: 230, s: 1, p: 4.2 },
  { x: 115, y: 270, s: 2, p: 0.4 },
  { x: 185, y: 220, s: 1.2, p: 2.5 },
  { x: 255, y: 190, s: 1.5, p: 3.6 },
  { x: 315, y: 250, s: 1, p: 1.8 },
  { x: 20, y: 340, s: 1.8, p: 0.2 },
  { x: 90, y: 380, s: 1.2, p: 3.1 },
  { x: 170, y: 330, s: 2, p: 1.6 },
  { x: 240, y: 370, s: 1.5, p: 3.9 },
]

const BUILDINGS = [
  { x: 0, w: 45, h: 100 },
  { x: 45, w: 60, h: 160 },
  { x: 105, w: 35, h: 80 },
  { x: 140, w: 55, h: 120 },
  { x: 195, w: 50, h: 190 },
  { x: 245, w: 40, h: 90 },
  { x: 285, w: 75, h: 140 },
]

function drawScene(
  context: CanvasRenderingContext2D,
  birdY: number,
  birdVelocity: number,
  birdRotation: number,
  pipes: Pipe[],
  particles: Particle[],
  bgOffsetStars: number,
  bgOffsetCity: number,
  score: number,
  phase: GamePhase,
  timestamp: number,
) {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // 1. Cosmic Sky Gradient
  const skyGradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  skyGradient.addColorStop(0, '#040812')
  skyGradient.addColorStop(0.5, '#0a1424')
  skyGradient.addColorStop(1, '#14253d')
  context.fillStyle = skyGradient
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // 2. Parallax Far Starfield
  context.save()
  for (const star of STARS) {
    const x = (star.x - bgOffsetStars + CANVAS_WIDTH) % CANVAS_WIDTH
    const alpha = 0.35 + 0.6 * Math.sin(timestamp * 0.003 + star.p)
    context.fillStyle = `rgba(255, 255, 255, ${alpha})`
    context.beginPath()
    context.arc(x, star.y, star.s, 0, Math.PI * 2)
    context.fill()
  }
  context.restore()

  // 3. Parallax City Silhouette
  context.save()
  for (const b of BUILDINGS) {
    let x = (b.x - bgOffsetCity) % CANVAS_WIDTH
    if (x + b.w < 0) x += CANVAS_WIDTH
    const y = CANVAS_HEIGHT - GROUND_HEIGHT - b.h

    context.fillStyle = 'rgba(12, 22, 38, 0.5)'
    context.fillRect(x, y, b.w, b.h)

    context.strokeStyle = 'rgba(0, 152, 234, 0.25)'
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + b.w, y)
    context.stroke()

    context.fillStyle = 'rgba(0, 210, 255, 0.18)'
    for (let wy = y + 15; wy < CANVAS_HEIGHT - GROUND_HEIGHT - 10; wy += 22) {
      for (let wx = x + 8; wx < x + b.w - 8; wx += 12) {
        if ((wx + wy) % 3 === 0) {
          context.fillRect(wx, wy, 2.5, 4)
        }
      }
    }
  }
  context.restore()

  // 4. Jetpack Particles Trail
  context.save()
  for (const p of particles) {
    context.fillStyle = p.color
    context.globalAlpha = p.alpha
    context.beginPath()
    context.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2)
    context.fill()
  }
  context.restore()

  // 5. Neon Energy Gates
  for (const pipe of pipes) {
    const pipeTopHeight = pipe.gapY - PIPE_GAP / 2
    const pipeBottomY = pipe.gapY + PIPE_GAP / 2
    const pipeBottomHeight = CANVAS_HEIGHT - GROUND_HEIGHT - pipeBottomY

    // TOP PIPE
    const topGrad = context.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0)
    topGrad.addColorStop(0, 'rgba(0, 152, 234, 0.95)')
    topGrad.addColorStop(0.3, 'rgba(0, 210, 255, 0.95)')
    topGrad.addColorStop(1, 'rgba(0, 90, 150, 0.95)')

    context.fillStyle = topGrad
    context.strokeStyle = '#00d2ff'
    context.lineWidth = 1.5
    context.beginPath()
    context.fillRect(pipe.x, 0, PIPE_WIDTH, pipeTopHeight)
    context.strokeRect(pipe.x, 0, PIPE_WIDTH, pipeTopHeight)

    context.strokeStyle = 'rgba(255, 255, 255, 0.55)'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(pipe.x + PIPE_WIDTH / 2, 0)
    context.lineTo(pipe.x + PIPE_WIDTH / 2, pipeTopHeight - 10)
    context.stroke()

    const capHeight = 20
    const capY = pipeTopHeight - capHeight
    const capGrad = context.createLinearGradient(pipe.x - 4, 0, pipe.x + PIPE_WIDTH + 4, 0)
    capGrad.addColorStop(0, '#0098ea')
    capGrad.addColorStop(0.5, '#ffffff')
    capGrad.addColorStop(1, '#0098ea')
    
    context.fillStyle = capGrad
    context.strokeStyle = '#00d2ff'
    context.lineWidth = 2
    context.shadowColor = '#00d2ff'
    context.shadowBlur = 10
    context.beginPath()
    context.roundRect(pipe.x - 4, capY, PIPE_WIDTH + 8, capHeight, 4)
    context.fill()
    context.stroke()
    context.shadowBlur = 0

    // BOTTOM PIPE
    const bottomGrad = context.createLinearGradient(pipe.x, pipeBottomY, pipe.x + PIPE_WIDTH, pipeBottomY)
    bottomGrad.addColorStop(0, 'rgba(0, 152, 234, 0.95)')
    bottomGrad.addColorStop(0.3, 'rgba(0, 210, 255, 0.95)')
    bottomGrad.addColorStop(1, 'rgba(0, 90, 150, 0.95)')

    context.fillStyle = bottomGrad
    context.strokeStyle = '#00d2ff'
    context.lineWidth = 1.5
    context.beginPath()
    context.fillRect(pipe.x, pipeBottomY, PIPE_WIDTH, pipeBottomHeight)
    context.strokeRect(pipe.x, pipeBottomY, PIPE_WIDTH, pipeBottomHeight)

    context.strokeStyle = 'rgba(255, 255, 255, 0.55)'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(pipe.x + PIPE_WIDTH / 2, pipeBottomY + 10)
    context.lineTo(pipe.x + PIPE_WIDTH / 2, CANVAS_HEIGHT - GROUND_HEIGHT)
    context.stroke()

    context.fillStyle = capGrad
    context.strokeStyle = '#00d2ff'
    context.lineWidth = 2
    context.shadowColor = '#00d2ff'
    context.shadowBlur = 10
    context.beginPath()
    context.roundRect(pipe.x - 4, pipeBottomY, PIPE_WIDTH + 8, capHeight, 4)
    context.fill()
    context.stroke()
    context.shadowBlur = 0
  }

  // 6. Ground
  context.fillStyle = '#050a11'
  context.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT)

  context.strokeStyle = '#00d2ff'
  context.lineWidth = 3
  context.shadowColor = '#00d2ff'
  context.shadowBlur = 8
  context.beginPath()
  context.moveTo(0, CANVAS_HEIGHT - GROUND_HEIGHT)
  context.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_HEIGHT)
  context.stroke()
  context.shadowBlur = 0

  context.strokeStyle = 'rgba(0, 210, 255, 0.16)'
  context.lineWidth = 1.5
  context.beginPath()
  const groundY = CANVAS_HEIGHT - GROUND_HEIGHT
  const groundShift = (bgOffsetCity * 1.8) % 40
  for (let gx = -groundShift; gx < CANVAS_WIDTH + 40; gx += 40) {
    context.moveTo(gx, groundY + 8)
    context.lineTo(gx + 12, groundY + 22)
    context.lineTo(gx + 30, groundY + 22)
    
    context.moveTo(gx + 20, groundY + 36)
    context.lineTo(gx + 32, groundY + 46)
    context.lineTo(gx + 5, groundY + 46)
  }
  context.stroke()

  // 7. Rotating Cyber-Bird / Drone
  context.save()
  context.translate(BIRD_X, birdY)
  context.rotate(birdRotation)

  if (birdVelocity < -1) {
    const flameGrad = context.createLinearGradient(-32, 4, -16, 4)
    flameGrad.addColorStop(0, 'rgba(255, 91, 127, 0)')
    flameGrad.addColorStop(0.5, '#ff5b7f')
    flameGrad.addColorStop(1, '#ffc837')
    context.fillStyle = flameGrad
    context.beginPath()
    context.moveTo(-16, 0)
    const flameSize = 10 + Math.random() * 12
    context.lineTo(-16 - flameSize, 4)
    context.lineTo(-16, 8)
    context.closePath()
    context.fill()
  }

  context.fillStyle = '#4b5b70'
  context.strokeStyle = '#1a232f'
  context.lineWidth = 1.5
  context.beginPath()
  context.roundRect(-20, -2, 7, 12, 2)
  context.fill()
  context.stroke()

  const bodyGrad = context.createRadialGradient(-2, -2, 3, 0, 0, BIRD_RADIUS)
  bodyGrad.addColorStop(0, '#f9fbfd')
  bodyGrad.addColorStop(0.65, '#d0def0')
  bodyGrad.addColorStop(1, '#8da5c4')
  context.fillStyle = bodyGrad
  context.strokeStyle = '#162335'
  context.lineWidth = 2
  context.beginPath()
  context.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  context.fillStyle = '#060b11'
  context.beginPath()
  context.arc(0, 0, BIRD_RADIUS, -Math.PI * 0.25, Math.PI * 0.25)
  context.lineTo(0, BIRD_RADIUS * 0.4)
  context.closePath()
  context.fill()

  context.strokeStyle = '#00d2ff'
  context.lineWidth = 2
  context.shadowColor = '#00d2ff'
  context.shadowBlur = 8
  context.beginPath()
  context.arc(0, 0, BIRD_RADIUS - 1, -Math.PI * 0.15, Math.PI * 0.15)
  context.stroke()
  context.shadowBlur = 0

  context.save()
  const wingOsc = Math.sin(timestamp * 0.018) * 6
  context.translate(-5, 2)
  context.rotate(wingOsc * Math.PI / 180)
  
  const wingGrad = context.createLinearGradient(-10, -5, 4, 3)
  wingGrad.addColorStop(0, '#0098ea')
  wingGrad.addColorStop(1, '#00d2ff')
  context.fillStyle = wingGrad
  context.strokeStyle = '#0d1d32'
  context.lineWidth = 1.5
  context.beginPath()
  context.roundRect(-10, -5, 14, 10, 4)
  context.fill()
  context.stroke()
  context.restore()

  context.restore()

  // 8. Glowing score counter
  context.fillStyle = '#ffffff'
  context.shadowColor = '#00d2ff'
  context.shadowBlur = 12
  context.font = '700 48px Space Grotesk, Chakra Petch, sans-serif'
  context.textAlign = 'center'
  context.fillText(String(score), CANVAS_WIDTH / 2, 74)
  context.shadowBlur = 0

  // 9. Canvas Text overlays
  if (phase !== 'running') {
    context.fillStyle = 'rgba(6, 11, 17, 0.75)'
    context.fillRect(28, 182, CANVAS_WIDTH - 56, 142)

    context.strokeStyle = 'rgba(0, 210, 255, 0.25)'
    context.lineWidth = 1.5
    context.strokeRect(28, 182, CANVAS_WIDTH - 56, 142)

    context.fillStyle = '#ffffff'
    context.font = '700 24px Space Grotesk, Chakra Petch, sans-serif'
    context.fillText(
      phase === 'gameover' ? 'CRASH LANDING' : 'READY PILOT?',
      CANVAS_WIDTH / 2,
      224,
    )
    
    context.fillStyle = '#94a9c4'
    context.font = '500 13px Sora, system-ui, sans-serif'
    context.fillText(
      phase === 'gameover'
        ? 'Tap screen or press Space to restart'
        : 'Dodge gates, stack points, fly high.',
      CANVAS_WIDTH / 2,
      262,
    )
    
    context.fillStyle = '#00d2ff'
    context.font = '700 12px Space Grotesk, Chakra Petch, sans-serif'
    context.fillText(
      phase === 'gameover' ? 'TRY AGAIN' : 'TAP TO TAKE OFF',
      CANVAS_WIDTH / 2,
      294,
    )
  }
}

function App() {
  const initialBestScore = getStoredBestScore()
  const initialLeaderboard = getStoredLeaderboard()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const bestScoreRef = useRef(initialBestScore)
  const playerNameRef = useRef('Guest pilot')
  
  const controlsRef = useRef({
    flap: () => {},
    restart: () => {},
  })
  
  const gameRef = useRef({
    birdY: CANVAS_HEIGHT / 2 - 30,
    birdVelocity: 0,
    birdRotation: 0,
    pipes: [createPipe(0), createPipe(220)],
    particles: [] as Particle[],
    bgOffsetStars: 0,
    bgOffsetCity: 0,
    score: 0,
    phase: 'idle' as GamePhase,
    spawnTimer: 0,
    lastTime: 0,
  })

  const wallet = useTonWallet()
  const walletAddress = useTonAddress()
  const isAdmin = 
    // Ví cá nhân 0QBWF8...
    walletAddress === '0QBWF8Xr2z_phwKBJjg5C9F2RcnKLAMwGV5lBnwo3vOSNYej' || 
    walletAddress === 'kQBWF8Xr2z_phwKBJjg5C9F2RcnKLAMwGV5lBnwo3vOSNdpm' ||
    walletAddress === 'EQBWF8Xr2z_phwKBJjg5C9F2RcnKLAMwGV5lBnwo3vOSNWHs' ||
    walletAddress === 'UQBWF8Xr2z_phwKBJjg5C9F2RcnKLAMwGV5lBnwo3vOSNTwp' ||
    wallet?.account?.address === '0:5617c5ebdb3fe98702812638390bd17645c9ca2c0330195e65067c28def39235' ||
    // Ví deployer/chạy script 0QDeI1...bm3e (đang hiển thị trong ảnh)
    walletAddress === '0QDeI1DP7sb5RmFuhFuWfhg1Kdv3cr87qJel3LFoB43rbm3e' ||
    walletAddress === 'kQDeI1DP7sb5RmFuhFuWfhg1Kdv3cr87qJel3LFoB43rbjAb' ||
    wallet?.account?.address === '0:de2350cfeec6f946616e845b967e183529dbf772bf3ba897a5dcb168078deb6e';
  const isConnectionRestored = useIsConnectionRestored()
  const telegramWebApp = window.Telegram?.WebApp

  const [tonConnectUI] = useTonConnectUI()
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(initialBestScore)
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard)
  const [gamePhase, setGamePhase] = useState<GamePhase>('idle')
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [activeTab, setActiveTab] = useState<AppTab>('play')
  const [gameoverPopup, setGameoverPopup] = useState<GameoverPopup>(null)

  /* --- BIRD Reward & Quests Local State --- */
  const [birdBalance, setBirdBalance] = useState<number>(() => {
    const val = window.localStorage.getItem('happy-bird-ton-bird-balance')
    return val ? Number.parseInt(val, 10) : 0
  })
  
  const [streak, setStreak] = useState<number>(() => {
    const val = window.localStorage.getItem('happy-bird-ton-streak')
    return val ? Number.parseInt(val, 10) : 0
  })

  const [gamesPlayedToday, setGamesPlayedToday] = useState<number>(0)
  const [recordBrokenToday, setRecordBrokenToday] = useState<boolean>(false)
  const [pointsAccumulatedToday, setPointsAccumulatedToday] = useState<number>(0)
  const [gamesTrackedForPoints, setGamesTrackedForPoints] = useState<number>(0)

  const [quest1Claimed, setQuest1Claimed] = useState<boolean>(false)
  const [quest2Claimed, setQuest2Claimed] = useState<boolean>(false)
  const [quest3Claimed, setQuest3Claimed] = useState<boolean>(false)
  
  const [checkedInToday, setCheckedInToday] = useState<boolean>(false)
  const [hasPlayedFirstGameToday, setHasPlayedFirstGameToday] = useState<boolean>(false)

  // Floating Coins Visual Animation state
  const [floatingCoins, setFloatingCoins] = useState<FloatingCoin[]>([])
  
  // Bảng xếp hạng tab con
  const [leaderboardTab, setLeaderboardTab] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  /* --- Admin Portal State --- */
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'events' | 'notifications'>('users')
  const [adminPlayers, setAdminPlayers] = useState<any[]>([])
  const [adminEvents, setAdminEvents] = useState<any[]>([])
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDesc, setNewEventDesc] = useState('')
  const [newEventRewardType, setNewEventRewardType] = useState('token')
  const [newEventRewardAmount, setNewEventRewardAmount] = useState(0)
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminStatusMsg, setAdminStatusMsg] = useState('')
  const [activeEvent, setActiveEvent] = useState<any | null>(null)

  const isTestnetWallet = wallet?.account.chain === CHAIN.TESTNET

  /* --- Helper: Check and reset daily stats on day change --- */
  const checkDailyReset = () => {
    const todayStr = new Date().toDateString()
    const storedDate = window.localStorage.getItem('happy-bird-ton-quest-date')

    if (storedDate !== todayStr) {
      window.localStorage.setItem('happy-bird-ton-quest-date', todayStr)
      window.localStorage.setItem('happy-bird-ton-games-today', '0')
      window.localStorage.setItem('happy-bird-ton-record-broken-today', 'false')
      window.localStorage.setItem('happy-bird-ton-points-accumulated-today', '0')
      window.localStorage.setItem('happy-bird-ton-games-tracked-points', '0')
      window.localStorage.setItem('happy-bird-ton-quest1-claimed', 'false')
      window.localStorage.setItem('happy-bird-ton-quest2-claimed', 'false')
      window.localStorage.setItem('happy-bird-ton-quest3-claimed', 'false')
      window.localStorage.setItem('happy-bird-ton-checked-in-today', 'false')
      window.localStorage.setItem('happy-bird-ton-played-first-game', 'false')

      // Streak logic: check if streak was broken (last check-in not yesterday)
      const lastCheckIn = window.localStorage.getItem('happy-bird-ton-last-checkin-date')
      if (lastCheckIn) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toDateString()

        if (lastCheckIn !== todayStr && lastCheckIn !== yesterdayStr) {
          window.localStorage.setItem('happy-bird-ton-streak', '0')
          setStreak(0)
        }
      } else {
        window.localStorage.setItem('happy-bird-ton-streak', '0')
        setStreak(0)
      }

      setGamesPlayedToday(0)
      setRecordBrokenToday(false)
      setPointsAccumulatedToday(0)
      setGamesTrackedForPoints(0)
      setQuest1Claimed(false)
      setQuest2Claimed(false)
      setQuest3Claimed(false)
      setCheckedInToday(false)
      setHasPlayedFirstGameToday(false)
      return true
    } else {
      // Load current daily quest states
      const games = window.localStorage.getItem('happy-bird-ton-games-today')
      const record = window.localStorage.getItem('happy-bird-ton-record-broken-today')
      const pts = window.localStorage.getItem('happy-bird-ton-points-accumulated-today')
      const ptsTrack = window.localStorage.getItem('happy-bird-ton-games-tracked-points')
      const q1 = window.localStorage.getItem('happy-bird-ton-quest1-claimed')
      const q2 = window.localStorage.getItem('happy-bird-ton-quest2-claimed')
      const q3 = window.localStorage.getItem('happy-bird-ton-quest3-claimed')
      const checked = window.localStorage.getItem('happy-bird-ton-checked-in-today')
      const playedFirst = window.localStorage.getItem('happy-bird-ton-played-first-game')

      if (games) setGamesPlayedToday(Number.parseInt(games, 10))
      if (record) setRecordBrokenToday(record === 'true')
      if (pts) setPointsAccumulatedToday(Number.parseInt(pts, 10))
      if (ptsTrack) setGamesTrackedForPoints(Number.parseInt(ptsTrack, 10))
      if (q1) setQuest1Claimed(q1 === 'true')
      if (q2) setQuest2Claimed(q2 === 'true')
      if (q3) setQuest3Claimed(q3 === 'true')
      if (checked) setCheckedInToday(checked === 'true')
      if (playedFirst) setHasPlayedFirstGameToday(playedFirst === 'true')
    }
    return false
  }

  useEffect(() => {
    checkDailyReset()
    
    // Check reset intervals
    const interval = setInterval(() => {
      checkDailyReset()
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  /* --- Fetch Global Leaderboard from Backend --- */
  useEffect(() => {
    const fetchGlobalLeaderboard = async () => {
      const apiUrl = import.meta.env.VITE_API_URL
      if (!apiUrl) return
      
      try {
        const res = await fetch(`${apiUrl}/api/leaderboard?top=20`)
        if (res.ok) {
          const data = await res.json()
          const formatted = data.map((item: any) => ({
            player: item.player,
            bestScore: item.bestScore,
            updatedAt: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now()
          }))
          setLeaderboard(formatted)
        }
      } catch (err) {
        console.error('Failed to fetch global leaderboard:', err)
      }
    }

    fetchGlobalLeaderboard()
  }, [activeTab, leaderboardTab])

  /* --- Fetch Active Events for frontend display --- */
  useEffect(() => {
    const fetchActiveEvent = async () => {
      const apiUrl = import.meta.env.VITE_API_URL
      if (!apiUrl) return
      try {
        const res = await fetch(`${apiUrl}/api/events/active`)
        if (res.ok) {
          const data = await res.json()
          if (data && data.length > 0) {
            setActiveEvent(data[0]) // Get the most recent active event
          } else {
            setActiveEvent(null)
          }
        }
      } catch (err) {
        console.error("Failed to fetch active event:", err)
      }
    }
    fetchActiveEvent()
  }, [activeTab])

  /* --- Fetch Admin Dashboard Data --- */
  useEffect(() => {
    const isAdminRoute = window.location.pathname === '/admin';
    if (!isAdminRoute || !isAdmin) return

    const fetchAdminData = async () => {
      const apiUrl = import.meta.env.VITE_API_URL
      if (!apiUrl) return
      setAdminLoading(true)
      try {
        const [playersRes, eventsRes] = await Promise.all([
          fetch(`${apiUrl}/api/admin/players`),
          fetch(`${apiUrl}/api/admin/events`)
        ])
        if (playersRes.ok) setAdminPlayers(await playersRes.json())
        if (eventsRes.ok) setAdminEvents(await eventsRes.json())
      } catch (err) {
        console.error("Failed to fetch admin dashboard data:", err)
      } finally {
        setAdminLoading(false)
      }
    }
    fetchAdminData()
  }, [isAdmin])

  /* --- Admin Actions --- */
  const handleToggleBan = async (playerWallet: string, currentBanned: boolean) => {
    const apiUrl = import.meta.env.VITE_API_URL
    if (!apiUrl) return
    try {
      const res = await fetch(`${apiUrl}/api/admin/players/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: playerWallet, banned: !currentBanned })
      })
      if (res.ok) {
        const updated = await res.json()
        setAdminPlayers(prev => prev.map(p => p.player === playerWallet ? { ...p, banned: updated.banned } : p))
        setAdminStatusMsg(`Updated ban status for player.`)
        setTimeout(() => setAdminStatusMsg(''), 3000)
      }
    } catch (err) {
      console.error("Failed to toggle player ban status:", err)
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    const apiUrl = import.meta.env.VITE_API_URL
    if (!apiUrl) return
    if (!newEventTitle || !newEventDesc) return alert("Title and Description are required")

    try {
      const res = await fetch(`${apiUrl}/api/admin/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEventTitle,
          description: newEventDesc,
          rewardType: newEventRewardType,
          rewardAmount: Number(newEventRewardAmount)
        })
      })
      if (res.ok) {
        const created = await res.json()
        setAdminEvents(prev => [created, ...prev])
        setNewEventTitle('')
        setNewEventDesc('')
        setNewEventRewardAmount(0)
        setAdminStatusMsg("Event created successfully.")
        setTimeout(() => setAdminStatusMsg(''), 3000)
      }
    } catch (err) {
      console.error("Failed to create event:", err)
    }
  }

  const handleToggleEvent = async (eventId: string, currentActive: boolean) => {
    const apiUrl = import.meta.env.VITE_API_URL
    if (!apiUrl) return
    try {
      const res = await fetch(`${apiUrl}/api/admin/events/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, isActive: !currentActive })
      })
      if (res.ok) {
        const updated = await res.json()
        setAdminEvents(prev => prev.map(e => e._id === eventId ? { ...e, isActive: updated.isActive } : e))
        setAdminStatusMsg("Event status updated.")
        setTimeout(() => setAdminStatusMsg(''), 3000)
      }
    } catch (err) {
      console.error("Failed to toggle event status:", err)
    }
  }

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    const apiUrl = import.meta.env.VITE_API_URL
    if (!apiUrl) return
    if (!broadcastMessage) return alert("Message is required")

    setAdminLoading(true)
    try {
      const res = await fetch(`${apiUrl}/api/admin/notifications/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: broadcastMessage })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setBroadcastMessage('')
        setAdminStatusMsg(`Broadcasted to ${data.successCount} players (${data.failCount} failed).`)
        setTimeout(() => setAdminStatusMsg(''), 5000)
      } else {
        alert("Broadcast failed: " + (data.error || "Unknown error"))
      }
    } catch (err) {
      console.error("Broadcast request failed:", err)
    } finally {
      setAdminLoading(false)
    }
  }

  /* --- Spawn Floating Coins animation trigger --- */
  const triggerCoinAnimation = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const startX = rect.left + rect.width / 2
    const startY = rect.top + rect.height / 2
    
    // Find target coin position (rough guess or fixed top-right corner where balance sits)
    const targetX = window.innerWidth > 480 ? (window.innerWidth / 2) + 160 : window.innerWidth - 60
    const targetY = 80 // HUD balance position Y

    const newCoins: FloatingCoin[] = Array.from({ length: 8 }).map((_, i) => ({
      id: Date.now() + i,
      startX,
      startY: startY - 10,
      targetX: targetX - startX + (Math.random() - 0.5) * 40,
      targetY: targetY - startY + (Math.random() - 0.5) * 20,
      delay: i * 0.06
    }))

    setFloatingCoins((prev) => [...prev, ...newCoins])

    // Cleanup coins
    setTimeout(() => {
      setFloatingCoins((prev) => prev.filter((c) => !newCoins.includes(c)))
    }, 1200)
  }

  /* --- Claims Handler --- */
  const handleCheckInClaim = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (checkedInToday || !hasPlayedFirstGameToday) return
    
    const currentStreakIndex = streak % 7
    const nextStreak = currentStreakIndex === 6 ? 0 : currentStreakIndex + 1
    const rewards = [10, 20, 30, 40, 50, 60, 100]
    const amount = rewards[currentStreakIndex]
    
    const newBalance = birdBalance + amount
    window.localStorage.setItem('happy-bird-ton-bird-balance', String(newBalance))
    window.localStorage.setItem('happy-bird-ton-streak', String(nextStreak))
    window.localStorage.setItem('happy-bird-ton-last-checkin-date', new Date().toDateString())
    window.localStorage.setItem('happy-bird-ton-checked-in-today', 'true')

    setBirdBalance(newBalance)
    setStreak(nextStreak)
    setCheckedInToday(true)

    sfx.playClaim()
    triggerCoinAnimation(event)
    triggerHaptic('success')
  }

  const handleQuestClaim = (questNum: 1 | 2 | 3, amount: number, event: React.MouseEvent<HTMLButtonElement>) => {
    const newBalance = birdBalance + amount
    window.localStorage.setItem('happy-bird-ton-bird-balance', String(newBalance))
    setBirdBalance(newBalance)

    if (questNum === 1) {
      window.localStorage.setItem('happy-bird-ton-quest1-claimed', 'true')
      setQuest1Claimed(true)
    } else if (questNum === 2) {
      window.localStorage.setItem('happy-bird-ton-quest2-claimed', 'true')
      setQuest2Claimed(true)
    } else if (questNum === 3) {
      window.localStorage.setItem('happy-bird-ton-quest3-claimed', 'true')
      setQuest3Claimed(true)
    }

    sfx.playClaim()
    triggerCoinAnimation(event)
    triggerHaptic('success')
  }

  /* --- Temporal Leaderboard filtering logic --- */
  const getFilteredLeaderboard = () => {
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    const oneWeek = 7 * oneDay
    const oneMonth = 30 * oneDay

    return leaderboard
      .filter((entry) => {
        const age = now - entry.updatedAt
        if (leaderboardTab === 'daily') return age <= oneDay
        if (leaderboardTab === 'weekly') return age <= oneWeek
        return age <= oneMonth
      })
      .slice(0, 10) // Display only top 10 as per rules!
  }

  const handleSubmitScore = async () => {
    const treasury = import.meta.env.VITE_TREASURY_ADDRESS

    if (!treasury) {
      return
    }

    setTxStatus('pending')
    triggerHaptic('light')

    try {
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: treasury,
            amount: String(5_000_000), // 0.005 TON in nanoton
          },
        ],
      })
      setTxStatus('sent')
      triggerHaptic('success')
    } catch {
      setTxStatus('error')
      triggerHaptic('error')
    }
  }

  const telegramReady = Boolean(telegramWebApp)
  const telegramPlatform = telegramWebApp?.platform || 'browser'
  const telegramUser =
    telegramWebApp?.initDataUnsafe?.user?.first_name ||
    telegramWebApp?.initDataUnsafe?.user?.username ||
    (walletAddress ? `Pilot ${shortAddress(walletAddress)}` : 'Guest pilot')

  useEffect(() => {
    playerNameRef.current = telegramUser
  }, [telegramUser])

  // Automatically sync profile to MongoDB on wallet connection or Telegram login (even if score is 0)
  useEffect(() => {
    const syncProfileOnLoad = async () => {
      const apiUrl = import.meta.env.VITE_API_URL
      if (!apiUrl) return
      
      const player = telegramUser
      // Ignore default Guest pilot to prevent database clutter
      if (player === 'Guest pilot') return

      const localScore = Number(window.localStorage.getItem(BEST_SCORE_KEY) || '0')
      const telegramId = telegramWebApp?.initDataUnsafe?.user?.id?.toString() || ""
      const username = telegramWebApp?.initDataUnsafe?.user?.username || ""

      try {
        await fetch(`${apiUrl}/api/leaderboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player, bestScore: localScore, telegramId, username, birdBalance }),
        })
        // Fetch refreshed leaderboard to update local state
        const res = await fetch(`${apiUrl}/api/leaderboard?top=20`)
        if (res.ok) {
          setLeaderboard(await res.json())
        }
      } catch (err) {
        console.error('Failed to auto-sync player profile:', err)
      }
    }
    syncProfileOnLoad()
  }, [telegramUser, telegramWebApp, birdBalance])

  useEffect(() => {
    const webApp = telegramWebApp

    if (!webApp) {
      return
    }

    webApp.ready()
    webApp.expand()
    webApp.setHeaderColor?.('#060b11')
    webApp.setBackgroundColor?.('#060b11')
    webApp.enableClosingConfirmation?.()
  }, [telegramWebApp])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    const syncBestScore = (nextScore: number) => {
      if (nextScore <= bestScoreRef.current) {
        return
      }

      bestScoreRef.current = nextScore
      window.localStorage.setItem(BEST_SCORE_KEY, String(nextScore))
      setBestScore(nextScore)
    }

    const syncLeaderboard = async (nextScore: number) => {
      if (nextScore <= 0) {
        return
      }

      const player = playerNameRef.current

      setLeaderboard((previous) => {
        const now = Date.now()
        const existing = previous.find((entry) => entry.player === player)

        if (existing && existing.bestScore >= nextScore) {
          return previous
        }

        const updated = existing
          ? previous.map((entry) =>
              entry.player === player
                ? { ...entry, bestScore: nextScore, updatedAt: now }
                : entry,
            )
          : [...previous, { player, bestScore: nextScore, updatedAt: now }]

        updated.sort((a, b) => b.bestScore - a.bestScore || b.updatedAt - a.updatedAt)
        saveLeaderboard(updated)

        return updated
      })

      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || ""
      const username = window.Telegram?.WebApp?.initDataUnsafe?.user?.username || ""

      const apiUrl = import.meta.env.VITE_API_URL
      if (apiUrl) {
        try {
          await fetch(`${apiUrl}/api/leaderboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player, bestScore: nextScore, telegramId, username, birdBalance }),
          })
        } catch (err) {
          console.error('Failed to sync score with server:', err)
        }
      }
    }

    const resetGame = (phase: GamePhase) => {
      gameRef.current = {
        birdY: CANVAS_HEIGHT / 2 - 30,
        birdVelocity: 0,
        birdRotation: 0,
        pipes: [createPipe(0), createPipe(220)],
        particles: [] as Particle[],
        bgOffsetStars: gameRef.current.bgOffsetStars,
        bgOffsetCity: gameRef.current.bgOffsetCity,
        score: 0,
        phase,
        spawnTimer: 0,
        lastTime: 0,
      }

      setScore(0)
      setGamePhase(phase)
      setTxStatus('idle')
      setGameoverPopup(null)
    }

    const endRun = () => {
      const current = gameRef.current

      if (current.phase === 'gameover') {
        return
      }

      // Check daily reset on game completion
      checkDailyReset()

      const isNewRecord = current.score > bestScoreRef.current

      // Gameover quests stats increment
      const nextGamesPlayed = gamesPlayedToday + 1
      window.localStorage.setItem('happy-bird-ton-games-today', String(nextGamesPlayed))
      setGamesPlayedToday(nextGamesPlayed)

      if (isNewRecord) {
        window.localStorage.setItem('happy-bird-ton-record-broken-today', 'true')
        setRecordBrokenToday(true)
      }

      // Accumulate score in first 3 games
      if (gamesTrackedForPoints < 3) {
        const nextAccumulated = pointsAccumulatedToday + current.score
        const nextTracked = gamesTrackedForPoints + 1
        window.localStorage.setItem('happy-bird-ton-points-accumulated-today', String(nextAccumulated))
        window.localStorage.setItem('happy-bird-ton-games-tracked-points', String(nextTracked))
        setPointsAccumulatedToday(nextAccumulated)
        setGamesTrackedForPoints(nextTracked)
      }

      current.phase = 'gameover'
      syncBestScore(current.score)
      syncLeaderboard(current.score)
      
      sfx.playExplosion()
      triggerHaptic('error')

      setGameoverPopup(isNewRecord ? 'record' : 'gameover')
      setGamePhase('gameover')
    }

    const flap = () => {
      const current = gameRef.current

      if (current.phase === 'gameover') {
        resetGame('running')
      }

      if (current.phase === 'idle') {
        // Daily Check-in play trigger
        checkDailyReset()
        if (!hasPlayedFirstGameToday) {
          window.localStorage.setItem('happy-bird-ton-played-first-game', 'true')
          setHasPlayedFirstGameToday(true)
        }

        current.phase = 'running'
        setGamePhase('running')
      }

      current.birdVelocity = FLAP_FORCE
      
      sfx.playFlap()
      triggerHaptic('light')
    }

    controlsRef.current.flap = flap
    controlsRef.current.restart = () => resetGame('idle')

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.code !== 'ArrowUp') {
        return
      }

      event.preventDefault()
      flap()
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('.gameover-popup') || target.closest('.start-button')) {
        return
      }
      
      event.preventDefault()
      flap()
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)

    resetGame('idle')

    const render = (timestamp: number) => {
      const current = gameRef.current

      if (!current.lastTime) {
        current.lastTime = timestamp
      }

      const delta = Math.min((timestamp - current.lastTime) / 16.6667, 1.8)
      current.lastTime = timestamp

      const pace = getSpeedMultiplier(current.score)
      current.bgOffsetStars = (current.bgOffsetStars + 0.12 * pace * delta) % CANVAS_WIDTH
      current.bgOffsetCity = (current.bgOffsetCity + 0.45 * pace * delta) % CANVAS_WIDTH

      current.particles.forEach((p) => {
        p.x += p.vx * delta
        p.y += p.vy * delta
        p.life -= delta
        p.alpha = Math.max(0, p.life / p.maxLife)
      })
      current.particles = current.particles.filter((p) => p.life > 0)

      if (current.phase === 'running') {
        current.birdVelocity += GRAVITY * pace * delta
        current.birdY += current.birdVelocity * delta
        current.spawnTimer += pace * delta

        const targetRot = Math.max(-0.4, Math.min(0.8, current.birdVelocity * 0.08))
        current.birdRotation = current.birdRotation + (targetRot - current.birdRotation) * 0.18

        if (Math.random() < 0.35) {
          current.particles.push({
            x: BIRD_X - 12,
            y: current.birdY + 2,
            vx: -PIPE_SPEED * pace * (0.8 + Math.random() * 0.6),
            vy: (Math.random() - 0.5) * 2,
            size: 2 + Math.random() * 3,
            color: Math.random() < 0.7 ? '#00d2ff' : '#ff5b7f',
            alpha: 1.0,
            life: 25,
            maxLife: 25,
          })
        }

        if (current.spawnTimer >= 90) {
          current.pipes.push(createPipe())
          current.spawnTimer = 0
        }

        for (const pipe of current.pipes) {
          pipe.x -= PIPE_SPEED * pace * delta

          if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
            pipe.passed = true
            current.score += 1
            setScore(current.score)
            
            sfx.playPoint()
            triggerHaptic('success')
          }

          const overlapsX =
            BIRD_X + BIRD_RADIUS > pipe.x && BIRD_X - BIRD_RADIUS < pipe.x + PIPE_WIDTH
          const outsideGap =
            current.birdY - BIRD_RADIUS < pipe.gapY - PIPE_GAP / 2 ||
            current.birdY + BIRD_RADIUS > pipe.gapY + PIPE_GAP / 2

          if (overlapsX && outsideGap) {
            endRun()
          }
        }

        current.pipes = current.pipes.filter((pipe) => pipe.x + PIPE_WIDTH > -18)

        if (
          current.birdY + BIRD_RADIUS >= CANVAS_HEIGHT - GROUND_HEIGHT ||
          current.birdY - BIRD_RADIUS <= 0
        ) {
          endRun()
        }
      }

      drawScene(
        context,
        current.birdY,
        current.birdVelocity,
        current.birdRotation,
        current.pipes,
        current.particles,
        current.bgOffsetStars,
        current.bgOffsetCity,
        current.score,
        current.phase,
        timestamp,
      )

      animationFrameRef.current = window.requestAnimationFrame(render)
    }

    animationFrameRef.current = window.requestAnimationFrame(render)

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }

      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [gamesPlayedToday, pointsAccumulatedToday, gamesTrackedForPoints, hasPlayedFirstGameToday])

  // Estimating estimated rewards for Top leaderboard
  const getLeaderboardReward = (rank: number) => {
    if (rank === 1) return '500 BIRD'
    if (rank === 2) return '300 BIRD'
    if (rank === 3) return '200 BIRD'
    if (rank <= 10) return '50 BIRD'
    return '0 BIRD'
  }

  const activeLeaderboardEntries = getFilteredLeaderboard()
  const isAdminRoute = window.location.pathname === '/admin';

  if (isAdminRoute) {
    return (
      <AdminPortal
        walletAddress={walletAddress}
        isAdmin={isAdmin}
        adminPlayers={adminPlayers}
        adminEvents={adminEvents}
        adminLoading={adminLoading}
        adminStatusMsg={adminStatusMsg}
        adminSubTab={adminSubTab}
        setAdminSubTab={setAdminSubTab}
        handleToggleBan={handleToggleBan}
        handleCreateEvent={handleCreateEvent}
        handleToggleEvent={handleToggleEvent}
        handleBroadcast={handleBroadcast}
        newEventTitle={newEventTitle}
        setNewEventTitle={setNewEventTitle}
        newEventDesc={newEventDesc}
        setNewEventDesc={setNewEventDesc}
        newEventRewardType={newEventRewardType}
        setNewEventRewardType={setNewEventRewardType}
        newEventRewardAmount={newEventRewardAmount}
        setNewEventRewardAmount={setNewEventRewardAmount}
        broadcastMessage={broadcastMessage}
        setBroadcastMessage={setBroadcastMessage}
      />
    )
  }

  return (
    <main className="app-shell">
      {/* Coin Flying Animation Layer */}
      <div className="coin-fly-layer">
        {floatingCoins.map((coin) => (
          <div
            key={coin.id}
            className="floating-coin"
            style={{
              left: `${coin.startX}px`,
              top: `${coin.startY}px`,
              animationDelay: `${coin.delay}s`,
              // Passing target distance via custom variables
              // @ts-ignore
              '--target-x': `${coin.targetX}px`,
              '--target-y': `${coin.targetY}px`
            }}
          />
        ))}
      </div>

      <div className="content-shell">
        <section className={`play-page tab-panel ${activeTab === 'play' ? 'is-active' : ''}`}>
          {activeEvent && (
            <div className="active-event-banner">
              <div className="event-banner-glow" />
              <div className="event-banner-content">
                <span className="event-badge">🔴 LIVE EVENT</span>
                <div className="event-text">
                  <strong>{activeEvent.title}</strong>
                  <p>{activeEvent.description}</p>
                </div>
                {activeEvent.rewardAmount > 0 && (
                  <span className="event-reward">+{activeEvent.rewardAmount} BIRD</span>
                )}
              </div>
            </div>
          )}
          <div className="game-panel game-panel--full">
            <div className="canvas-shell">
              <canvas
                ref={canvasRef}
                className="game-canvas"
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                aria-label="Happy Bird game canvas"
              />

              {gamePhase === 'idle' && (
                <div className="start-overlay">
                  <p className="start-title">HAPPY BIRD</p>
                  <p className="start-hint">Dodge gates, stack score, unlock rewards.</p>
                  <button
                    type="button"
                    className="start-button"
                    onClick={() => controlsRef.current.flap()}
                  >
                    TAKE OFF
                  </button>
                </div>
              )}
            </div>

            {gamePhase === 'gameover' && gameoverPopup && (
              <div className="gameover-popup" role="dialog" aria-live="polite">
                <span className={`gameover-popup-tag ${gameoverPopup === 'record' ? 'record-tag' : ''}`}>
                  {gameoverPopup === 'record' ? 'NEW RECORD' : 'GAME OVER'}
                </span>
                <h3>
                  {gameoverPopup === 'record'
                    ? 'BROKE THE BARRIER!'
                    : 'CRASH LANDING'}
                </h3>
                <p>
                  Score: <strong>{score}</strong> · Best: <strong>{bestScore}</strong>
                </p>
                <button
                  type="button"
                  className="secondary-button primary-glow"
                  onClick={() => controlsRef.current.flap()}
                >
                  FLY AGAIN
                </button>
              </div>
            )}
          </div>
        </section>

        <LeaderboardPanel
          activeTab={activeTab}
          activeLeaderboardEntries={activeLeaderboardEntries}
          getLeaderboardReward={getLeaderboardReward}
          leaderboardTab={leaderboardTab}
          setLeaderboardTab={setLeaderboardTab}
        />

        <QuestsPanel
          activeTab={activeTab}
          streak={streak}
          checkedInToday={checkedInToday}
          hasPlayedFirstGameToday={hasPlayedFirstGameToday}
          birdBalance={birdBalance}
          gamesPlayedToday={gamesPlayedToday}
          recordBrokenToday={recordBrokenToday}
          pointsAccumulatedToday={pointsAccumulatedToday}
          gamesTrackedForPoints={gamesTrackedForPoints}
          quest1Claimed={quest1Claimed}
          quest2Claimed={quest2Claimed}
          quest3Claimed={quest3Claimed}
          handleCheckInClaim={handleCheckInClaim}
          handleQuestClaim={handleQuestClaim}
          isConnectionRestored={isConnectionRestored}
          wallet={wallet}
          isTestnetWallet={isTestnetWallet}
          walletAddress={walletAddress}
          shortAddress={shortAddress}
          telegramUser={telegramUser}
          bestScore={bestScore}
          telegramReady={telegramReady}
          telegramPlatform={telegramPlatform}
          gamePhase={gamePhase}
          score={score}
          handleRecordScore={handleSubmitScore}
          txStatus={txStatus}
        />

        {/* ========================================================================= */}
        {/* TAB PANEL 4: ADMIN COMMAND CENTER (Removed and moved to /admin route) */}
        {/* ========================================================================= */}
      </div>

      <nav className="bottom-tabs" aria-label="Main navigation">
        <button
          type="button"
          className={`tab-button tab-top ${activeTab === 'top' ? 'active' : ''}`}
          onClick={() => setActiveTab('top')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a4 4 0 0 0-4 4v5a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z"/></svg>
          Top
        </button>
        <button
          type="button"
          className={`tab-button tab-play ${activeTab === 'play' ? 'active' : ''}`}
          onClick={() => setActiveTab('play')}
        >
          <span>PLAY</span>
        </button>
        <button
          type="button"
          className={`tab-button tab-info ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          Quests
        </button>

      </nav>
    </main>
  )
}

export default App
