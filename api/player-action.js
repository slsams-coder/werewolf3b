import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { roomCode, playerName, action, target } = req.body;
    const stateKey = `room_${roomCode.toUpperCase()}_client_state`;
    
    // Fetch current client state, or create a blank one
    let state = await redis.get(stateKey) || { votes: {}, revealedSheriffs: [] };

    // Handle the specific actions
    if (action === 'VOTE') {
        if (!state.votes) state.votes = {};
        state.votes[playerName] = target;
    } else if (action === 'REVEAL_SHERIFF') {
        if (!state.revealedSheriffs) state.revealedSheriffs = [];
        if (!state.revealedSheriffs.includes(playerName)) state.revealedSheriffs.push(playerName);
    } else if (action === 'CLEAR_VOTES') {
        state.votes = {};
    } else if (action === 'RESET_ALL') {
        state = { votes: {}, revealedSheriffs: [] };
    }

    // Save it back to the database
    await redis.set(stateKey, state);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
