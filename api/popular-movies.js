const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

async function fetchTmdb(path) {
  const bearerToken = process.env.TMDB_BEARER_TOKEN;
  const v3Key = process.env.TMDB_API_KEY;
  const url = `${TMDB_BASE_URL}${path}${path.includes('?') ? '&' : '?'}language=en-US`;

  const headers = {};
  if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`;

  const finalUrl = !bearerToken && v3Key ? `${url}&api_key=${v3Key}` : url;
  const response = await fetch(finalUrl, { headers });
  if (!response.ok) throw new HttpError(`TMDB responded with ${response.status} for ${path}`, response.status);
  return response.json();
}

export default async function handler(req, res) {
  const hasBearer = Boolean(process.env.TMDB_BEARER_TOKEN);
  const hasV3Key = Boolean(process.env.TMDB_API_KEY);
  if (!hasBearer && !hasV3Key) {
    return res.status(500).json({ error: 'TMDB credentials are not configured' });
  }

  try {
    const data = await fetchTmdb('/movie/popular');
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    return res.status(500).json({ error: 'Failed to fetch popular movies' });
  }
}