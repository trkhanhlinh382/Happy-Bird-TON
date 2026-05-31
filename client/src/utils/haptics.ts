// haptics.ts

export const triggerHaptic = (type: 'light' | 'success' | 'error') => {
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
