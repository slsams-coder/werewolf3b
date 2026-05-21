import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  try {
    const { roomCode, playerName } = req.query;

    if (!roomCode) return res.status(400).json({ error: "Missing room code." });

    const normRoom = roomCode.toUpperCase().trim();

    // 1. Grab base room configuration
    const roundData = await redis.get(`room:${normRoom}`);
    if (!roundData) {
      return res.status(404).json({ error: "Room not found. Waiting for Host to initialize..." });
    }

    // 2. Grab latest live action hashes
    const [votes, sheriffsMap] = await Promise.all([
      redis.hgetall(`votes:${normRoom}`),
      redis.hgetall(`sheriffs:${normRoom}`)
    ]);

    const activeVotes = votes || {};
    const revealedSheriffs = sheriffsMap ? Object.keys(sheriffsMap) : [];

    // 3. Map votes dynamically to prevent data drops
    const mappedPlayers = roundData.players.map(p => {
      const playerKey = p.class.toLowerCase().trim();
      const activeVoteKey = Object.keys(activeVotes).find(k => k.toLowerCase().trim() === playerKey);
      return {
        ...p,
        vote: activeVoteKey ? activeVotes[activeVoteKey] : (p.vote || null)
      };
    });

    if (!playerName) {
      return res.status(200).json({ ...roundData, players: mappedPlayers });
    }

    const targetName = playerName.toLowerCase().trim();
    const playerObj = mappedPlayers.find(p => p.class.toLowerCase().trim() === targetName);

    if (!playerObj || playerObj.isAbsent) {
      return res.status(444).json({ error: "Your name is not registered in this active match." });
    }

    const hasRevealedSheriff = revealedSheriffs.some(s => s.toLowerCase().trim() === targetName);

    return res.status(200).json({
      isStarted: roundData.isStarted,
      isVotingActive: roundData.isVotingActive,
      role: playerObj.role,
      isAlive: playerObj.isAlive,
      isLover: playerObj.isLover,
      isTurned: playerObj.isTurned,
      myVote: playerObj.vote,
      hasRevealedSheriff: hasRevealedSheriff,
      alivePlayers: mappedPlayers.filter(p => p.isAlive && !p.isAbsent).map(p => p.class),
      lovers: playerObj.isLover ? mappedPlayers.filter(p => p.isLover).map(p => ({ name: p.class, role: p.role })) : []
    });

  } catch (error) {
    console.error("Error reading role:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}
