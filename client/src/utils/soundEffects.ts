// soundEffects.ts

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

export const sfx = new SoundEffects()
