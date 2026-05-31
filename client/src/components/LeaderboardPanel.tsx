import React from 'react'

interface LeaderboardEntry {
  player: string
  bestScore: number
  updatedAt: number
}

interface LeaderboardPanelProps {
  activeTab: string
  activeLeaderboardEntries: LeaderboardEntry[]
  getLeaderboardReward: (rank: number) => string
  leaderboardTab: 'daily' | 'weekly' | 'monthly'
  setLeaderboardTab: (tab: 'daily' | 'weekly' | 'monthly') => void
  currentUserRank: number
  currentUserBestScore: number
  currentUsername: string
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  activeTab,
  activeLeaderboardEntries,
  getLeaderboardReward,
  leaderboardTab,
  setLeaderboardTab,
  currentUserRank,
  currentUserBestScore,
  currentUsername
}) => {
  return (
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {activeLeaderboardEntries.length > 0 ? (
          <ol className="leaderboard-list" style={{ marginBottom: 0 }}>
            {activeLeaderboardEntries.map((entry, index) => {
              const isMe = entry.player === currentUsername
              return (
                <li
                  key={entry.player}
                  className={`leaderboard-item ${isMe ? 'is-me' : ''}`}
                  style={isMe ? {
                    background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.08), rgba(255, 91, 127, 0.02))',
                    borderColor: 'rgba(0, 210, 255, 0.3)',
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  } : {}}
                >
                  <span className="leader-rank">{index + 1}</span>
                  <div className="leader-meta">
                    <strong>{entry.player} {isMe && "(Me)"}</strong>
                    <p>{new Date(entry.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span className="leader-score">{entry.bestScore}</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--neon-gold)', letterSpacing: '0.02em' }}>
                      {getLeaderboardReward(index + 1)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        ) : (
          <article className="info-card" style={{ margin: 0 }}>
            <span className="card-label">NO DATA</span>
            <h3>No runs recorded yet</h3>
            <p>Play a game inside the {leaderboardTab} window to make the list.</p>
          </article>
        )}

        {/* Persistent 'Me' Card at the bottom if not in Top 10 */}
        {(currentUserRank > 10 || currentUserRank === 0) && (
          <div className="leaderboard-item is-me" style={{
            background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.12), rgba(255, 91, 127, 0.04))',
            borderColor: 'rgba(0, 210, 255, 0.45)',
            boxShadow: '0 0 15px rgba(0, 210, 255, 0.15)',
            borderStyle: 'solid',
            borderWidth: '1.5px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            justifyContent: 'space-between',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="leader-rank" style={{ color: 'var(--neon-blue)', fontWeight: 900, fontSize: '1.1rem', minWidth: '24px' }}>
                {currentUserRank > 0 ? currentUserRank : '-'}
              </span>
              <div className="leader-meta" style={{ textAlign: 'left' }}>
                <strong style={{ color: 'white' }}>{currentUsername} (Me)</strong>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>Personal best record</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              <span className="leader-score" style={{ color: 'var(--neon-blue)', fontWeight: 800, fontSize: '1.2rem' }}>{currentUserBestScore}</span>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--neon-gold)', letterSpacing: '0.02em' }}>
                {getLeaderboardReward(currentUserRank)}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
