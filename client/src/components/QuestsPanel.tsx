import React from 'react'
import { TonConnectButton } from '@tonconnect/ui-react'

interface QuestsPanelProps {
  activeTab: string
  streak: number
  checkedInToday: boolean
  hasPlayedFirstGameToday: boolean
  birdBalance: number
  gamesPlayedToday: number
  recordBrokenToday: boolean
  pointsAccumulatedToday: number
  gamesTrackedForPoints: number
  quest1Claimed: boolean
  quest2Claimed: boolean
  quest3Claimed: boolean
  handleCheckInClaim: (e: React.MouseEvent<HTMLButtonElement>) => void
  handleQuestClaim: (questNum: 1 | 2 | 3, amount: number, e: React.MouseEvent<HTMLButtonElement>) => void
  
  // Wallet & Profile props
  isConnectionRestored: boolean
  wallet: any
  isTestnetWallet: boolean
  walletAddress: string
  shortAddress: (addr: string) => string
  telegramUser: string
  bestScore: number
  telegramReady: boolean
  telegramPlatform: string
  gamePhase: string
  score: number
  handleRecordScore: () => void
  txStatus: string
  onRequestWithdraw: () => void
}

export const QuestsPanel: React.FC<QuestsPanelProps> = ({
  activeTab,
  streak,
  checkedInToday,
  hasPlayedFirstGameToday,
  birdBalance,
  gamesPlayedToday,
  recordBrokenToday,
  pointsAccumulatedToday,
  gamesTrackedForPoints,
  quest1Claimed,
  quest2Claimed,
  quest3Claimed,
  handleCheckInClaim,
  handleQuestClaim,
  isConnectionRestored,
  wallet,
  isTestnetWallet,
  walletAddress,
  shortAddress,
  telegramUser,
  bestScore,
  telegramReady,
  telegramPlatform,
  gamePhase,
  score,
  handleRecordScore,
  txStatus,
  onRequestWithdraw
}) => {
  return (
    <section className={`info-page tab-panel ${activeTab === 'info' ? 'is-active' : ''}`}>
      
      {/* BIRD Token Balance Wallet HUD with WITHDRAW button */}
      <div className="bird-wallet" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div className="wallet-balance-info">
            <span>BIRD Wallet Balance</span>
            <div className="wallet-balance-amount">
              {birdBalance} BIRD
            </div>
          </div>
          <div className="wallet-coin-icon" title="BIRD Token Coin">B</div>
        </div>

        <button
          type="button"
          className="withdraw-hud-btn primary-glow"
          disabled={birdBalance <= 0}
          onClick={() => {
            if (!wallet) {
              alert('Vui lòng kết nối ví TON Testnet của bạn trước khi rút tiền!')
              return
            }
            onRequestWithdraw()
          }}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 210, 255, 0.3)',
            background: 'rgba(0, 210, 255, 0.08)',
            color: 'var(--neon-blue)',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: birdBalance <= 0 ? 'not-allowed' : 'pointer',
            opacity: birdBalance <= 0 ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
          }}
        >
          <span>💸</span> RÚT VỀ VÍ (WITHDRAW TO WALLET)
        </button>
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
            
            // Determine day state using modulo-7 safe index
            const isClaimed = checkedInToday
              ? (streak === 7 || streak === 0 ? true : i < (streak % 7))
              : i < (streak % 7)
            const isActive = hasPlayedFirstGameToday && !checkedInToday && i === (streak % 7)

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

          {/* Quest 3: Accumulate 100 points */}
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

      {/* Player Profile */}
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

      {/* Score submission */}
      {gamePhase === 'gameover' && isTestnetWallet && (
        <article className="info-card reward-card" style={{ marginTop: '16px' }}>
          <span className="card-label">BLOCKCHAIN DECK</span>
          <h3>Submit Score</h3>
          <p>Record your score of <strong>{score}</strong> on the TON Testnet.</p>
          <button
            type="button"
            className="secondary-button primary-glow"
            style={{ width: '100%', height: '40px', cursor: 'pointer' }}
            disabled={txStatus === 'pending'}
            onClick={handleRecordScore}
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
            <p className="tx-error" style={{ color: 'var(--neon-pink)', fontSize: '0.8rem', marginTop: '8px' }}>Transaction failed. Try again.</p>
          )}
        </article>
      )}

    </section>
  )
}
