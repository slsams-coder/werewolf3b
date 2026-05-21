import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { roomCode, playerName, deviceId } = req.query;

    if (!roomCode || !playerName || !deviceId) {
      return res.status(400).json({ error: "Missing connection data." });
    }

    const normRoom = roomCode.toUpperCase().trim();
    const normPlayer = playerName.trim();

    // 1. IDENTITY LOCK: Check if another device claimed this name
    const lockKey = `lock:${normRoom}:${normPlayer.toLowerCase()}`;
    let existingClaim = await redis.get(lockKey);

    if (!existingClaim) {
      // Unclaimed slot! Lock it to this device for 2 hours
      await redis.set(lockKey, deviceId, { ex: 7200 });
      existingClaim = deviceId;
    }

    if (existingClaim !== deviceId) {
      // Block impersonation attempts
      return res.status(403).json({ error: "This name is already connected on another device!" });
    }

    // 2. FETCH ROOM STATE: Pull state saved by the host
    const roomData = await redis.get(`room:${normRoom}`);
    if (!roomData) {
      return res.status(404).json({ error: "Room not found. Waiting for Host to initialize..." });
    }

    // 3. FIND PLAYER: Match current player inside the host's active grid
    const playerObj = roomData.players?.find(p => p.class.toLowerCase() === normPlayer.toLowerCase());
    if (!playerObj || playerObj.isAbsent) {
      return res.status(404).json({ error: "Player not found or marked absent by host." });
    }

    // 4. FETCH DYNAMIC ACTIONS: Pull live voting maps and sheriff states
    const votes = await redis.hgetall(`votes:${normRoom}`) || {};
    const revealedSheriffs = await redis.smembers(`sheriffs:${normRoom}`) || [];
    const alivePlayers = roomData.players?.filter(p => p.isAlive && !p.isAbsent).map(p => p.class) || [];

    // Calculate lovers if pairing is established
    let lovers = [];
    if (playerObj.isLover) {
      lovers = roomData.players
        ?.filter(p => p.isLover && p.class.toLowerCase() !== normPlayer.toLowerCase())
        .map(p => ({ name: p.class, role: p.role })) || [];
    }

    // 5. RETURN CLEAN DATA PACKAGE TO PHONE
    return res.status(200).json({
      isStarted: roomData.isStarted,
      isAlive: playerObj.isAlive,
      role: playerObj.role,
      hasRevealedSheriff: revealedSheriffs.some(s => s.toLowerCase() === normPlayer.toLowerCase()),
      isLover: playerObj.isLover,
      lovers: lovers,
      isTurned: playerObj.isTurned,
      isVotingActive: roomData.isVotingActive,
      myVote: votes[normPlayer] || null,
      alivePlayers: alivePlayers
    });

  } catch (error) {
    console.error("Error inside get-role handler:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}
