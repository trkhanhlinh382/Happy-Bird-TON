import React from 'react'
import { TonConnectButton } from '@tonconnect/ui-react'

interface AdminPortalProps {
  walletAddress: string
  isAdmin: boolean
  adminPlayers: any[]
  adminEvents: any[]
  adminLoading: boolean
  adminStatusMsg: string
  adminSubTab: 'users' | 'events' | 'notifications'
  setAdminSubTab: (tab: 'users' | 'events' | 'notifications') => void
  handleToggleBan: (playerWallet: string, currentBanned: boolean) => void
  handleCreateEvent: (e: React.FormEvent) => void
  handleToggleEvent: (eventId: string, currentActive: boolean) => void
  handleBroadcast: (e: React.FormEvent) => void
  newEventTitle: string
  setNewEventTitle: (val: string) => void
  newEventDesc: string
  setNewEventDesc: (val: string) => void
  newEventRewardType: string
  setNewEventRewardType: (val: string) => void
  newEventRewardAmount: number
  setNewEventRewardAmount: (val: number) => void
  broadcastMessage: string
  setBroadcastMessage: (val: string) => void
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  walletAddress,
  isAdmin,
  adminPlayers,
  adminEvents,
  adminLoading,
  adminStatusMsg,
  adminSubTab,
  setAdminSubTab,
  handleToggleBan,
  handleCreateEvent,
  handleToggleEvent,
  handleBroadcast,
  newEventTitle,
  setNewEventTitle,
  newEventDesc,
  setNewEventDesc,
  newEventRewardType,
  setNewEventRewardType,
  newEventRewardAmount,
  setNewEventRewardAmount,
  broadcastMessage,
  setBroadcastMessage
}) => {
  return (
    <main className="admin-portal-shell" style={{
      width: '100%',
      minHeight: '100vh',
      background: '#04080F',
      color: '#fff',
      padding: '40px 20px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: "'Inter', 'Outfit', sans-serif",
      position: 'relative',
      overflowY: 'auto'
    }}>
      {/* Background glow and premium patterns */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '1200px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(0, 210, 255, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{ width: '100%', maxWidth: '1000px', zIndex: 1, position: 'relative' }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: '20px',
          marginBottom: '30px'
        }}>
          <div>
            <span className="eyebrow" style={{ color: 'var(--neon-blue)', letterSpacing: '0.2em' }}>COMMAND CENTER</span>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, margin: '6px 0 0 0', background: 'linear-gradient(135deg, #fff, #00d2ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Happy Bird Admin Portal</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#8da5c4' }}>Configure global events, manage player records, and broadcast alerts.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <a href="/" style={{
              textDecoration: 'none',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '10px 20px',
              borderRadius: '99px',
              background: 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Return to Game
            </a>
            <div className="wallet-button" style={{ margin: 0 }}>
              <TonConnectButton />
            </div>
          </div>
        </header>

        {/* Wallet Disconnected View */}
        {!walletAddress ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            textAlign: 'center',
            background: 'rgba(13, 22, 34, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            marginTop: '40px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(0, 210, 255, 0.1)',
              border: '1px solid rgba(0, 210, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--neon-blue)',
              marginBottom: '20px'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 10px 0' }}>Authorized Access Only</h2>
            <p style={{ color: '#8da5c4', fontSize: '0.9rem', maxWidth: '400px', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              Please connect your administrative TON wallet to authenticate and access the Game Command Center.
            </p>
            <div className="wallet-button" style={{ margin: 0 }}>
              <TonConnectButton />
            </div>
          </div>
        ) : !isAdmin ? (
          /* Connected but Unauthorized */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            textAlign: 'center',
            background: 'rgba(255, 91, 127, 0.03)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 91, 127, 0.2)',
            borderRadius: '24px',
            marginTop: '40px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255, 91, 127, 0.1)',
              border: '1px solid rgba(255, 91, 127, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ff5b7f',
              marginBottom: '20px'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 10px 0', color: '#ff5b7f' }}>403 - Access Denied</h2>
            <p style={{ color: '#8da5c4', fontSize: '0.9rem', maxWidth: '500px', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              Your connected wallet address is not recognized as an administrator:
              <br />
              <code style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', marginTop: '8px', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.8rem', color: '#fff' }}>
                {walletAddress}
              </code>
            </p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <a href="/" style={{
                textDecoration: 'none',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 700,
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '10px 20px',
                borderRadius: '99px',
                background: 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s'
              }}>
                Back to Game
              </a>
              <div className="wallet-button" style={{ margin: 0 }}>
                <TonConnectButton />
              </div>
            </div>
          </div>
        ) : (
          /* Authorized Admin Dashboard View */
          <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '30px', marginTop: '20px' }}>
            {/* Left Sidebar Menu */}
            <aside style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              background: 'rgba(13, 22, 34, 0.4)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px',
              padding: '16px',
              height: 'fit-content'
            }}>
              <span className="card-label" style={{ fontSize: '0.65rem', paddingLeft: '8px' }}>NAVIGATION</span>
              <button
                onClick={() => setAdminSubTab('users')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: adminSubTab === 'users' ? 'rgba(0, 210, 255, 0.1)' : 'transparent',
                  border: 'none',
                  borderColor: adminSubTab === 'users' ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                  borderStyle: 'solid',
                  borderWidth: '1px',
                  color: adminSubTab === 'users' ? 'var(--neon-blue)' : '#8da5c4',
                  fontWeight: 700,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Players ({adminPlayers.length})
              </button>
              <button
                onClick={() => setAdminSubTab('events')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: adminSubTab === 'events' ? 'rgba(0, 210, 255, 0.1)' : 'transparent',
                  border: 'none',
                  borderColor: adminSubTab === 'events' ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                  borderStyle: 'solid',
                  borderWidth: '1px',
                  color: adminSubTab === 'events' ? 'var(--neon-blue)' : '#8da5c4',
                  fontWeight: 700,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
                Campaigns ({adminEvents.length})
              </button>
              <button
                onClick={() => setAdminSubTab('notifications')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: adminSubTab === 'notifications' ? 'rgba(0, 210, 255, 0.1)' : 'transparent',
                  border: 'none',
                  borderColor: adminSubTab === 'notifications' ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                  borderStyle: 'solid',
                  borderWidth: '1px',
                  color: adminSubTab === 'notifications' ? 'var(--neon-blue)' : '#8da5c4',
                  fontWeight: 700,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><line x1="22" x2="11" y1="2" y2="13"/></svg>
                Telegram Broadcast
              </button>
            </aside>

            {/* Right Content Panel */}
            <div style={{ flex: 1 }}>
              {adminStatusMsg && (
                <div className="admin-status-toast" style={{
                  background: 'rgba(0,210,255,0.15)',
                  border: '1px solid var(--neon-blue)',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '0.85rem',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 0 15px rgba(0,210,255,0.25)'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  {adminStatusMsg}
                </div>
              )}

              {adminLoading && (
                <div style={{
                  color: 'var(--neon-blue)',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  marginBottom: '20px',
                  letterSpacing: '0.05em'
                }}>
                  ⌛ SYNCHRONIZING WITH BLOCKCHAIN & BACKEND...
                </div>
              )}

              {/* Subtab Content Panels */}
              {adminSubTab === 'users' && (
                <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Registered Players</h2>
                    <span style={{ fontSize: '0.8rem', color: '#8da5c4' }}>Total: {adminPlayers.length}</span>
                  </div>

                  <div style={{
                    background: 'rgba(13, 22, 34, 0.3)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px',
                    overflow: 'hidden'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          <th style={{ padding: '16px' }}>Status</th>
                          <th style={{ padding: '16px' }}>TON Wallet Address</th>
                          <th style={{ padding: '16px' }}>Telegram Account</th>
                          <th style={{ padding: '16px', textAlign: 'right' }}>Best Score</th>
                          <th style={{ padding: '16px', textAlign: 'right' }}>BIRD Balance</th>
                          <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminPlayers.length > 0 ? (
                          adminPlayers.map((player) => (
                            <tr key={player.player} style={{
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              background: player.banned ? 'rgba(255, 91, 127, 0.02)' : 'transparent',
                              transition: 'background 0.2s'
                            }}>
                              <td style={{ padding: '16px' }}>
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 900,
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  background: player.banned ? 'rgba(255, 91, 127, 0.15)' : 'rgba(57, 225, 156, 0.15)',
                                  color: player.banned ? '#ff5b7f' : 'var(--neon-green)',
                                  border: player.banned ? '1px solid rgba(255, 91, 127, 0.25)' : '1px solid rgba(57, 225, 156, 0.25)'
                                }}>
                                  {player.banned ? 'BANNED' : 'ACTIVE'}
                                </span>
                              </td>
                              <td style={{ padding: '16px', fontFamily: 'monospace', color: '#fff', fontSize: '0.8rem' }}>
                                {player.player}
                              </td>
                              <td style={{ padding: '16px', color: '#8da5c4' }}>
                                {player.username ? (
                                  <span>
                                    <strong>@{player.username}</strong>
                                    <br />
                                    <small style={{ opacity: 0.6 }}>ID: {player.telegramId}</small>
                                  </span>
                                ) : (
                                  <span style={{ fontStyle: 'italic', opacity: 0.5 }}>None</span>
                                )}
                              </td>
                              <td style={{ padding: '16px', textAlign: 'right', fontWeight: 800, color: 'var(--neon-blue)', fontSize: '1rem' }}>
                                {player.bestScore} pts
                              </td>
                              <td style={{ padding: '16px', textAlign: 'right', fontWeight: 800, color: 'var(--neon-gold)', fontSize: '1rem' }}>
                                {player.birdBalance || 0} BIRD
                              </td>
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <button
                                  onClick={() => handleToggleBan(player.player, player.banned)}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    borderRadius: '6px',
                                    background: player.banned ? 'rgba(0, 210, 255, 0.1)' : 'rgba(255, 91, 127, 0.1)',
                                    border: player.banned ? '1px solid rgba(0, 210, 255, 0.2)' : '1px solid rgba(255, 91, 127, 0.2)',
                                    color: player.banned ? '#00d2ff' : '#ff5b7f',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {player.banned ? 'UNBAN' : 'BAN'}
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#8da5c4' }}>
                              No players registered in the database.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {adminSubTab === 'events' && (
                <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                  {/* Launch Form */}
                  <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px' }}>Create Campaign</h2>
                    <form onSubmit={handleCreateEvent} className="info-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <span className="card-label">NEW LIVE CAMPAIGN</span>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8da5c4' }}>TITLE</label>
                        <input
                          type="text"
                          placeholder="Event Title (e.g. Double Token Event)"
                          value={newEventTitle}
                          onChange={(e) => setNewEventTitle(e.target.value)}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            fontSize: '0.85rem'
                          }}
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8da5c4' }}>DESCRIPTION</label>
                        <textarea
                          placeholder="Describe rules (e.g. Play between 5h-6h to receive a 2.5x point multiplier on claims!)"
                          value={newEventDesc}
                          onChange={(e) => setNewEventDesc(e.target.value)}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            fontSize: '0.85rem',
                            minHeight: '80px',
                            resize: 'vertical'
                          }}
                          required
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8da5c4' }}>REWARD TYPE</label>
                          <select
                            value={newEventRewardType}
                            onChange={(e) => setNewEventRewardType(e.target.value)}
                            style={{
                              padding: '12px',
                              borderRadius: '8px',
                              background: 'rgba(5, 10, 17, 0.95)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: 'white',
                              fontSize: '0.85rem',
                              height: '43px'
                            }}
                          >
                            <option value="token">Token Reward (BIRD)</option>
                            <option value="gas_discount">Gas Discount (TON)</option>
                            <option value="airdrop">Free Airdrop</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8da5c4' }}>BONUS AMOUNT</label>
                          <input
                            type="number"
                            placeholder="50"
                            value={newEventRewardAmount}
                            onChange={(e) => setNewEventRewardAmount(Number(e.target.value))}
                            style={{
                              padding: '12px',
                              borderRadius: '8px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: 'white',
                              fontSize: '0.85rem',
                              height: '43px',
                              boxSizing: 'border-box'
                            }}
                            min="0"
                          />
                        </div>
                      </div>

                      <button type="submit" className="secondary-button primary-glow" style={{ width: '100%', height: '44px', cursor: 'pointer', marginTop: '10px' }}>
                        🚀 DEPLOY & BROADCAST EVENT
                      </button>
                    </form>
                  </div>

                  {/* Campaigns List */}
                  <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px' }}>Active Campaigns</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {adminEvents.length > 0 ? (
                        adminEvents.map((evt) => (
                          <article key={evt._id} className="info-card" style={{
                            padding: '20px',
                            opacity: evt.isActive ? 1 : 0.65,
                            border: evt.isActive ? '1.5px solid rgba(0,210,255,0.35)' : '1px solid rgba(255,255,255,0.08)',
                            background: evt.isActive ? 'linear-gradient(135deg, rgba(13, 22, 34, 0.6), rgba(0, 210, 255, 0.05))' : 'rgba(255,255,255,0.02)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ maxWidth: '75%' }}>
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 900,
                                  padding: '3px 8px',
                                  borderRadius: '5px',
                                  background: evt.isActive ? 'rgba(0, 210, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                                  color: evt.isActive ? 'var(--neon-blue)' : '#8da5c4',
                                  border: evt.isActive ? '1px solid rgba(0, 210, 255, 0.25)' : '1px solid rgba(255, 255, 255, 0.15)',
                                  display: 'inline-block',
                                  marginBottom: '10px'
                                }}>
                                  {evt.isActive ? '🔴 RUNNING LIVE' : '⏸️ SUSPENDED'}
                                </span>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 'bold', color: '#fff' }}>{evt.title}</h4>
                                <p style={{ fontSize: '0.85rem', color: '#8da5c4', margin: '0 0 10px 0', lineHeight: '1.4' }}>{evt.description}</p>
                                {evt.rewardAmount > 0 && (
                                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--neon-gold)', background: 'rgba(255, 200, 55, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255, 200, 55, 0.2)' }}>
                                    🎁 Bonus: +{evt.rewardAmount} BIRD
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleEvent(evt._id, evt.isActive)}
                                style={{
                                  padding: '8px 16px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  borderRadius: '8px',
                                  background: evt.isActive ? 'rgba(255, 91, 127, 0.1)' : 'rgba(0, 210, 255, 0.1)',
                                  border: evt.isActive ? '1px solid rgba(255, 91, 127, 0.2)' : '1px solid rgba(0, 210, 255, 0.2)',
                                  color: evt.isActive ? '#ff5b7f' : '#00d2ff',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                {evt.isActive ? 'PAUSE' : 'ACTIVATE'}
                              </button>
                            </div>
                          </article>
                        ))
                      ) : (
                        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#8da5c4', padding: '20px' }}>No campaigns initialized yet.</p>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {adminSubTab === 'notifications' && (
                <section style={{ maxWidth: '600px', margin: '0 auto' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px' }}>Broadcast Announcement</h2>
                  <form onSubmit={handleBroadcast} className="info-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <span className="card-label">TELEGRAM TELEMETRY</span>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Send Telegram Alerts</h3>
                    <p style={{ fontSize: '0.85rem', color: '#8da5c4', lineHeight: '1.5', margin: 0 }}>
                      Write a broadcast announcement. It will be pushed directly through your bot to the Telegram accounts of all players who have synced their Telegram profiles (using standard HTML formatting).
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8da5c4' }}>MESSAGE CONTENT</label>
                      <textarea
                        placeholder="Type your message here... (e.g. <b>New Airdrop Event!</b> Go play now!)"
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'white',
                          fontSize: '0.85rem',
                          minHeight: '150px',
                          resize: 'vertical',
                          boxSizing: 'border-box'
                        }}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="secondary-button primary-glow"
                      style={{ width: '100%', height: '44px', cursor: 'pointer', marginTop: '10px' }}
                      disabled={adminLoading}
                    >
                      {adminLoading ? 'BROADCASTING...' : '📣 TRANSMIT TO PLAYERS'}
                    </button>
                  </form>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
