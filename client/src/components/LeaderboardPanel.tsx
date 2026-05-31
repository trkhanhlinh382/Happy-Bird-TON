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
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  activeTab,
  activeLeaderboardEntries,
  getLeaderboardReward,
  leaderboardTab,
  setLeaderboardTab
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
  )
}
