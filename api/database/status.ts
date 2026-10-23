import initialDatabaseSeed from '../../src/data/central_database.json';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const citizens = (initialDatabaseSeed as any)?.beneficiaries?.length || 0;
  const tokens = (initialDatabaseSeed as any)?.tokens?.length || 0;

  return res.status(200).json({
    success: true,
    initialized: true,
    mode: 'vercel_serverless',
    counts: {
      citizens,
      tokens,
    },
    message: 'Vercel API running with Cloud Drive & Local Sync active',
  });
}
