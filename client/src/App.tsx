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

type GamePhase = 'idle' | 'running' | 'gameover'
type AppTab = 'play' | 'top' | 'info'
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
    
    const nextStreak = streak === 7 ? 1 : streak + 1
    const rewards = [10, 20, 30, 40, 50, 60, 100]
    const amount = rewards[streak] // index is streak (0-6)
    
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

    const syncLeaderboard = (nextScore: number) => {
      if (nextScore <= 0) {
        return
      }

      setLeaderboard((previous) => {
        const now = Date.now()
        const player = playerNameRef.current
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

        <section className={`top-page tab-panel ${activeTab === 'top' ? 'is-active' : ''}`}>
          <div className="top-head">
            <span className="eyebrow">Leaderboards</span>
            <h2>Top Pilots</h2>
            
            {/* Temporal Leaderboard subtabs */}
            <div className="leaderboard-subtabs">
              <button
                type="button"
                className={`subtab-btn ${leaderboardTab === 'daily' ? 'active' : ''}`}
                onClick={() => setLeaderboardTab('daily')}
              >
                Daily (Ngày)
              </button>
              <button
                type="button"
                className={`subtab-btn ${leaderboardTab === 'weekly' ? 'active' : ''}`}
                onClick={() => setLeaderboardTab('weekly')}
              >
                Weekly (Tuần)
              </button>
              <button
                type="button"
                className={`subtab-btn ${leaderboardTab === 'monthly' ? 'active' : ''}`}
                onClick={() => setLeaderboardTab('monthly')}
              >
                Monthly (Tháng)
              </button>
            </div>
            
            <p style={{ fontSize: '0.85rem' }}>
              Top 10 players get awarded BIRD tokens at intervals!
            </p>
          </div>

          {activeLeaderboardEntries.length > 0 ? (
            <ol className="leaderboard-list">
              {activeLeaderboardEntries.map((entry, index) => (
                <li key={entry.player} className="leaderboard-item">
                  <span className="leader-rank">{index + 1}</span>
                  <div className="leader-meta">
                    <strong>{entry.player}</strong>
                    <p>{new Date(entry.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span className="leader-score">{entry.bestScore}</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--neon-gold)', letterSpacing: '0.02em' }}>
                      {getLeaderboardReward(index + 1)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <article className="info-card">
              <span className="card-label">NO DATA</span>
              <h3>No runs recorded yet</h3>
              <p>Play a game inside the {leaderboardTab} window to make the list.</p>
            </article>
          )}
        </section>

        <section className={`info-page tab-panel ${activeTab === 'info' ? 'is-active' : ''}`}>
          
          {/* BIRD Token Balance Wallet HUD */}
          <div className="bird-wallet">
            <div className="wallet-balance-info">
              <span>BIRD Wallet Balance</span>
              <div className="wallet-balance-amount">
                {birdBalance} BIRD
              </div>
            </div>
            <div className="wallet-coin-icon" title="BIRD Token Coin">B</div>
          </div>

          {/* Daily Check-in */}
          <article className="info-card" style={{ marginBottom: '16px' }}>
            <span className="card-label">DAILY CHECK-IN</span>
            <h3>Daily Take-off Rewards</h3>
            <p>Play at least 1 game today to authorize take-off check-in rewards.</p>
            
            <div className="checkin-grid">
              {Array.from({ length: 7 }).map((_, i) => {
                const dayNum = i + 1
                const rewards = [10, 20, 30, 40, 50, 60, 100]
                const amount = rewards[i]
                
                // Determine day state
                const isClaimed = streak > i && (checkedInToday || i < streak - 1)
                const isActive = hasPlayedFirstGameToday && !checkedInToday && i === streak - 1

                if (dayNum === 7) {
                  return (
                    <div
                      key={dayNum}
                      className={`checkin-day day-7 ${isActive ? 'is-active' : ''} ${isClaimed ? 'is-claimed' : ''}`}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                        <span className="checkin-day-num">Day 7</span>
                        <span className="checkin-coin-amount">+{amount} BIRD</span>
                      </div>
                      <div>
                        {isClaimed ? (
                          <span className="checkin-status-icon" style={{ color: 'var(--neon-green)' }}>✅</span>
                        ) : isActive ? (
                          <button type="button" className="checkin-btn" onClick={handleCheckInClaim}>CLAIM</button>
                        ) : (
                          <span className="checkin-status-icon" style={{ opacity: 0.35 }}>🔒</span>
                        )}
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={dayNum}
                    className={`checkin-day ${isActive ? 'is-active' : ''} ${isClaimed ? 'is-claimed' : ''}`}
                  >
                    <span className="checkin-day-num">Day {dayNum}</span>
                    <span className="checkin-coin-amount">+{amount}</span>
                    {isClaimed ? (
                      <span className="checkin-status-icon" style={{ color: 'var(--neon-green)' }}>✅</span>
                    ) : isActive ? (
                      <button type="button" className="checkin-btn" onClick={handleCheckInClaim}>CLAIM</button>
                    ) : (
                      <span className="checkin-status-icon" style={{ opacity: 0.35 }}>🔒</span>
                    )}
                  </div>
                )
              })}
            </div>
            
            {!hasPlayedFirstGameToday && (
              <p style={{ fontSize: '0.75rem', color: 'var(--neon-pink)', fontWeight: 800 }}>
                ⚠️ Play your first game of the day to unlock claiming!
              </p>
            )}
          </article>

          {/* Daily Quests / Missions */}
          <article className="info-card" style={{ marginBottom: '16px' }}>
            <span className="card-label">DAILY QUESTS</span>
            <h3>Daily Missions</h3>
            <p>Missions reset at midnight local time. Finish tasks to earn BIRD tokens.</p>
            
            <div className="quests-list">
              
              {/* Quest 1: Complete 3 games */}
              <div className="quest-card">
                <div className="quest-header">
                  <div className="quest-title-info">
                    <strong>Flight Cadet</strong>
                    <p>Complete 3 flights/games today.</p>
                  </div>
                  <div className="quest-reward-tag">+50 BIRD</div>
                </div>
                <div className="quest-progress-bar">
                  <div className="progress-track">
                    <div 
                      className={`progress-fill ${gamesPlayedToday >= 3 ? 'is-completed' : ''}`} 
                      style={{ width: `${Math.min(100, (gamesPlayedToday / 3) * 100)}%` }} 
                    />
                  </div>
                  <span className="progress-text">{gamesPlayedToday}/3</span>
                </div>
                <button
                  type="button"
                  className="quest-claim-btn"
                  disabled={gamesPlayedToday < 3 || quest1Claimed}
                  onClick={(e) => handleQuestClaim(1, 50, e)}
                >
                  {quest1Claimed ? 'CLAIMED' : 'CLAIM'}
                </button>
              </div>

              {/* Quest 2: Score higher than yesterday (Personal Best) */}
              <div className="quest-card">
                <div className="quest-header">
                  <div className="quest-title-info">
                    <strong>Barrier Breaker</strong>
                    <p>Break your personal high score today.</p>
                  </div>
                  <div className="quest-reward-tag">+100 BIRD</div>
                </div>
                <div className="quest-progress-bar">
                  <div className="progress-track">
                    <div 
                      className={`progress-fill ${recordBrokenToday ? 'is-completed' : ''}`} 
                      style={{ width: `${recordBrokenToday ? 100 : 0}%` }} 
                    />
                  </div>
                  <span className="progress-text">{recordBrokenToday ? '1/1' : '0/1'}</span>
                </div>
                <button
                  type="button"
                  className="quest-claim-btn"
                  disabled={!recordBrokenToday || quest2Claimed}
                  onClick={(e) => handleQuestClaim(2, 100, e)}
                >
                  {quest2Claimed ? 'CLAIMED' : 'CLAIM'}
                </button>
              </div>

              {/* Quest 3: Accumulate 100 points in first 3 games */}
              <div className="quest-card">
                <div className="quest-header">
                  <div className="quest-title-info">
                    <strong>Apex Pilot</strong>
                    <p>Accumulate 100 points across your first 3 games today.</p>
                  </div>
                  <div className="quest-reward-tag">+150 BIRD</div>
                </div>
                <div className="quest-progress-bar">
                  <div className="progress-track">
                    <div 
                      className={`progress-fill ${pointsAccumulatedToday >= 100 ? 'is-completed' : ''}`} 
                      style={{ width: `${Math.min(100, (pointsAccumulatedToday / 100) * 100)}%` }} 
                    />
                  </div>
                  <span className="progress-text">{pointsAccumulatedToday}/100</span>
                </div>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '-4px' }}>
                  Tracked flights today: {gamesTrackedForPoints}/3
                </p>
                <button
                  type="button"
                  className="quest-claim-btn"
                  disabled={pointsAccumulatedToday < 100 || quest3Claimed}
                  onClick={(e) => handleQuestClaim(3, 150, e)}
                >
                  {quest3Claimed ? 'CLAIMED' : 'CLAIM'}
                </button>
              </div>

            </div>
          </article>

          {/* TON connection */}
          <article className="info-card" style={{ marginBottom: '16px' }}>
            <span className="card-label">ON-CHAIN</span>
            <h3>TON Connection</h3>
            <TonConnectButton className="wallet-button" />
            <p style={{ marginTop: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: wallet ? (isTestnetWallet ? '#39e19c' : '#ff5b7f') : '#ffc837',
                display: 'inline-block',
                boxShadow: `0 0 8px ${wallet ? (isTestnetWallet ? '#39e19c' : '#ff5b7f') : '#ffc837'}`
              }} />
              {!isConnectionRestored
                ? 'Restoring connection...'
                : wallet
                  ? isTestnetWallet
                    ? `Testnet ready: ${shortAddress(walletAddress)}`
                    : 'Wrong network. Please switch wallet to TON Testnet.'
                  : 'Connect your testnet wallet to log scores on-chain.'}
            </p>
          </article>

          <article className="info-card">
            <span className="card-label">PILOT DECK</span>
            <h3>Player Profile</h3>
            <p style={{ lineHeight: '1.6' }}>
              Name: <strong>{telegramUser}</strong>
              <br />
              Personal best: <strong>{bestScore}</strong>
              <br />
              Network: <strong>{telegramReady ? `Telegram (${telegramPlatform})` : 'Web browser'}</strong>
            </p>
          </article>

          {gamePhase === 'gameover' && isTestnetWallet && (
            <article className="info-card reward-card">
              <span className="card-label">BLOCKCHAIN DECK</span>
              <h3>Submit Score</h3>
              <p>Record your score of <strong>{score}</strong> on the TON Testnet.</p>
              <button
                type="button"
                className="secondary-button primary-glow"
                onClick={handleSubmitScore}
                disabled={txStatus === 'pending' || txStatus === 'sent'}
              >
                {txStatus === 'pending'
                  ? 'COMMITTING...'
                  : txStatus === 'sent'
                    ? 'SCORE RECORDED'
                    : txStatus === 'error'
                      ? 'RETRY SUBMIT'
                      : 'RECORD ON-CHAIN'}
              </button>
              {txStatus === 'error' && (
                <p className="tx-error">Transaction failed. Try again.</p>
              )}
            </article>
          )}
        </section>
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
