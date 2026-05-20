import { OAuth2Client } from 'google-auth-library';
import { serialize } from 'cookie';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { credential } = req.body;
    
    // Verify the token sent by the Google popup
    const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const userId = payload['sub']; // This is the unique Google User ID
    const email = payload['email'];

    // Create a secure HTTP-Only cookie that lasts for 7 days
    const cookie = serialize('auth_session', userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
    });

    res.setHeader('Set-Cookie', cookie);
    res.status(200).json({ success: true, email });
  } catch (error) {
    res.status(401).json({ error: 'Invalid Google token' });
  }
}
