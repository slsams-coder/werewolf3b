import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  try {
    const { roomCode } = req.query;
    if (!roomCode) return res.status(400).json({ error: "Missing room code." });

    const normRoom = roomCode.toUpperCase().trim();

    // Fetch both active votes and sheriff lists in parallel
    const [votes, sheriffsMap] = await Promise.all([
      redis.hgetall(`votes:${normRoom}`),
      redis.hgetall(`sheriffs:${normRoom}`)
    ]);

    const revealedSheriffs = sheriffsMap ? Object.keys(sheriffsMap) : [];

    // Return objects structured exactly for the host's clientState requirements
    return res.status(200).json({
      votes: votes || {},
      revealedSheriffs: revealedSheriffs
    });
  } catch (error) {
    console.error("Error fetching room actions:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}
