import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  try {
    const { roomCode, playerName } = req.query;

    if (!roomCode) {
      return res.status(400).json({ error: "Missing room code." });
    }

    const normRoom = roomCode.toUpperCase().trim();

    // 1. Grab room data from Upstash
    const roundData = await redis.get(`room:${normRoom}`);

    if (!roundData) {
      return res.status(404).json({ error: "Room not found. Waiting for Host to initialize..." });
    }

    // 2. Fetch active votes/sheriff reveals from actions cache
    const actionData = await redis.get(`actions:${normRoom}`) || { votes: {}, revealedSheriffs: [] };

    // 3. MERGE ACTIVE VOTES INTO THE PLAYERS ARRAY FOR THE HOST SCREEN
    const mappedPlayers = roundData.players.map(p => {
      const playerKey = p.class.toLowerCase().trim();
      // Look up if this specific player has cast a vote in our Upstash actions cache
      const activeVoteKey = Object.keys(actionData.votes || {}).find(k => k.toLowerCase().trim() === playerKey);
      
      return {
        ...p,
        vote: activeVoteKey ? actionData.votes[activeVoteKey] : (p.vote || null) // Append vote string to player object
      };
    });

    // 4. ROUTE HOST REQUESTS (Host calls without a playerName parameter)
    if (!playerName) {
      return res.status(200).json({
        ...roundData,
        players: mappedPlayers // Return players with live vote metadata attached!
      });
    }

    // 5. ROUTE PLAYER REQUESTS
    const targetName = playerName.toLowerCase().trim();
    const playerObj = mappedPlayers.find(p => p.class.toLowerCase().trim() === targetName);

    if (!playerObj || playerObj.isAbsent) {
      return res.status(444).json({ error: "Your name is not registered in this active match." });
    }

    const hasRevealedSheriff = (actionData.revealedSheriffs || []).some(s => s.toLowerCase().trim() === targetName);

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
    console.error("Error reading room:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}
