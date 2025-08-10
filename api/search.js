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
    // Search both movies and TV shows in parallel
    const [movieResults, tvResults] = await Promise.all([
      fetchTmdb(`/search/movie?query=${encodeURIComponent(query.trim())}&language=en-US&page=1`).catch(() => ({ results: [] })),
      fetchTmdb(`/search/tv?query=${encodeURIComponent(query.trim())}&language=en-US&page=1`).catch(() => ({ results: [] }))
    ]);

    // Combine and mark results with media type
    const movies = (movieResults.results || []).map(movie => ({
      ...movie,
      media_type: 'movie',
      title: movie.title, // Ensure consistent title field
      date: movie.release_date
    }));

    const tvShows = (tvResults.results || []).map(tv => ({
      ...tv,
      media_type: 'tv',
      title: tv.name, // Use name as title for consistency
      date: tv.first_air_date
    }));

    // Combine, sort by popularity, and limit results
    const allResults = [...movies, ...tvShows]
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 8); // Return top 8 results

    const response = {
      page: 1,
      results: allResults,
      total_results: allResults.length,
      total_pages: 1
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Universal search error:', error);
    return res.status(500).json({ error: 'Failed to search content' });
  }
}