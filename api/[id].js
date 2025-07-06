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
    const response = await fetch(`${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).send(`
          <html>
            <head><title>Movie Not Found</title></head>
            <body>
              <h1>Movie Not Found</h1>
              <p>Movie with ID ${id} does not exist.</p>
            </body>
          </html>
        `);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const movie = await response.json();
    
    // Generate HTML page
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
    
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
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
        body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0; 
            padding: 20px;
            background: #f5f5f5;
            line-height: 1.6;
        }
        .app-banner {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            text-align: center;
        }
        .download-btn {
            background: white;
            color: #667eea;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            margin-top: 15px;
            transition: transform 0.2s;
        }
        .download-btn:hover {
            transform: translateY(-2px);
        }
        .movie-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            max-width: 800px;
            margin: 0 auto;
        }
        .movie-content {
            display: flex;
            gap: 20px;
        }
        .poster { 
            width: 300px;
            min-width: 300px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .movie-info h1 { 
            margin: 0 0 15px 0;
            color: #333;
            font-size: 2.2em;
        }
        .rating {
            background: #ff6b6b;
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            display: inline-block;
            margin: 10px 0;
            font-weight: 600;
        }
        .info-row {
            margin: 12px 0;
            font-size: 16px;
        }
        .info-label {
            font-weight: 600;
            color: #555;
        }
        .description {
            margin-top: 20px;
            font-size: 16px;
            color: #444;
            line-height: 1.7;
        }
        
        @media (max-width: 768px) {
            .movie-content {
                flex-direction: column;
                text-align: center;
            }
            .poster {
                width: 100%;
                max-width: 300px;
                margin: 0 auto;
            }
            .movie-info h1 {
                font-size: 1.8em;
            }
            body {
                padding: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="app-banner">
        🎬 Open this in Verdict app for the best experience!
        <br>
        <a href="https://apps.apple.com/app/verdict" class="download-btn">
            Download from App Store
        </a>
    </div>
    
    <div class="movie-card">
        <div class="movie-content">
            <img src="${posterUrl}" alt="${movie.title}" class="poster">
            <div class="movie-info">
                <h1>${movie.title}</h1>
                <div class="rating">⭐ ${rating}/10</div>
                
                <div class="info-row">
                    <span class="info-label">Year:</span> ${year}
                </div>
                
                ${movie.genres && movie.genres.length > 0 ? `
                <div class="info-row">
                    <span class="info-label">Genres:</span> ${movie.genres.map(g => g.name).join(', ')}
                </div>
                ` : ''}
                
                ${movie.runtime ? `
                <div class="info-row">
                    <span class="info-label">Runtime:</span> ${movie.runtime} min
                </div>
                ` : ''}
                
                ${movie.overview ? `
                <div class="description">
                    <div class="info-label">Overview:</div>
                    ${movie.overview}
                </div>
                ` : ''}
            </div>
        </div>
    </div>

    <script>
        // Try to open in app (fallback for devices without Universal Links)
        setTimeout(() => {
            if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                window.location.href = 'verdict://movie/${movie.id}';
            }
        }, 100);
    </script>
</body>
</html>
  `;
}