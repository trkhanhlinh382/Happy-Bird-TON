// gameRenderer.ts
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GROUND_HEIGHT,
  BIRD_X,
  BIRD_RADIUS,
  PIPE_WIDTH,
  PIPE_GAP,
  STARS,
  BUILDINGS
} from '../constants/gameConstants'
import type { Pipe } from './gameHelpers'

export type GamePhase = 'idle' | 'running' | 'gameover'

export type Particle = {
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

export function drawScene(
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
