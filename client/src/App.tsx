import { CHAIN } from '@tonconnect/ui'
import {
  useIsConnectionRestored,
  useTonAddress,
  useTonConnectUI,
  useTonWallet,
} from '@tonconnect/ui-react'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import './App.css'
import { AdminPortal } from './components/AdminPortal'
import { LeaderboardPanel } from './components/LeaderboardPanel'
import { QuestsPanel } from './components/QuestsPanel'

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GROUND_HEIGHT,
  BIRD_X,
  BIRD_RADIUS,
  PIPE_WIDTH,
  PIPE_GAP,
  PIPE_SPEED,
  FLAP_FORCE,
  GRAVITY,
  BEST_SCORE_KEY,
} from './constants/gameConstants'
import { triggerHaptic } from './utils/haptics'
import { sfx } from './utils/soundEffects'
import {
  getStoredBestScore,
  getStoredLeaderboard,
  saveLeaderboard,
} from './utils/storage'
import {
  shortAddress,
  getSpeedMultiplier,
  createPipe,
} from './utils/gameHelpers'
import { drawScene } from './utils/gameRenderer'
import type { GamePhase, Particle } from './utils/gameRenderer'

type AppTab = 'play' | 'top' | 'info' | 'admin'
type TxStatus = 'idle' | 'pending' | 'sent' | 'error'
type GameoverPopup = 'record' | 'gameover' | null

type FloatingCoin = {
  id: number
  startX: number
  startY: number
  targetX: number
  targetY: number
  delay: number
}

function App() {
  const initialBestScore = getStoredBestScore()
  const initialLeaderboard = getStoredLeaderboard()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const bestScoreRef = useRef(initialBestScore)
  const playerNameRef = useRef('Guest pilot')
  const gamesPlayedTodayRef = useRef(0)
  const pointsAccumulatedTodayRef = useRef(0)
  const gamesTrackedForPointsRef = useRef(0)
  const hasPlayedFirstGameTodayRef = useRef(false)
  const birdBalanceRef = useRef(0)
  
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
  const telegramReady = Boolean(telegramWebApp)
  const telegramPlatform = telegramWebApp?.platform || 'browser'
  const telegramUser =
    telegramWebApp?.initDataUnsafe?.user?.first_name ||
    telegramWebApp?.initDataUnsafe?.user?.username ||
    (walletAddress ? `Pilot ${shortAddress(walletAddress)}` : 'Guest pilot')

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
  const [currentUserRank, setCurrentUserRank] = useState<number>(0)
  const [currentUserBestScore, setCurrentUserBestScore] = useState<number>(0)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState(0)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [withdrawTxStatus, setWithdrawTxStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    setWithdrawAmount(birdBalance)
  }, [birdBalance])

  // Keep refs in sync with state to avoid game loop useEffect teardowns
  useEffect(() => { gamesPlayedTodayRef.current = gamesPlayedToday }, [gamesPlayedToday])
  useEffect(() => { pointsAccumulatedTodayRef.current = pointsAccumulatedToday }, [pointsAccumulatedToday])
  useEffect(() => { gamesTrackedForPointsRef.current = gamesTrackedForPoints }, [gamesTrackedForPoints])
  useEffect(() => { hasPlayedFirstGameTodayRef.current = hasPlayedFirstGameToday }, [hasPlayedFirstGameToday])
  useEffect(() => { birdBalanceRef.current = birdBalance }, [birdBalance])

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
  const fetchGlobalLeaderboard = useCallback(async () => {
    const apiUrl = import.meta.env.VITE_API_URL
    if (!apiUrl) return
    
    try {
      const queryParams = new URLSearchParams({
        top: '10',
        tab: leaderboardTab,
        player: telegramUser || ''
      })
      const res = await fetch(`${apiUrl}/api/leaderboard?${queryParams.toString()}`)
      if (res.ok) {
        const data = await res.json()
        let entries = []
        let rank = 0
        let best = bestScore

        if (Array.isArray(data)) {
          entries = data
        } else if (data && Array.isArray(data.entries)) {
          entries = data.entries
          rank = data.playerRank || 0
          best = typeof data.playerBestScore === 'number' ? data.playerBestScore : bestScore
        }

        const formatted = entries.map((item: any) => ({
          player: item.player,
          bestScore: item.bestScore,
          updatedAt: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now()
        }))
        setLeaderboard(formatted)
        setCurrentUserRank(rank)
        setCurrentUserBestScore(best)
      }
    } catch (err) {
      console.error('Failed to fetch global leaderboard:', err)
    }
  }, [leaderboardTab, telegramUser, bestScore])

  useEffect(() => {
    fetchGlobalLeaderboard()
  }, [activeTab, fetchGlobalLeaderboard])

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

  const handleConfirmWithdraw = async () => {
    if (!wallet) {
      alert('Vui lòng kết nối ví TON trước!')
      return
    }
    if (!isTestnetWallet) {
      alert('Vui lòng chuyển mạng ví sang TON Testnet để thực hiện giao dịch!')
      return
    }
    if (withdrawAmount <= 0) {
      alert('Số lượng rút phải lớn hơn 0 BIRD!')
      return
    }
    if (withdrawAmount > birdBalance) {
      alert('Số lượng rút vượt quá số dư khả dụng!')
      return
    }

    const contractAddress = import.meta.env.VITE_BIRD_REWARD_CONTRACT || 'EQCXDZxPPN3W9RU8WpQu_cKAnP7lBaQD8n0me5zj-4eNotiA'
    
    setIsWithdrawing(true)
    setWithdrawTxStatus('idle')

    try {
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: contractAddress,
            amount: '50000000', // 0.05 TON fee
          }
        ]
      })

      const newBalance = Math.max(0, birdBalance - withdrawAmount)
      window.localStorage.setItem('happy-bird-ton-bird-balance', String(newBalance))
      setBirdBalance(newBalance)

      const player = telegramUser
      if (player !== 'Guest pilot') {
        const localScore = Number(window.localStorage.getItem(BEST_SCORE_KEY) || '0')
        const telegramId = telegramWebApp?.initDataUnsafe?.user?.id?.toString() || ""
        const username = telegramWebApp?.initDataUnsafe?.user?.username || ""
        const apiUrl = import.meta.env.VITE_API_URL
        if (apiUrl) {
          fetch(`${apiUrl}/api/leaderboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player, bestScore: localScore, telegramId, username, birdBalance: newBalance }),
          }).catch((err) => console.error('Failed to sync balance after withdrawal:', err))
        }
      }

      setWithdrawTxStatus('success')
      setIsWithdrawing(false)
      setTimeout(() => {
        setIsWithdrawOpen(false)
        setWithdrawTxStatus('idle')
      }, 2500)
    } catch (err) {
      console.error('Withdrawal transaction error:', err)
      setWithdrawTxStatus('error')
      setIsWithdrawing(false)
    }
  }

  /* --- Temporal Leaderboard filtering logic --- */
  const getFilteredLeaderboard = () => {
    return leaderboard
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
        await fetchGlobalLeaderboard()
      } catch (err) {
        console.error('Failed to auto-sync player profile:', err)
      }
    }
    syncProfileOnLoad()
  }, [telegramUser, telegramWebApp, birdBalance, fetchGlobalLeaderboard])

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
            body: JSON.stringify({ player, bestScore: nextScore, telegramId, username, birdBalance: birdBalanceRef.current }),
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
      const nextGamesPlayed = gamesPlayedTodayRef.current + 1
      window.localStorage.setItem('happy-bird-ton-games-today', String(nextGamesPlayed))
      setGamesPlayedToday(nextGamesPlayed)

      if (isNewRecord) {
        window.localStorage.setItem('happy-bird-ton-record-broken-today', 'true')
        setRecordBrokenToday(true)
      }

      // Accumulate score in first 3 games
      if (gamesTrackedForPointsRef.current < 3) {
        const nextAccumulated = pointsAccumulatedTodayRef.current + current.score
        const nextTracked = gamesTrackedForPointsRef.current + 1
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
        if (!hasPlayedFirstGameTodayRef.current) {
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

        const lastPipe = current.pipes[current.pipes.length - 1]
        if (lastPipe && lastPipe.x <= CANVAS_WIDTH - 220) {
          current.pipes.push(createPipe(0))
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
  }, [])

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
          </div>
        </section>

        <LeaderboardPanel
          activeTab={activeTab}
          activeLeaderboardEntries={activeLeaderboardEntries}
          getLeaderboardReward={getLeaderboardReward}
          leaderboardTab={leaderboardTab}
          setLeaderboardTab={setLeaderboardTab}
          currentUserRank={currentUserRank}
          currentUserBestScore={currentUserBestScore}
          currentUsername={telegramUser}
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
          onRequestWithdraw={() => {
            setIsWithdrawOpen(true)
            setWithdrawAmount(birdBalance)
          }}
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

      {/* ========================================================================= */}
      {/* WITHDRAW MODAL - Cosmic Glassmorphism Premium Căn Giữa Màn Hình Tuyệt Đối */}
      {/* ========================================================================= */}
      {isWithdrawOpen && (
        <div 
          className="withdraw-modal-overlay" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(5, 7, 12, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => {
            if (!isWithdrawing) {
              setIsWithdrawOpen(false);
              setWithdrawTxStatus('idle');
            }
          }}
        >
          <style>{`
            @keyframes withdraw-popup-in {
              from { transform: scale(0.9); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            @keyframes withdraw-spin {
              to { transform: rotate(360deg); }
            }
            .withdraw-modal-content {
              animation: withdraw-popup-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
            .withdraw-spinner {
              animation: withdraw-spin 0.8s linear infinite;
            }
          `}</style>
          
          <div 
            className="withdraw-modal-content"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 20, 38, 0.9) 0%, rgba(8, 10, 21, 0.95) 100%)',
              border: '1px solid rgba(0, 210, 255, 0.25)',
              borderRadius: '24px',
              padding: '24px',
              width: '100%',
              maxWidth: '380px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 210, 255, 0.15)',
              position: 'relative',
              color: '#fff',
              fontFamily: "'Inter', system-ui, sans-serif"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng */}
            {!isWithdrawing && (
              <button 
                onClick={() => {
                  setIsWithdrawOpen(false);
                  setWithdrawTxStatus('idle');
                }}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '18px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            )}

            {withdrawTxStatus === 'success' ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                <h3 style={{ fontSize: '1.4rem', color: '#39e19c', fontWeight: 800, margin: '0 0 12px' }}>Rút Tiền Thành Công!</h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 20px' }}>
                  Yêu cầu rút <strong>{withdrawAmount} BIRD</strong> đã được gửi lên mạng lưới TON thành công.
                </p>
                <div style={{ fontSize: '0.8rem', color: 'rgba(0, 210, 255, 0.8)', background: 'rgba(0, 210, 255, 0.05)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(0, 210, 255, 0.15)' }}>
                  Số dư khả dụng mới: <strong>{birdBalance} BIRD</strong>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '24px' }}>💸</span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>RÚT BIRD VỀ VÍ</h3>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    <span>Số dư khả dụng:</span>
                    <span style={{ color: '#00d2ff', fontWeight: 700 }}>{birdBalance} BIRD</span>
                  </div>
                  
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="number" 
                      value={withdrawAmount}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setWithdrawAmount(val);
                      }}
                      disabled={isWithdrawing}
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid rgba(0, 210, 255, 0.2)',
                        borderRadius: '12px',
                        padding: '12px 64px 12px 12px',
                        color: '#fff',
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      onClick={() => setWithdrawAmount(birdBalance)}
                      disabled={isWithdrawing}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        background: 'rgba(0, 210, 255, 0.15)',
                        border: '1px solid rgba(0, 210, 255, 0.3)',
                        color: '#00d2ff',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      MAX
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Phí mạng lưới (Gas fee):</span>
                    <span style={{ color: '#ffc837', fontWeight: 700 }}>0.05 TON</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Mạng lưới:</span>
                    <span style={{ color: '#39e19c', fontWeight: 700 }}>TON Testnet</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span>Địa chỉ nhận:</span>
                    <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: '180px', wordBreak: 'break-all', textAlign: 'right' }}>
                      {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}` : 'Chưa kết nối'}
                    </span>
                  </div>
                </div>

                {withdrawTxStatus === 'error' && (
                  <div style={{ color: '#ff5b7f', background: 'rgba(255, 91, 127, 0.08)', border: '1px solid rgba(255, 91, 127, 0.2)', padding: '10px 12px', borderRadius: '12px', fontSize: '0.75rem', marginBottom: '16px', lineHeight: '1.4' }}>
                    ⚠️ Giao dịch thất bại. Hãy chắc chắn rằng ví của bạn có đủ 0.05 TON Testnet và thử lại.
                  </div>
                )}

                <button
                  onClick={handleConfirmWithdraw}
                  disabled={isWithdrawing || withdrawAmount <= 0 || withdrawAmount > birdBalance}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '99px',
                    background: 'linear-gradient(90deg, #00c6ff 0%, #0072ff 100%)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: isWithdrawing || withdrawAmount <= 0 || withdrawAmount > birdBalance ? 'not-allowed' : 'pointer',
                    opacity: isWithdrawing || withdrawAmount <= 0 || withdrawAmount > birdBalance ? 0.6 : 1,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 0 15px rgba(0, 198, 255, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  {isWithdrawing ? (
                    <>
                      <span className="withdraw-spinner" style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        borderRadius: '50%'
                      }} />
                      ĐANG GỬI GIAO DỊCH...
                    </>
                  ) : (
                    'XÁC NHẬN RÚT'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

export default App
