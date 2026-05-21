import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { roomCode } = req.query;
    const state = await redis.get(`room_${roomCode.toUpperCase()}_client_state`) || { votes: {}, revealedSheriffs: [] };
    return res.status(200).json(state);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
