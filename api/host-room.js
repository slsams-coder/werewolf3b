import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { roomCode, roundData } = req.body;
    
    // Save the round data to a specific room key.
    // We set 'ex: 86400' so the room automatically deletes itself after 24 hours.
    await redis.set(`room_${roomCode.toUpperCase()}`, JSON.stringify(roundData), { ex: 86400 });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
