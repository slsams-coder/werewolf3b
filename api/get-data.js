import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  // Extract the user ID from the secure cookie
  const cookies = req.headers.cookie || '';
  const sessionMatch = cookies.match(/auth_session=([^;]+)/);
  const userId = sessionMatch ? sessionMatch[1] : null;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const data = await redis.get(`werewolf_profile_${userId}`);
    return res.status(200).json({ data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
