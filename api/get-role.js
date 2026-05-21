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

    // Find their partner(s) if they are a lover
    let loversData = [];
    if (player.isLover) {
        loversData = data.players
            .filter(p => p.isLover && p.class !== player.class)
            .map(p => ({ name: p.class, role: p.role }));
    }

    // Return the data to the player's phone
    return res.status(200).json({ 
        isStarted: data.isStarted,
        role: player.role, 
        isAlive: player.isAlive,
        isLover: player.isLover,
        lovers: loversData, // THIS IS THE CRUCIAL PART THAT WAS ADDED
        isTurned: player.isTurned
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
