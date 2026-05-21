import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  try {
    const { roomCode, playerName } = req.query;

    if (!roomCode || !playerName) {
      return res.status(400).json({ error: "Missing parameters." });
    }

    const normRoom = roomCode.toUpperCase().trim();
    const targetName = playerName.toLowerCase().trim();

    // 1. Grab data from Upstash
    const roundData = await redis.get(`room:${normRoom}`);

    if (!roundData) {
      return res.status(404).json({ error: "Room not found. Waiting for Host to initialize..." });
    }

    // 2. Locate the player inside the host's array
    const playerObj = roundData.players.find(p => p.class.toLowerCase().trim() === targetName);

    if (!playerObj || playerObj.isAbsent) {
      return res.status(444).json({ error: "Your name is not registered in this active match." });
    }

    // 3. Look up active votes/sheriff states from the room actions cache
    const actionData = await redis.get(`actions:${normRoom}`) || { votes: {}, revealedSheriffs: [] };
    
    const myVoteKey = Object.keys(actionData.votes || {}).find(k => k.toLowerCase().trim() === targetName);
    const hasRevealedSheriff = (actionData.revealedSheriffs || []).some(s => s.toLowerCase().trim() === targetName);

    // 4. Send back exactly what index.html needs to build its interface
    return res.status(200).json({
      isStarted: roundData.isStarted,
      isVotingActive: roundData.isVotingActive,
      role: playerObj.role,
      isAlive: playerObj.isAlive,
      isLover: playerObj.isLover,
      isTurned: playerObj.isTurned,
      myVote: myVoteKey ? actionData.votes[myVoteKey] : null,
      hasRevealedSheriff: hasRevealedSheriff,
      alivePlayers: roundData.players.filter(p => p.isAlive && !p.isAbsent).map(p => p.class),
      lovers: playerObj.isLover ? roundData.players.filter(p => p.isLover).map(p => ({ name: p.class, role: p.role })) : []
    });

  } catch (error) {
    console.error("Error reading room:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}
