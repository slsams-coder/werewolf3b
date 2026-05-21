import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { roomCode, action, playerName, target, deviceId } = req.body;

    if (!roomCode || !action) {
      return res.status(400).json({ error: "Missing required parameters." });
    }

    const normRoom = roomCode.toUpperCase().trim();

    // --- HOST ACTIONS ---
    if (action === 'RESET_ALL') {
      // Find and delete all identity locks for this room
      const lockKeys = await redis.keys(`lock:${normRoom}:*`);
      if (lockKeys.length > 0) await redis.del(...lockKeys);
      
      // Clear dynamic action elements
      await redis.del(`votes:${normRoom}`);
      await redis.del(`votetimes:${normRoom}`);
      await redis.del(`sheriffs:${normRoom}`);
      return res.status(200).json({ success: true });
    }

    if (action === 'CLEAR_VOTES') {
      await redis.del(`votes:${normRoom}`);
      await redis.del(`votetimes:${normRoom}`);
      return res.status(200).json({ success: true });
    }

    if (action === 'UNLOCK_PLAYER') {
      if (!target) return res.status(400).json({ error: "Missing target player to unlock." });
      
      const targetNorm = target.trim().toLowerCase();
      await redis.del(`lock:${normRoom}:${targetNorm}`);
      return res.status(200).json({ success: true });
    }

    // --- PLAYER ACTIONS ---
    if (!playerName || !deviceId) {
      return res.status(400).json({ error: "Missing player payload parameters." });
    }

    const normPlayer = playerName.trim();

    // ANCHOR SECURITY CHECK: Verify device ownership before running action
    const lockKey = `lock:${normRoom}:${normPlayer.toLowerCase()}`;
    const ownerId = await redis.get(lockKey);
    if (ownerId && ownerId !== deviceId) {
      return res.status(403).json({ error: "Identity mismatch! Action rejected." });
    }

    // Process secure voting action
    if (action === 'VOTE') {
      if (!target) {
        await redis.hdel(`votes:${normRoom}`, normPlayer);
        await redis.hdel(`votetimes:${normRoom}`, normPlayer);
      } else {
        await redis.hset(`votes:${normRoom}`, { [normPlayer]: target.trim() });
        await redis.hset(`votetimes:${normRoom}`, { [normPlayer]: Date.now() });
      }
      return res.status(200).json({ success: true });
    }

    // Process secure sheriff reveal action
    if (action === 'REVEAL_SHERIFF') {
      await redis.sadd(`sheriffs:${normRoom}`, normPlayer);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Invalid action type." });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
