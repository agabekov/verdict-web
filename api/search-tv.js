const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function fetchTmdb(path) {
  const bearerToken = process.env.TMDB_BEARER_TOKEN;
  const v3Key = process.env.TMDB_API_KEY;
  const url = `${TMDB_BASE_URL}${path}`;

  const headers = {};
  if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`;
  }

  const finalUrl = !bearerToken && v3Key ? `${url}&api_key=${v3Key}` : url;
  const response = await fetch(finalUrl, { headers });
  
  if (!response.ok) {
    throw new Error(`TMDB responded with ${response.status}`);
  }
  
  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.query;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  const hasBearer = Boolean(process.env.TMDB_BEARER_TOKEN);
  const hasV3Key = Boolean(process.env.TMDB_API_KEY);
  if (!hasBearer && !hasV3Key) {
    return res.status(500).json({ error: 'TMDB credentials are not configured' });
  }

  try {
    const searchPath = `/search/tv?query=${encodeURIComponent(query.trim())}&language=en-US&page=1`;
    const data = await fetchTmdb(searchPath);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('TV search error:', error);
    return res.status(500).json({ error: 'Failed to search TV shows' });
  }
}