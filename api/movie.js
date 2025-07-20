const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export default async function handler(req, res) {
  const { id } = req.query;
  
  // Check if API key is configured
  if (!TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB API key not configured' });
  }

  try {
    // Fetch movie data from TMDB
    const movieResponse = await fetch(`${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`);
    
    if (!movieResponse.ok) {
      if (movieResponse.status === 404) {
        return res.status(404).send(`
          <html>
            <head><title>Movie Not Found</title></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px;">
              <h1>Movie Not Found</h1>
              <p>Movie with ID ${id} does not exist.</p>
            </body>
          </html>
        `);
      }
      throw new Error(`HTTP error! status: ${movieResponse.status}`);
    }
    
    const movie = await movieResponse.json();
    
    // Generate HTML page matching iOS design
    const html = generateMovieHTML(movie);
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
    
  } catch (error) {
    console.error('Error fetching movie:', error);
    res.status(500).json({ error: 'Failed to fetch movie data' });
  }
}

function generateMovieHTML(movie) {
  const posterUrl = movie.poster_path 
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : 'https://via.placeholder.com/300x450/cccccc/666666?text=No+Image';
    
  const backdropUrl = movie.backdrop_path 
    ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
    : posterUrl;
    
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${movie.title} - Verdict</title>
    
    <!-- Open Graph for rich previews -->
    <meta property="og:title" content="${movie.title}">
    <meta property="og:description" content="${movie.overview || 'No description available'}">
    <meta property="og:image" content="${posterUrl}">
    <meta property="og:url" content="https://verdict.daniyar.link/movie/${movie.id}">
    <meta property="og:type" content="video.movie">
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #000;
            color: #fff;
            overflow-x: hidden;
        }
        
        .background {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('${backdropUrl}');
            background-size: cover;
            background-position: center;
            filter: blur(30px);
            z-index: -2;
        }
        
        .background-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(to bottom, 
                rgba(0,0,0,0) 0%,
                rgba(0,0,0,0.9) 70%,
                rgba(0,0,0,0.9) 100%);
            z-index: -1;
        }
        
        .app-banner {
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 16px;
            position: relative;
            z-index: 100;
        }
        
        .banner-text {
            font-weight: 500;
            margin-bottom: 12px;
            color: rgba(255,255,255,0.9);
        }
        
        .download-btn {
            background: rgba(255,255,255,0.15);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            padding: 12px 24px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            transition: all 0.3s ease;
            font-size: 15px;
        }
        
        .download-btn:hover {
            background: rgba(255,255,255,0.25);
            border-color: rgba(255,255,255,0.3);
            transform: translateY(-1px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        
        .content-container {
            position: relative;
            z-index: 10;
            padding-top: 60px;
            min-height: 100vh;
        }
        
        .poster-section {
            display: flex;
            justify-content: center;
            padding: 0 24px;
            margin-bottom: 24px;
        }
        
        .poster-container {
            width: 70%;
            max-width: 280px;
            position: relative;
        }
        
        .poster {
            width: 100%;
            aspect-ratio: 2/3;
            object-fit: cover;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        }
        
        .poster-gradient {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 40%;
            background: linear-gradient(to bottom, 
                transparent 0%,
                rgba(0,0,0,0.1) 60%,
                rgba(0,0,0,0.3) 100%);
            border-radius: 0 0 12px 12px;
        }
        
        .movie-info {
            padding: 0 24px;
            margin-bottom: 24px;
        }
        
        .movie-title {
            font-size: 28px;
            font-weight: 700;
            line-height: 1.2;
            margin-bottom: 8px;
        }
        
        .release-year {
            font-size: 17px;
            color: rgba(255,255,255,0.7);
            margin-bottom: 8px;
        }
        
        .overview {
            font-size: 17px;
            line-height: 1.6;
            color: rgba(255,255,255,0.9);
            margin-top: 8px;
        }
        
        .footer {
            text-align: center;
            padding: 40px 24px;
            color: rgba(255,255,255,0.6);
            font-size: 14px;
        }
        
        
        @media (max-width: 768px) {
            .content-container {
                padding-top: 40px;
            }
            
            .movie-title {
                font-size: 24px;
            }
        }
        
        @media (max-width: 480px) {
            .movie-info {
                padding-left: 16px;
                padding-right: 16px;
            }
            
            .poster-section {
                padding: 0 16px;
            }
        }
    </style>
</head>
<body>
    <div class="background"></div>
    <div class="background-overlay"></div>
    
    <div class="app-banner">
        <div class="banner-text">🎬 Open this in Verdict app for the best experience!</div>
        <a href="https://go.daniyar.link/verdict-web" class="download-btn">
            Download from App Store
        </a>
    </div>
    
    <div class="content-container">
        <div class="poster-section">
            <div class="poster-container">
                <img src="${posterUrl}" alt="${movie.title}" class="poster">
                <div class="poster-gradient"></div>
            </div>
        </div>
        
        <div class="movie-info">
            <h1 class="movie-title">${movie.title}</h1>
            
            ${year !== 'Unknown' ? `<div class="release-year">${year}</div>` : ''}
            
            ${movie.overview ? `<div class="overview">${movie.overview}</div>` : ''}
        </div>
        
        <div class="footer">
            made in Verdict
        </div>
    </div>
    
    <script async defer src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
</body>
</html>
  `;
}