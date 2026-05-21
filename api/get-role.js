import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { roomCode, playerName } = req.query;
    
    // Fetch Host data AND the Client data (votes/sheriffs)
    const data = await redis.get(`room_${roomCode.toUpperCase()}`);
    if (!data) return res.status(404).json({ error: 'Room not found' });

    const clientState = await redis.get(`room_${roomCode.toUpperCase()}_client_state`) || { votes: {}, revealedSheriffs: [] };

    // Case-insensitive lookup for the player
    const player = data.players.find(p => p.class.toLowerCase() === playerName.toLowerCase().trim());
    if (!player) return res.status(404).json({ error: 'Player name not found in this game.' });

    let loversData = [];
    if (player.isLover) {
        loversData = data.players
            .filter(p => p.isLover && p.class !== player.class)
            .map(p => ({ name: p.class, role: p.role }));
    }

    const alivePlayers = data.players.filter(p => p.isAlive && !p.isAbsent).map(p => p.class);

    // NEW: Case-insensitive lookups for votes and sheriff reveals
    const canonicalName = player.class;
    const voteKey = Object.keys(clientState.votes || {}).find(k => k.toLowerCase() === canonicalName.toLowerCase());
    const myVote = voteKey ? clientState.votes[voteKey] : null;

    const hasRevealedSheriff = (clientState.revealedSheriffs || []).some(s => s.toLowerCase() === canonicalName.toLowerCase());

    return res.status(200).json({ 
        isStarted: data.isStarted,
        isVotingActive: data.isVotingActive || false,
        role: player.role, 
        isAlive: player.isAlive,
        isLover: player.isLover,
        lovers: loversData,
        isTurned: player.isTurned,
        alivePlayers: alivePlayers,
        hasRevealedSheriff: hasRevealedSheriff, 
        myVote: myVote 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
