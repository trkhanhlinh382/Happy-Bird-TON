import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/happybird';

app.use(cors());
app.use(express.json());

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const leaderboardSchema = new mongoose.Schema({
  player: { type: String, required: true },
  bestScore: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

// Get top N leaderboard
app.get('/api/leaderboard', async (req, res) => {
  const top = parseInt(req.query.top) || 20;
  const entries = await Leaderboard.find().sort({ bestScore: -1, updatedAt: -1 }).limit(top);
  res.json(entries);
});

// Submit or update score
app.post('/api/leaderboard', async (req, res) => {
  const { player, bestScore } = req.body;
  if (!player || typeof bestScore !== 'number') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  let entry = await Leaderboard.findOne({ player });
  if (!entry) {
    entry = new Leaderboard({ player, bestScore });
  } else if (bestScore > entry.bestScore) {
    entry.bestScore = bestScore;
    entry.updatedAt = Date.now();
  }
  await entry.save();
  res.json(entry);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
