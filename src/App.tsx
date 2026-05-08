import { CHAIN } from '@tonconnect/ui'
import {
  TonConnectButton,
  useIsConnectionRestored,
  useTonAddress,
  useTonConnectUI,
  useTonWallet,
} from '@tonconnect/ui-react'
import { useEffect, useRef, useState } from 'react'
import './App.css'

type GamePhase = 'idle' | 'running' | 'gameover'

type Pipe = {
  x: number
  gapY: number
  passed: boolean
}

const CANVAS_WIDTH = 360
const CANVAS_HEIGHT = 560
const GROUND_HEIGHT = 92
const BIRD_X = 100
const BIRD_RADIUS = 18
const PIPE_WIDTH = 68
const PIPE_GAP = 160
const PIPE_SPEED = 2.8
const FLAP_FORCE = -6.9
const GRAVITY = 0.4
const BEST_SCORE_KEY = 'happy-bird-ton-best-score'

function getStoredBestScore() {
  const storedBest = window.localStorage.getItem(BEST_SCORE_KEY)
  const parsedBest = storedBest ? Number.parseInt(storedBest, 10) : 0

  return Number.isNaN(parsedBest) ? 0 : parsedBest
}

function randomPipeY() {
  const min = 156
  const max = CANVAS_HEIGHT - GROUND_HEIGHT - 156

  return min + Math.random() * (max - min)
}

function createPipe(offset = 0): Pipe {
  return {
    x: CANVAS_WIDTH + offset,
    gapY: randomPipeY(),
    passed: false,
  }
}

function drawScene(
  context: CanvasRenderingContext2D,
  birdY: number,
  pipes: Pipe[],
  score: number,
  phase: GamePhase,
) {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  const skyGradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  skyGradient.addColorStop(0, '#fff3c8')
  skyGradient.addColorStop(0.6, '#ffd17a')
  skyGradient.addColorStop(1, '#f6a246')
  context.fillStyle = skyGradient
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  context.fillStyle = 'rgba(255, 255, 255, 0.55)'
  context.beginPath()
  context.ellipse(72, 78, 42, 24, 0, 0, Math.PI * 2)
  context.ellipse(108, 88, 34, 20, 0, 0, Math.PI * 2)
  context.ellipse(274, 108, 48, 28, 0, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#ffe38b'
  context.beginPath()
  context.arc(294, 80, 28, 0, Math.PI * 2)
  context.fill()

  for (const pipe of pipes) {
    const pipeTopHeight = pipe.gapY - PIPE_GAP / 2
    const pipeBottomY = pipe.gapY + PIPE_GAP / 2
    const pipeBottomHeight = CANVAS_HEIGHT - GROUND_HEIGHT - pipeBottomY

    context.fillStyle = '#216c4c'
    context.fillRect(pipe.x, 0, PIPE_WIDTH, pipeTopHeight)
    context.fillRect(pipe.x, pipeBottomY, PIPE_WIDTH, pipeBottomHeight)

    context.fillStyle = '#2f8a62'
    context.fillRect(pipe.x - 6, pipeTopHeight - 18, PIPE_WIDTH + 12, 18)
    context.fillRect(pipe.x - 6, pipeBottomY, PIPE_WIDTH + 12, 18)
  }

  context.fillStyle = '#87552e'
  context.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT)

  context.fillStyle = '#629b34'
  context.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, 22)

  context.fillStyle = '#f7d14b'
  context.beginPath()
  context.arc(BIRD_X, birdY, BIRD_RADIUS, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#f1942f'
  context.beginPath()
  context.moveTo(BIRD_X + 6, birdY)
  context.lineTo(BIRD_X + 26, birdY + 4)
  context.lineTo(BIRD_X + 6, birdY + 10)
  context.closePath()
  context.fill()

  context.fillStyle = '#1f1d14'
  context.beginPath()
  context.arc(BIRD_X + 6, birdY - 6, 3.5, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#fffaf0'
  context.beginPath()
  context.arc(BIRD_X - 2, birdY + 4, 8, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#143729'
  context.font = '700 38px ui-rounded, system-ui, sans-serif'
  context.textAlign = 'center'
  context.fillText(String(score), CANVAS_WIDTH / 2, 62)

  if (phase !== 'running') {
    context.fillStyle = 'rgba(20, 34, 28, 0.16)'
    context.fillRect(28, 182, CANVAS_WIDTH - 56, 132)

    context.fillStyle = '#fff8ea'
    context.font = '700 24px ui-rounded, system-ui, sans-serif'
    context.fillText(
      phase === 'gameover' ? 'Crash landing' : 'Tap to fly',
      CANVAS_WIDTH / 2,
      228,
    )
    context.font = '500 15px ui-rounded, system-ui, sans-serif'
    context.fillText(
      phase === 'gameover'
        ? 'Tap or press Space to restart.'
        : 'Dodge pipes, stack points, stay airborne.',
      CANVAS_WIDTH / 2,
      258,
    )
  }
}

function App() {
  const initialBestScore = getStoredBestScore()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const bestScoreRef = useRef(initialBestScore)
  const controlsRef = useRef({
    flap: () => {},
    restart: () => {},
  })
  const gameRef = useRef({
    birdY: CANVAS_HEIGHT / 2 - 30,
    birdVelocity: 0,
    pipes: [createPipe(0), createPipe(220)],
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
  const [gamePhase, setGamePhase] = useState<GamePhase>('idle')
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'sent' | 'error'>('idle')

  const isTestnetWallet = wallet?.account.chain === CHAIN.TESTNET

  const handleSubmitScore = async () => {
    const treasury = import.meta.env.VITE_TREASURY_ADDRESS

    if (!treasury) {
      return
    }

    setTxStatus('pending')

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
    } catch {
      setTxStatus('error')
    }
  }

  const telegramReady = Boolean(telegramWebApp)
  const telegramPlatform = telegramWebApp?.platform || 'browser'
  const telegramUser =
    telegramWebApp?.initDataUnsafe?.user?.first_name ||
    telegramWebApp?.initDataUnsafe?.user?.username ||
    'Guest pilot'

  useEffect(() => {
    const webApp = telegramWebApp

    if (!webApp) {
      return
    }

    webApp.ready()
    webApp.expand()
    webApp.setHeaderColor?.('#19352d')
    webApp.setBackgroundColor?.('#f7e6bf')
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

    const resetGame = (phase: GamePhase) => {
      gameRef.current = {
        birdY: CANVAS_HEIGHT / 2 - 30,
        birdVelocity: 0,
        pipes: [createPipe(0), createPipe(220)],
        score: 0,
        phase,
        spawnTimer: 0,
        lastTime: 0,
      }

      setScore(0)
      setGamePhase(phase)
      setTxStatus('idle')
    }

    const endRun = () => {
      const current = gameRef.current

      current.phase = 'gameover'
      syncBestScore(current.score)
      setGamePhase('gameover')
    }

    const flap = () => {
      const current = gameRef.current

      if (current.phase === 'gameover') {
        resetGame('running')
      }

      if (current.phase === 'idle') {
        current.phase = 'running'
        setGamePhase('running')
      }

      current.birdVelocity = FLAP_FORCE
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

      if (current.phase === 'running') {
        current.birdVelocity += GRAVITY * delta
        current.birdY += current.birdVelocity * delta
        current.spawnTimer += delta

        if (current.spawnTimer >= 90) {
          current.pipes.push(createPipe())
          current.spawnTimer = 0
        }

        for (const pipe of current.pipes) {
          pipe.x -= PIPE_SPEED * delta

          if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
            pipe.passed = true
            current.score += 1
            setScore(current.score)
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
        current.pipes,
        current.score,
        current.phase,
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
  }, [])

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Telegram Mini App x TON Testnet</p>
          <h1>Happy Bird</h1>
          <p className="lede">
            A lightweight flappy-style game built to run inside Telegram, with
            TON wallet connectivity ready for testnet missions.
          </p>
        </div>

        <div className="hero-actions">
          <TonConnectButton className="wallet-button" />
          <button
            type="button"
            className="secondary-button"
            onClick={() => controlsRef.current.restart()}
          >
            Reset run
          </button>
        </div>
      </section>

      <section className="status-grid">
        <article className="status-card">
          <span className="card-label">Telegram</span>
          <strong>{telegramReady ? 'Connected' : 'Browser preview'}</strong>
          <p>
            {telegramReady
              ? `${telegramUser} on ${telegramPlatform}`
              : 'The app still works in the browser, but WebApp controls activate inside Telegram.'}
          </p>
        </article>

        <article className="status-card">
          <span className="card-label">TON Wallet</span>
          <strong>
            {!isConnectionRestored
              ? 'Restoring session...'
              : wallet
                ? isTestnetWallet
                  ? 'TON Testnet ready'
                  : 'Wrong network'
                : 'No wallet connected'}
          </strong>
          <p>
            {wallet
              ? walletAddress
              : 'Connect a testnet wallet to use future reward, leaderboard, or item purchase flows.'}
          </p>
        </article>

        <article className="status-card accent-card">
          <span className="card-label">Session</span>
          <strong>
            {gamePhase === 'running'
              ? 'Flight in progress'
              : gamePhase === 'gameover'
                ? 'Try again'
                : 'Ready for takeoff'}
          </strong>
          <p>
            Score {score} · Best {bestScore}
          </p>
        </article>
      </section>

      <section className="playground">
        <div className="game-panel">
          <div className="panel-header">
            <div>
              <span className="card-label">Game</span>
              <h2>Fly the bird</h2>
            </div>
            <p>Tap the game area or press Space.</p>
          </div>

          <div className="canvas-shell">
            <canvas
              ref={canvasRef}
              className="game-canvas"
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              aria-label="Happy Bird game canvas"
            />
          </div>
        </div>

        <aside className="side-panel">
          <article className="info-card">
            <span className="card-label">Gameplay loop</span>
            <h3>Fast MVP for Telegram</h3>
            <p>
              The current build focuses on one-touch gameplay, local best score
              storage, Telegram WebApp detection, and TON testnet onboarding.
            </p>
          </article>

          <article className="info-card">
            <span className="card-label">Testnet note</span>
            <h3>Use a testnet wallet</h3>
            <p>
              The UI flags mainnet wallets so you can keep development and
              reward testing isolated from real funds.
            </p>
          </article>

          {gamePhase === 'gameover' && isTestnetWallet && (
            <article className="info-card reward-card">
              <span className="card-label">On-chain</span>
              <h3>Submit score</h3>
              <p>Score {score} — record it on TON Testnet.</p>
              <button
                type="button"
                className="secondary-button"
                onClick={handleSubmitScore}
                disabled={txStatus === 'pending' || txStatus === 'sent'}
              >
                {txStatus === 'pending'
                  ? 'Sending…'
                  : txStatus === 'sent'
                    ? '✓ Score submitted'
                    : txStatus === 'error'
                      ? 'Retry'
                      : 'Submit score on-chain'}
              </button>
              {txStatus === 'error' && (
                <p className="tx-error">Transaction failed. Try again.</p>
              )}
            </article>
          )}

          <article className="info-card info-card--compact">
            <span className="card-label">Next upgrade</span>
            <p>
              Add on-chain score submissions, NFT skins, or tokenized entry fees
              once your bot URL and public manifest are deployed.
            </p>
          </article>
        </aside>
      </section>
    </main>
  )
}

export default App
