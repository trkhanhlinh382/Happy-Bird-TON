import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import https from 'https';

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/happybird';

app.use(cors());
app.use(express.json());

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Expanded schema to store Telegram meta and ban status
const leaderboardSchema = new mongoose.Schema({
  player: { type: String, required: true, unique: true },
  bestScore: { type: Number, required: true },
  telegramId: { type: String },
  username: { type: String },
  banned: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
});

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

// Schema for active game events
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  rewardType: { type: String, default: 'token' }, // 'token', 'gas_discount', 'airdrop'
  rewardAmount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const Event = mongoose.model('Event', eventSchema);

// Helper function to send Telegram Bot Message
function sendTelegramMessage(chatId, text, botToken) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Telegram error ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

// -------------------------------------------------------------------------
// PUBLIC ENDPOINTS
// -------------------------------------------------------------------------

// Get top N leaderboard
app.get('/api/leaderboard', async (req, res) => {
  const top = parseInt(req.query.top) || 20;
  // Exclude banned players from public leaderboard
  const entries = await Leaderboard.find({ banned: { $ne: true } })
    .sort({ bestScore: -1, updatedAt: -1 })
    .limit(top);
  res.json(entries);
});

// Submit or update score
app.post('/api/leaderboard', async (req, res) => {
  const { player, bestScore, telegramId, username } = req.body;
  if (!player || typeof bestScore !== 'number') {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    let entry = await Leaderboard.findOne({ player });
    
    // Check if player is banned
    if (entry && entry.banned) {
      return res.status(403).json({ error: 'Player is banned from competing' });
    }

    if (!entry) {
      entry = new Leaderboard({ player, bestScore, telegramId, username });
    } else {
      // Sync telegram info if provided
      if (telegramId) entry.telegramId = telegramId;
      if (username) entry.username = username;
      
      // Update highscore
      if (bestScore > entry.bestScore) {
        entry.bestScore = bestScore;
        entry.updatedAt = Date.now();
      }
    }
    await entry.save();
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all active events
app.get('/api/events/active', async (req, res) => {
  try {
    const activeEvents = await Event.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(activeEvents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------------------
// ADMIN PANEL ENDPOINTS
// -------------------------------------------------------------------------

// Get all players
app.get('/api/admin/players', async (req, res) => {
  try {
    const players = await Leaderboard.find().sort({ bestScore: -1 });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ban/Unban player
app.post('/api/admin/players/ban', async (req, res) => {
  const { player, banned } = req.body;
  if (!player || typeof banned !== 'boolean') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  try {
    const entry = await Leaderboard.findOne({ player });
    if (!entry) return res.status(404).json({ error: 'Player not found' });
    entry.banned = banned;
    await entry.save();
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all events (Admin view)
app.get('/api/admin/events', async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new event
app.post('/api/admin/events', async (req, res) => {
  const { title, description, rewardType, rewardAmount } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const event = new Event({ title, description, rewardType, rewardAmount: rewardAmount || 0 });
    await event.save();
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle event active status
app.post('/api/admin/events/toggle', async (req, res) => {
  const { id, isActive } = req.body;
  if (!id || typeof isActive !== 'boolean') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  try {
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    event.isActive = isActive;
    await event.save();
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Broadcast Telegram notification to all registered players
app.post('/api/admin/notifications/broadcast', async (req, res) => {
  const { message } = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  if (!botToken) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN is not configured on server env' });
  }

  try {
    // Fetch players that have a registered telegramId
    const players = await Leaderboard.find({ telegramId: { $exists: true, $ne: null } });
    
    let successCount = 0;
    let failCount = 0;

    for (const player of players) {
      try {
        await sendTelegramMessage(player.telegramId, message, botToken);
        successCount++;
      } catch (err) {
        console.error(`Failed to notify telegramId ${player.telegramId}:`, err.message);
        failCount++;
      }
    }

    res.json({
      success: true,
      totalPlayers: players.length,
      successCount,
      failCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
