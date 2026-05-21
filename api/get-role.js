import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { roomCode, playerName } = req.query;
    
    // Fetch Host data AND the new Client data (votes/sheriffs)
    const data = await redis.get(`room_${roomCode.toUpperCase()}`);
    if (!data) return res.status(404).json({ error: 'Room not found' });

    const clientState = await redis.get(`room_${roomCode.toUpperCase()}_client_state`) || { votes: {}, revealedSheriffs: [] };

    const player = data.players.find(p => p.class.toLowerCase() === playerName.toLowerCase().trim());
    if (!player) return res.status(404).json({ error: 'Player name not found in this game.' });

    let loversData = [];
    if (player.isLover) {
        loversData = data.players
            .filter(p => p.isLover && p.class !== player.class)
            .map(p => ({ name: p.class, role: p.role }));
    }

    // Get a list of everyone who is still alive for the voting dropdown
    const alivePlayers = data.players.filter(p => p.isAlive && !p.isAbsent).map(p => p.class);

    return res.status(200).json({ 
        isStarted: data.isStarted,
        isVotingActive: data.isVotingActive || false, // Tells the phone to show the voting UI
        role: player.role, 
        isAlive: player.isAlive,
        isLover: player.isLover,
        lovers: loversData,
        isTurned: player.isTurned,
        alivePlayers: alivePlayers, // Populates the dropdown menu
        hasRevealedSheriff: clientState.revealedSheriffs?.includes(player.class), // Checks if they already clicked the reveal button
        myVote: clientState.votes?.[player.class] || null // Checks who they voted for
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
