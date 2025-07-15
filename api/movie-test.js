export default async function handler(req, res) {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  
  try {
    // Простой fetch вместо axios
    const response = await fetch(`https://api.themoviedb.org/3/movie/550?api_key=${TMDB_API_KEY}&language=ru-RU`);
    const data = await response.json();
    
    res.status(200).json({
      success: true,
      movieTitle: data.title,
      movieYear: data.release_date,
      hasData: !!data
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}