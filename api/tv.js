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
    const tvResponse = await fetch(`${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&language=en-US`);
    
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
    
    // Generate HTML page matching iOS design
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
    
  const backdropUrl = tvSeries.backdrop_path 
    ? `https://image.tmdb.org/t/p/w1280${tvSeries.backdrop_path}`
    : posterUrl;
    
  const year = tvSeries.first_air_date ? new Date(tvSeries.first_air_date).getFullYear() : 'Unknown';

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
            background: rgba(0,0,0,0.4);
            backdrop-filter: blur(40px);
            border-bottom: 1px solid rgba(255,255,255,0.05);
            color: white;
            padding: 16px 20px;
            text-align: center;
            font-size: 16px;
            position: relative;
            z-index: 100;
        }
        
        .banner-text {
            font-weight: 500;
            margin-bottom: 12px;
            color: rgba(255,255,255,0.8);
            font-size: 15px;
        }
        
        .download-btn {
            background: rgba(255,255,255,0.08);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.1);
            color: rgba(255,255,255,0.9);
            padding: 10px 20px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            display: inline-block;
            transition: all 0.2s ease;
            font-size: 14px;
        }
        
        .download-btn:hover {
            background: rgba(255,255,255,0.12);
            border-color: rgba(255,255,255,0.15);
            transform: translateY(-1px);
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
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
        
        .tv-title {
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
            
        }
        
        @media (max-width: 480px) {
            .tv-info {
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
        <div class="banner-text">📺 Open this in Verdict app for the best experience!</div>
        <a href="https://go.daniyar.link/verdict-web" class="download-btn">
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
            <h1 class="tv-title">${tvSeries.name}</h1>
            
            ${year !== 'Unknown' ? `<div class="release-year">${year}</div>` : ''}
            
            <div class="tv-details">
                ${tvSeries.number_of_seasons ? `<div class="detail-item">📺 ${tvSeries.number_of_seasons} Season${tvSeries.number_of_seasons > 1 ? 's' : ''}</div>` : ''}
                ${tvSeries.number_of_episodes ? `<div class="detail-item">🎬 ${tvSeries.number_of_episodes} Episodes</div>` : ''}
            </div>
            
            ${tvSeries.overview ? `<div class="overview">${tvSeries.overview}</div>` : ''}
        </div>
        
        <div class="footer">
            made in Verdict
        </div>
    </div>
    
    <script type="module">
        import { inject } from '@vercel/analytics';
        inject();
    </script>
    <script async defer src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
</body>
</html>
  `;
}