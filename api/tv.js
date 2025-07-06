const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export default async function handler(req, res) {
  const { id } = req.query;
  
  // Check if API key is configured
  if (!TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB API key not configured' });
  }

  try {
    // Fetch TV series data and credits from TMDB
    const [tvResponse, creditsResponse] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&language=en-US`),
      fetch(`${TMDB_BASE_URL}/tv/${id}/credits?api_key=${TMDB_API_KEY}`)
    ]);
    
    if (!tvResponse.ok) {
      if (tvResponse.status === 404) {
        return res.status(404).send(`
          <html>
            <head><title>TV Series Not Found</title></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px;">
              <h1>TV Series Not Found</h1>
              <p>TV series with ID ${id} does not exist.</p>
            </body>
          </html>
        `);
      }
      throw new Error(`HTTP error! status: ${tvResponse.status}`);
    }
    
    const tvSeries = await tvResponse.json();
    const credits = creditsResponse.ok ? await creditsResponse.json() : { cast: [] };
    
    // Generate HTML page matching iOS design
    const html = generateTvSeriesHTML(tvSeries, credits.cast);
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
    
  } catch (error) {
    console.error('Error fetching TV series:', error);
    res.status(500).json({ error: 'Failed to fetch TV series data' });
  }
}

function generateTvSeriesHTML(tvSeries, cast = []) {
  const posterUrl = tvSeries.poster_path 
    ? `https://image.tmdb.org/t/p/w500${tvSeries.poster_path}`
    : 'https://via.placeholder.com/300x450/cccccc/666666?text=No+Image';
    
  const backdropUrl = tvSeries.backdrop_path 
    ? `https://image.tmdb.org/t/p/w1280${tvSeries.backdrop_path}`
    : posterUrl;
    
  const rating = tvSeries.vote_average ? tvSeries.vote_average.toFixed(1) : 'N/A';
  const year = tvSeries.first_air_date ? new Date(tvSeries.first_air_date).getFullYear() : 'Unknown';
  
  // Get top 6 cast members
  const topCast = cast.slice(0, 6);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tvSeries.name} - Verdict</title>
    
    <!-- Open Graph for rich previews -->
    <meta property="og:title" content="${tvSeries.name}">
    <meta property="og:description" content="${tvSeries.overview || 'No description available'}">
    <meta property="og:image" content="${posterUrl}">
    <meta property="og:url" content="https://verdict.daniyar.link/tv/${tvSeries.id}">
    <meta property="og:type" content="video.tv_show">
    
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 20px;
            text-align: center;
            font-size: 16px;
            position: relative;
            z-index: 100;
        }
        
        .download-btn {
            background: rgba(255,255,255,0.9);
            color: #667eea;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            margin-top: 12px;
            transition: all 0.2s ease;
            backdrop-filter: blur(10px);
        }
        
        .download-btn:hover {
            transform: translateY(-2px);
            background: rgba(255,255,255,1);
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
        
        .tv-info {
            padding: 0 24px;
            margin-bottom: 24px;
        }
        
        .title-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 8px;
            gap: 16px;
        }
        
        .tv-title {
            font-size: 28px;
            font-weight: 700;
            line-height: 1.2;
            flex: 1;
            min-width: 0;
        }
        
        .action-buttons {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
        }
        
        .action-btn {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            text-decoration: none;
            transition: all 0.2s ease;
            font-size: 20px;
        }
        
        .action-btn:hover {
            background: rgba(255,255,255,0.2);
            transform: scale(1.05);
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
        
        .rate-button {
            margin: 24px;
            padding: 16px;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 16px;
            text-align: center;
            color: #fff;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            display: block;
            transition: all 0.2s ease;
            box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        }
        
        .rate-button:hover {
            background: rgba(255,255,255,0.15);
            transform: translateY(-2px);
        }
        
        .cast-section {
            padding: 24px;
        }
        
        .section-title {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 16px;
            color: #fff;
        }
        
        .cast-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 16px;
            max-width: 600px;
        }
        
        .cast-member {
            text-align: center;
        }
        
        .cast-photo {
            width: 80px;
            height: 80px;
            border-radius: 40px;
            object-fit: cover;
            margin: 0 auto 8px;
            background: rgba(255,255,255,0.1);
            display: block;
        }
        
        .cast-name {
            font-size: 14px;
            font-weight: 600;
            color: #fff;
            margin-bottom: 4px;
            line-height: 1.2;
        }
        
        .cast-character {
            font-size: 12px;
            color: rgba(255,255,255,0.7);
            line-height: 1.2;
        }
        
        .footer {
            text-align: center;
            padding: 40px 24px;
            color: rgba(255,255,255,0.6);
            font-size: 14px;
        }
        
        .rating-badge {
            background: linear-gradient(135deg, #ff6b6b, #ee5a52);
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            display: inline-block;
            margin: 8px 0;
        }
        
        .tv-details {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            margin: 16px 0;
        }
        
        .detail-item {
            background: rgba(255,255,255,0.1);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            color: rgba(255,255,255,0.9);
        }
        
        @media (max-width: 768px) {
            .content-container {
                padding-top: 40px;
            }
            
            .tv-title {
                font-size: 24px;
            }
            
            .title-row {
                flex-direction: column;
                gap: 12px;
            }
            
            .action-buttons {
                align-self: flex-start;
            }
            
            .cast-grid {
                grid-template-columns: repeat(3, 1fr);
            }
            
            .cast-photo {
                width: 60px;
                height: 60px;
                border-radius: 30px;
            }
        }
        
        @media (max-width: 480px) {
            .tv-info,
            .rate-button,
            .cast-section {
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
        📺 Open this in Verdict app for the best experience!
        <br>
        <a href="https://apps.apple.com/app/verdict" class="download-btn">
            Download from App Store
        </a>
    </div>
    
    <div class="content-container">
        <div class="poster-section">
            <div class="poster-container">
                <img src="${posterUrl}" alt="${tvSeries.name}" class="poster">
                <div class="poster-gradient"></div>
            </div>
        </div>
        
        <div class="tv-info">
            <div class="title-row">
                <h1 class="tv-title">${tvSeries.name}</h1>
                <div class="action-buttons">
                    <a href="#" class="action-btn" onclick="copyLink(); return false;" title="Copy link">
                        <span id="link-icon">🔗</span>
                    </a>
                    <a href="#" class="action-btn" title="Add to watchlist">
                        🔖
                    </a>
                </div>
            </div>
            
            ${year !== 'Unknown' ? `<div class="release-year">${year}</div>` : ''}
            
            <div class="rating-badge">⭐ ${rating}/10</div>
            
            <div class="tv-details">
                ${tvSeries.number_of_seasons ? `<div class="detail-item">📺 ${tvSeries.number_of_seasons} Season${tvSeries.number_of_seasons > 1 ? 's' : ''}</div>` : ''}
                ${tvSeries.number_of_episodes ? `<div class="detail-item">🎬 ${tvSeries.number_of_episodes} Episodes</div>` : ''}
                ${tvSeries.genres && tvSeries.genres.length > 0 ? `<div class="detail-item">🎭 ${tvSeries.genres.map(g => g.name).join(', ')}</div>` : ''}
            </div>
            
            ${tvSeries.overview ? `<div class="overview">${tvSeries.overview}</div>` : ''}
        </div>
        
        <a href="https://apps.apple.com/app/verdict" class="rate-button">
            Rate this TV series
        </a>
        
        ${topCast.length > 0 ? `
        <div class="cast-section">
            <h2 class="section-title">Cast</h2>
            <div class="cast-grid">
                ${topCast.map(actor => `
                    <div class="cast-member">
                        <img src="${actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : 'https://via.placeholder.com/80x80/444444/ffffff?text=?'}" 
                             alt="${actor.name}" class="cast-photo">
                        <div class="cast-name">${actor.name}</div>
                        <div class="cast-character">${actor.character}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="footer">
            Verdict - Rate and share your TV series opinions
        </div>
    </div>

    <script>
        function copyLink() {
            const url = window.location.href;
            navigator.clipboard.writeText(url).then(() => {
                const icon = document.getElementById('link-icon');
                icon.textContent = '✅';
                setTimeout(() => {
                    icon.textContent = '🔗';
                }, 2000);
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = url;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                const icon = document.getElementById('link-icon');
                icon.textContent = '✅';
                setTimeout(() => {
                    icon.textContent = '🔗';
                }, 2000);
            });
        }
    </script>
</body>
</html>
  `;
}