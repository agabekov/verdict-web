const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export default async function handler(req, res) {
  const { id } = req.query;
  
  // Check if API key is configured
  if (!TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB API key not configured' });
  }

  try {
    // Fetch TV series data from TMDB
    const response = await fetch(`${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&language=en-US`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).send(`
          <html>
            <head><title>TV Series Not Found</title></head>
            <body>
              <h1>TV Series Not Found</h1>
              <p>TV series with ID ${id} does not exist.</p>
            </body>
          </html>
        `);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const tvSeries = await response.json();
    
    // Generate HTML page
    const html = generateTvSeriesHTML(tvSeries);
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
    
  } catch (error) {
    console.error('Error fetching TV series:', error);
    res.status(500).json({ error: 'Failed to fetch TV series data' });
  }
}

function generateTvSeriesHTML(tvSeries) {
  const posterUrl = tvSeries.poster_path 
    ? `https://image.tmdb.org/t/p/w500${tvSeries.poster_path}`
    : 'https://via.placeholder.com/300x450/cccccc/666666?text=No+Image';
    
  const rating = tvSeries.vote_average ? tvSeries.vote_average.toFixed(1) : 'N/A';
  const year = tvSeries.first_air_date ? new Date(tvSeries.first_air_date).getFullYear() : 'Unknown';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tvSeries.name} - Verdict</title>
    
    <!-- Open Graph for rich previews -->
    <meta property="og:title" content="${tvSeries.name} - TV Series">
    <meta property="og:description" content="${tvSeries.overview || 'No description available'}">
    <meta property="og:image" content="${posterUrl}">
    <meta property="og:url" content="https://verdict.daniyar.link/tv/${tvSeries.id}">
    <meta property="og:type" content="video.tv_show">
    
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
        .tv-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            max-width: 800px;
            margin: 0 auto;
        }
        .tv-content {
            display: flex;
            gap: 20px;
        }
        .poster { 
            width: 300px;
            min-width: 300px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .tv-info h1 { 
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
            .tv-content {
                flex-direction: column;
                text-align: center;
            }
            .poster {
                width: 100%;
                max-width: 300px;
                margin: 0 auto;
            }
            .tv-info h1 {
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
        📺 Download Verdict to explore this TV series!
        <br>
        <a href="https://apps.apple.com/app/verdict" class="download-btn">
            Download from App Store
        </a>
    </div>
    
    <div class="tv-card">
        <div class="tv-content">
            <img src="${posterUrl}" alt="${tvSeries.name}" class="poster">
            <div class="tv-info">
                <h1>${tvSeries.name}</h1>
                <div class="rating">⭐ ${rating}/10</div>
                
                <div class="info-row">
                    <span class="info-label">First Air Date:</span> ${year}
                </div>
                
                ${tvSeries.genres && tvSeries.genres.length > 0 ? `
                <div class="info-row">
                    <span class="info-label">Genres:</span> ${tvSeries.genres.map(g => g.name).join(', ')}
                </div>
                ` : ''}
                
                ${tvSeries.number_of_seasons ? `
                <div class="info-row">
                    <span class="info-label">Seasons:</span> ${tvSeries.number_of_seasons}
                </div>
                ` : ''}
                
                ${tvSeries.number_of_episodes ? `
                <div class="info-row">
                    <span class="info-label">Episodes:</span> ${tvSeries.number_of_episodes}
                </div>
                ` : ''}
                
                ${tvSeries.overview ? `
                <div class="description">
                    <div class="info-label">Overview:</div>
                    ${tvSeries.overview}
                </div>
                ` : ''}
            </div>
        </div>
    </div>

</body>
</html>
  `;
}