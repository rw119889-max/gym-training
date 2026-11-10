let ctx: AudioContext | null = null

type AudioContextCtor = typeof AudioContext

export function unlockAudio(): void {
  if (ctx) return
  const Ctor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  if (!Ctor) return
  ctx = new Ctor()
  void ctx.resume()
}

export function playRestDone(): void {
  if (!ctx) return
  void ctx.resume()
  const start = ctx.currentTime
  ;[0, 0.22, 0.44].forEach((offset, index) => {
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = index === 2 ? 1320 : 880
    gain.gain.setValueAtTime(0.0001, start + offset)
    gain.gain.exponentialRampToValueAtTime(0.4, start + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.16)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start + offset)
    osc.stop(start + offset + 0.18)
  })
}
