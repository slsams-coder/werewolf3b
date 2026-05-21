import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { roomCode, roundData } = req.body;
    
    // FIX: Changed 'room_' to 'room:' to match get-role.js
    // Also, Upstash Redis automatically handles JSON serialization, 
    // so sending roundData directly is safer if get-role.js expects an object.
    await redis.set(`room:${roomCode.toUpperCase()}`, roundData, { ex: 86400 });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
