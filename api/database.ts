import initialDatabaseSeed from '../src/data/central_database.json';

// In-memory cache for serverless instance lifetime
let inMemorySnapshot: any = null;

export default function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const data = inMemorySnapshot || initialDatabaseSeed;
    return res.status(200).json({
      success: true,
      data,
      source: inMemorySnapshot ? 'serverless_cache' : 'initial_seed',
      mode: 'vercel_serverless',
    });
  }

  if (req.method === 'POST') {
    try {
      const snapshot = req.body;
      if (!snapshot || !snapshot.beneficiaries || !snapshot.users) {
        return res.status(400).json({ success: false, error: 'Invalid database snapshot format' });
      }
      snapshot.lastServerSync = new Date().toISOString();
      inMemorySnapshot = snapshot;
      return res.status(200).json({
        success: true,
        message: 'Central database received by Vercel serverless API',
        lastServerSync: snapshot.lastServerSync,
        counts: {
          citizens: snapshot.beneficiaries?.length || 0,
          tokens: snapshot.tokens?.length || 0,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
