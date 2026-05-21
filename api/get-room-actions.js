import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { roomCode } = req.query;
    if (!roomCode) return res.status(400).json({ error: "Missing roomCode parameter." });

    const normRoom = roomCode.toUpperCase().trim();

    // 1. Fetch live votes and timestamps from Redis Hash Maps
    const votes = await redis.hgetall(`votes:${normRoom}`) || {};
    const votetimes = await redis.hgetall(`votetimes:${normRoom}`) || {};

    // 2. Fetch revealed sheriffs from the Redis Set
    const revealedSheriffs = await redis.smembers(`sheriffs:${normRoom}`) || [];

    // 3. Calculate who placed the FIRST vote on each target player
    const firstVoters = {}; 
    const earliestTimes = {};

    for (const [voter, target] of Object.entries(votes)) {
      const timestamp = Number(votetimes[voter]) || Infinity;
      
      // If we haven't tracked a vote for this target yet, or this vote happened earlier
      if (!earliestTimes[target] || timestamp < earliestTimes[target]) {
        earliestTimes[target] = timestamp;
        firstVoters[target] = voter;
      }
    }

    // 4. Return everything to the host screen
    return res.status(200).json({
      votes,
      revealedSheriffs,
      firstVoters // <-- Maps: { "TargetPlayerName": "FirstPersonWhoVotedForThem" }
    });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
