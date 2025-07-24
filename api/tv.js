const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export default async function handler(req, res) {
  const { id } = req.query;
  
  // Check if API key is configured
  if (!TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB API key not configured' });
  }

  try {
    // Fetch TV series data, credits, keywords, and reviews from TMDB
    const [tvResponse, creditsResponse, keywordsResponse, reviewsResponse] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&language=en-US`),
      fetch(`${TMDB_BASE_URL}/tv/${id}/credits?api_key=${TMDB_API_KEY}`),
      fetch(`${TMDB_BASE_URL}/tv/${id}/keywords?api_key=${TMDB_API_KEY}`),
      fetch(`${TMDB_BASE_URL}/tv/${id}/reviews?api_key=${TMDB_API_KEY}&language=en-US`)
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
    const keywords = keywordsResponse.ok ? await keywordsResponse.json() : { results: [] };
    const reviews = reviewsResponse.ok ? await reviewsResponse.json() : { results: [] };
    
    // Generate HTML page matching iOS design
    const html = generateTvSeriesHTML(tvSeries, credits, keywords, reviews);
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
    
  } catch (error) {
    console.error('Error fetching TV series:', error);
    res.status(500).json({ error: 'Failed to fetch TV series data' });
  }
}

function generateTvSeriesHTML(tvSeries, credits, keywords, reviews) {
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
    <meta name="description" content="${tvSeries.overview || `${tvSeries.name} - Watch and discover TV series on Verdict app`}">
    <link rel="canonical" href="https://verdict.daniyar.link/tv/${tvSeries.id}">
    
    <!-- Open Graph for rich previews -->
    <meta property="og:title" content="${tvSeries.name}">
    <meta property="og:description" content="${tvSeries.overview || 'No description available'}">
    <meta property="og:image" content="${posterUrl}">
    <meta property="og:url" content="https://verdict.daniyar.link/tv/${tvSeries.id}">
    <meta property="og:type" content="video.tv_show">
    
    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "TVSeries",
      "name": "${tvSeries.name}",
      "url": "https://verdict.daniyar.link/tv/${tvSeries.id}",
      "image": {
        "@type": "ImageObject",
        "url": "${posterUrl}",
        "width": 500,
        "height": 750
      },
      ${tvSeries.overview ? `"description": "${tvSeries.overview.replace(/"/g, '\\"')}",` : ''}
      ${tvSeries.first_air_date ? `"startDate": "${tvSeries.first_air_date}",` : ''}
      ${tvSeries.last_air_date ? `"endDate": "${tvSeries.last_air_date}",` : ''}
      ${tvSeries.number_of_seasons ? `"numberOfSeasons": ${tvSeries.number_of_seasons},` : ''}
      ${tvSeries.number_of_episodes ? `"numberOfEpisodes": ${tvSeries.number_of_episodes},` : ''}
      ${tvSeries.vote_average ? `"aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "${tvSeries.vote_average}",
        "ratingCount": "${tvSeries.vote_count || 1}",
        "bestRating": "10",
        "worstRating": "1"
      },` : ''}
      ${tvSeries.genres && tvSeries.genres.length > 0 ? `"genre": [${tvSeries.genres.map(g => `"${g.name}"`).join(', ')}],` : ''}
      ${tvSeries.production_companies && tvSeries.production_companies.length > 0 ? `"productionCompany": [${tvSeries.production_companies.map(pc => `{
        "@type": "Organization",
        "name": "${pc.name}"
      }`).join(', ')}],` : ''}
      ${credits.cast && credits.cast.length > 0 ? `"actor": [${credits.cast.slice(0, 6).map(actor => `{
        "@type": "Person",
        "name": "${actor.name}"${actor.character ? `,
        "character": "${actor.character}"` : ''}
      }`).join(', ')}],` : ''}
      ${credits.crew && credits.crew.length > 0 ? (() => {
        const directors = credits.crew.filter(person => person.job === 'Director');
        const writers = credits.crew.filter(person => ['Writer', 'Screenplay', 'Story', 'Creator'].includes(person.job));
        
        let crewSchema = '';
        if (directors.length > 0) {
          crewSchema += `"director": [${directors.slice(0, 3).map(d => `{
            "@type": "Person",
            "name": "${d.name}"
          }`).join(', ')}],`;
        }
        if (writers.length > 0) {
          crewSchema += `"writer": [${writers.slice(0, 3).map(w => `{
            "@type": "Person",
            "name": "${w.name}"
          }`).join(', ')}],`;
        }
        return crewSchema;
      })() : ''}
      ${keywords.results && keywords.results.length > 0 ? `"keywords": "${keywords.results.slice(0, 10).map(k => k.name).join(', ')}",` : ''}
      ${reviews.results && reviews.results.length > 0 ? `"review": [${reviews.results.slice(0, 3).map(review => `{
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": "${review.author}"
        },
        "reviewBody": "${review.content.replace(/"/g, '\\"').substring(0, 500)}${review.content.length > 500 ? '...' : ''}",
        "datePublished": "${review.created_at}"${review.author_details && review.author_details.rating ? `,
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "${review.author_details.rating}",
          "bestRating": "10"
        }` : ''}
      }`).join(', ')}],` : ''}
      ${tvSeries.spoken_languages && tvSeries.spoken_languages.length > 0 ? `"inLanguage": "${tvSeries.spoken_languages[0].iso_639_1}"` : '"inLanguage": "en"'}
    }
    </script>
    
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
        
        .main-content {
            max-width: 800px;
            margin: 0 auto;
            padding: 0 24px;
            text-align: center;
        }
        
        .poster-section {
            display: flex;
            justify-content: center;
            margin-bottom: 32px;
        }
        
        .poster-container {
            width: 60%;
            max-width: 300px;
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
            text-align: left;
            margin-bottom: 24px;
        }
        
        .genres {
            margin: 16px 0;
        }
        
        .genre-tag {
            display: inline-block;
            background: rgba(255,255,255,0.15);
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 13px;
            margin: 0 6px 6px 0;
            color: rgba(255,255,255,0.9);
        }
        
        .rating {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 12px 0;
            font-size: 16px;
        }
        
        .rating-stars {
            color: #ffd700;
        }
        
        .cast-section {
            margin: 24px 0;
        }
        
        .cast-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }
        
        .cast-member {
            text-align: center;
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            padding: 12px;
            transition: all 0.3s ease;
        }
        
        .cast-member:hover {
            background: rgba(255,255,255,0.1);
            transform: translateY(-2px);
        }
        
        .cast-photo {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            margin: 0 auto 8px;
            display: block;
            background: rgba(255,255,255,0.1);
        }
        
        .cast-name {
            font-size: 14px;
            font-weight: 600;
            color: rgba(255,255,255,0.9);
            margin-bottom: 4px;
        }
        
        .cast-character {
            font-size: 12px;
            color: rgba(255,255,255,0.6);
        }
        
        .crew-section {
            margin: 24px 0;
        }
        
        .crew-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }
        
        .crew-role {
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            padding: 16px;
        }
        
        .crew-role-title {
            font-size: 14px;
            font-weight: 600;
            color: rgba(255,255,255,0.7);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .crew-names {
            font-size: 15px;
            color: rgba(255,255,255,0.9);
            line-height: 1.4;
        }
        
        .keywords-section {
            margin: 24px 0;
        }
        
        .keywords-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 12px;
        }
        
        .keyword-tag {
            display: inline-block;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.15);
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 13px;
            color: rgba(255,255,255,0.8);
            transition: all 0.2s ease;
        }
        
        .keyword-tag:hover {
            background: rgba(255,255,255,0.12);
            border-color: rgba(255,255,255,0.25);
            color: rgba(255,255,255,0.9);
        }
        
        .reviews-section {
            margin: 32px 0;
        }
        
        .review-item {
            background: rgba(255,255,255,0.03);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
            border: 1px solid rgba(255,255,255,0.08);
        }
        
        .review-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }
        
        .review-author {
            font-size: 16px;
            font-weight: 600;
            color: rgba(255,255,255,0.9);
        }
        
        .review-rating {
            background: rgba(255,215,0,0.2);
            color: #ffd700;
            padding: 4px 8px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
        }
        
        .review-content {
            font-size: 15px;
            line-height: 1.6;
            color: rgba(255,255,255,0.8);
        }
        
        .review-content.truncated {
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .review-date {
            font-size: 13px;
            color: rgba(255,255,255,0.5);
            margin-top: 12px;
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
        <div class="main-content">
            <div class="poster-section">
                <div class="poster-container">
                    <img src="${posterUrl}" alt="${tvSeries.name}" class="poster">
                    <div class="poster-gradient"></div>
                </div>
            </div>
            
            <div class="tv-info">
                <h1 class="tv-title">${tvSeries.name}</h1>
                
                ${year !== 'Unknown' ? `<div class="release-year">${year}</div>` : ''}
                
                ${tvSeries.vote_average ? `<div class="rating">
                    <span class="rating-stars">★★★★★</span>
                    <span>${tvSeries.vote_average}/10</span>
                </div>` : ''}
                
                <div class="tv-details">
                    ${tvSeries.number_of_seasons ? `<div class="detail-item">📺 ${tvSeries.number_of_seasons} Season${tvSeries.number_of_seasons > 1 ? 's' : ''}</div>` : ''}
                    ${tvSeries.number_of_episodes ? `<div class="detail-item">🎬 ${tvSeries.number_of_episodes} Episodes</div>` : ''}
                    ${tvSeries.status ? `<div class="detail-item">📅 ${tvSeries.status}</div>` : ''}
                    ${tvSeries.original_language ? `<div class="detail-item">🌐 ${tvSeries.original_language.toUpperCase()}</div>` : ''}
                    ${tvSeries.episode_run_time && tvSeries.episode_run_time.length > 0 ? `<div class="detail-item">⏱️ ${tvSeries.episode_run_time[0]} min/episode</div>` : ''}
                </div>
                
                ${tvSeries.genres && tvSeries.genres.length > 0 ? `<div class="genres">
                    ${tvSeries.genres.map(genre => `<span class="genre-tag">${genre.name}</span>`).join('')}
                </div>` : ''}
                
                ${tvSeries.overview ? `<div class="overview">${tvSeries.overview}</div>` : ''}
                
                ${credits.cast && credits.cast.length > 0 ? `<div class="cast-section">
                    <h3 style="font-size: 18px; margin: 20px 0 10px 0; color: rgba(255,255,255,0.9);">Cast</h3>
                    <div class="cast-grid">
                        ${credits.cast.slice(0, 6).map(actor => `
                            <div class="cast-member">
                                <img src="${actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : 'https://via.placeholder.com/80x80/666/fff?text=?'}" 
                                     alt="${actor.name}" class="cast-photo">
                                <div class="cast-name">${actor.name}</div>
                                <div class="cast-character">${actor.character}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}
                
                ${reviews.results && reviews.results.length > 0 ? (() => {
                  const sortedReviews = reviews.results
                    .filter(review => review.created_at)
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 3);
                  
                  return `<div class="reviews-section">
                    <h3 style="font-size: 18px; margin: 20px 0 16px 0; color: rgba(255,255,255,0.9);">User Reviews</h3>
                    ${sortedReviews.map(review => `
                        <div class="review-item">
                            <div class="review-header">
                                <div class="review-author">${review.author}</div>
                                ${review.author_details && review.author_details.rating ? `<div class="review-rating">★ ${review.author_details.rating}/10</div>` : ''}
                            </div>
                            <div class="review-content">${review.content}</div>
                            ${review.created_at ? `<div class="review-date">${new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>` : ''}
                        </div>
                    `).join('')}
                </div>`;
                })() : ''}
                
                ${credits.crew && credits.crew.length > 0 ? (() => {
                  const directors = credits.crew.filter(person => person.job === 'Director');
                  const writers = credits.crew.filter(person => ['Writer', 'Screenplay', 'Story', 'Creator'].includes(person.job));
                  const producers = credits.crew.filter(person => ['Producer', 'Executive Producer'].includes(person.job));
                  
                  return `<div class="crew-section">
                    <h3 style="font-size: 18px; margin: 20px 0 10px 0; color: rgba(255,255,255,0.9);">Crew</h3>
                    <div class="crew-grid">
                        ${directors.length > 0 ? `<div class="crew-role">
                            <div class="crew-role-title">Director</div>
                            <div class="crew-names">${directors.slice(0, 3).map(d => d.name).join(', ')}</div>
                        </div>` : ''}
                        ${writers.length > 0 ? `<div class="crew-role">
                            <div class="crew-role-title">Writer/Creator</div>
                            <div class="crew-names">${writers.slice(0, 3).map(w => w.name).join(', ')}</div>
                        </div>` : ''}
                        ${producers.length > 0 ? `<div class="crew-role">
                            <div class="crew-role-title">Producer</div>
                            <div class="crew-names">${producers.slice(0, 3).map(p => p.name).join(', ')}</div>
                        </div>` : ''}
                    </div>
                </div>`;
                })() : ''}
                
                ${tvSeries.networks && tvSeries.networks.length > 0 ? `<div class="network-info">
                    <h3 style="font-size: 18px; margin: 20px 0 10px 0; color: rgba(255,255,255,0.9);">Network</h3>
                    <div style="font-size: 15px; color: rgba(255,255,255,0.7);">
                        ${tvSeries.networks.map(n => n.name).join(', ')}
                    </div>
                </div>` : ''}
                
                ${tvSeries.production_companies && tvSeries.production_companies.length > 0 ? `<div class="production-info">
                    <h3 style="font-size: 18px; margin: 20px 0 10px 0; color: rgba(255,255,255,0.9);">Production</h3>
                    <div style="font-size: 15px; color: rgba(255,255,255,0.7);">
                        ${tvSeries.production_companies.map(pc => pc.name).join(', ')}
                    </div>
                </div>` : ''}
                
                ${keywords.results && keywords.results.length > 0 ? `<div class="keywords-section">
                    <h4 style="font-size: 16px; margin: 0 0 8px 0; color: rgba(255,255,255,0.8);">Keywords</h4>
                    <div class="keywords-container">
                        ${keywords.results.slice(0, 10).map(keyword => `<span class="keyword-tag">${keyword.name}</span>`).join('')}
                    </div>
                </div>` : ''}
            </div>
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