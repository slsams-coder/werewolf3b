import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { roomCode, playerName } = req.query;
    
    // Fetch the room data
    const data = await redis.get(`room_${roomCode.toUpperCase()}`);
    if (!data) return res.status(404).json({ error: 'Room not found' });

    // Find the specific player
    const player = data.players.find(p => p.class.toLowerCase() === playerName.toLowerCase().trim());
    if (!player) return res.status(404).json({ error: 'Player name not found in this game.' });

    // Return only what the player is allowed to see
    return res.status(200).json({ 
        isStarted: data.isStarted,
        role: player.role, 
        isAlive: player.isAlive,
        isLover: player.isLover,
        isTurned: player.isTurned
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
