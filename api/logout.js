import { serialize } from 'cookie';

export default function handler(req, res) {
  // Clear the cookie to log the user out
  res.setHeader('Set-Cookie', serialize('auth_session', '', { maxAge: -1, path: '/' }));
  res.status(200).json({ success: true });
}
