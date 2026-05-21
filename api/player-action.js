import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { roomCode, playerName, action, target } = req.body;

    if (!roomCode) {
      return res.status(400).json({ error: "Missing room code." });
    }

    const normRoom = roomCode.toUpperCase().trim();

    // 1. HANDLE VOTING ATOMICALLY
    if (action === 'VOTE') {
      if (!playerName || !target) {
        return res.status(400).json({ error: "Missing voter name or target." });
      }
      const voterKey = playerName.toLowerCase().trim();
      
      // hset saves the vote target directly under the player's name field
      await redis.hset(`votes:${normRoom}`, { [voterKey]: target });
      return res.status(200).json({ success: true });
    }

    // 2. HANDLE SHERIFF REVEALS ATOMICALLY
    if (action === 'REVEAL_SHERIFF') {
      if (!playerName) return res.status(400).json({ error: "Missing player name." });
      const sheriffKey = playerName.toLowerCase().trim();
      
      await redis.hset(`sheriffs:${normRoom}`, { [sheriffKey]: "true" });
      return res.status(200).json({ success: true });
    }

    // 3. CLEAR VOTES WHEN HOST CLOSES VOTING
    if (action === 'CLEAR_VOTES') {
      await redis.del(`votes:${normRoom}`);
      return res.status(200).json({ success: true });
    }

    // 4. RESET ROOM DATA FOR NEW GAMES
    if (action === 'RESET_ALL') {
      await redis.del(`votes:${normRoom}`);
      await redis.del(`sheriffs:${normRoom}`);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Invalid action type." });

  } catch (error) {
    console.error("Error processing player action:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}
