import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { roomCode, roundData } = req.body;

    if (!roomCode || !roundData) {
      return res.status(400).json({ error: "Missing room code or round data." });
    }

    const normRoom = roomCode.toUpperCase().trim();

    // Store the exact round data the host's script sends over
    await redis.set(`room:${normRoom}`, roundData, { ex: 7200 }); // Expires in 2 hours

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error hosting room in Upstash:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}
