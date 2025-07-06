const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export default async function handler(req, res) {
  const { id } = req.query;
  
  if (!TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB API key not configured' });
  }

  try {
    const response = await fetch(`${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).send('<h1>Movie Not Found</h1>');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const movie = await response.json();
    
    res.status(200).json({
      title: movie.title,
      year: movie.release_date,
      rating: movie.vote_average,
      overview: movie.overview
    });
    
  } catch (error) {
    console.error('Error fetching movie:', error);
    res.status(500).json({ error: 'Failed to fetch movie data' });
  }
}