import { Redis } from '@upstash/redis'

// Initialize your Upstash client (make sure these variables are in your Vercel Environment Variables)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
    try {
        const { roomCode, playerName, deviceId } = req.query;

        if (!roomCode || !playerName || !deviceId) {
            return res.status(400).json({ error: "Missing connection data." });
        }

        // Create a unique key for Upstash Redis
        const lockKey = `lock:${roomCode.toUpperCase()}:${playerName.toLowerCase().trim()}`;

        // 1. Check Upstash to see if someone already claimed this name
        let existingClaim = await redis.get(lockKey);

        if (!existingClaim) {
            // 2. If unclaimed, set this device as the owner.
            // We give it a 2-hour expiration (7200 seconds) so old games clean themselves up!
            await redis.set(lockKey, deviceId, { ex: 7200 });
            existingClaim = deviceId;
        }

        // 3. If the device IDs don't match, block them!
        if (existingClaim !== deviceId) {
            return res.status(403).json({ error: "This name is already connected on another device!" });
        }

        // ... (Your existing logic to fetch roles from your room data)

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error." });
    }
}
