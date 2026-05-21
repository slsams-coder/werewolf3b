import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { roomCode } = req.query;
    if (!roomCode) {
      return res.status(400).json({ error: "Missing roomCode parameter." });
    }

    const normRoom = roomCode.toUpperCase().trim();

    // 1. Fetch live votes from the Redis Hash Map
    const votes = await redis.hgetall(`votes:${normRoom}`) || {};

    // 2. Fetch revealed sheriffs from the Redis Set
    const revealedSheriffs = await redis.smembers(`sheriffs:${normRoom}`) || [];

    // 3. Return the exact object structure the host UI expects
    return res.status(200).json({
      votes,
      revealedSheriffs
    });
    
  } catch (error) {
    console.error("Error inside get-room-actions handler:", error);
    return res.status(500).json({ error: error.message });
  }
}
