const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

function escapeHtml(unsafe = '') {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtmlTags(text = '') {
  return String(text).replace(/<[^>]*>/g, '').trim();
}

function parseRegion(acceptLanguageHeader) {
  if (!acceptLanguageHeader || typeof acceptLanguageHeader !== 'string') return 'US';
  const primary = acceptLanguageHeader.split(',')[0];
  const parts = primary.split('-');
  if (parts.length === 2 && parts[1]) return parts[1].toUpperCase();
  return 'US';
}

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

async function fetchTmdbOrNull(path) {
  try {
    return await fetchTmdb(path);
  } catch (e) {
    return null;
  }
}

function buildTvJsonLd(tv, credits, keywords, reviews, posterUrl) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: tv.name,
    url: `https://verdict.daniyar.link/tv/${tv.id}`,
    image: { '@type': 'ImageObject', url: posterUrl, width: 500, height: 750 },
    description: tv.overview || undefined,
    startDate: tv.first_air_date || undefined,
    endDate: tv.last_air_date || undefined,
    numberOfSeasons: tv.number_of_seasons || undefined,
    numberOfEpisodes: tv.number_of_episodes || undefined,
    aggregateRating: tv.vote_average
      ? {
          '@type': 'AggregateRating',
          ratingValue: Number(tv.vote_average),
          ratingCount: Number(tv.vote_count || 1),
          bestRating: 10,
          worstRating: 1,
        }
      : undefined,
    genre: tv.genres?.map((g) => g.name),
    productionCompany: tv.production_companies?.map((pc) => ({ '@type': 'Organization', name: pc.name })),
    actor: credits?.cast?.slice(0, 6).map((a) => ({ '@type': 'Person', name: a.name, character: a.character })),
    director: credits?.crew
      ?.filter((p) => p.job === 'Director')
      .slice(0, 3)
      .map((d) => ({ '@type': 'Person', name: d.name })),
    creator: credits?.crew
      ?.filter((p) => ['Creator'].includes(p.job))
      .slice(0, 3)
      .map((c) => ({ '@type': 'Person', name: c.name })),
    writer: credits?.crew
      ?.filter((p) => ['Writer', 'Screenplay', 'Story'].includes(p.job))
      .slice(0, 3)
      .map((w) => ({ '@type': 'Person', name: w.name })),
    keywords:
      keywords?.results && keywords.results.length > 0
        ? keywords.results.slice(0, 10).map((k) => k.name).join(', ')
        : undefined,
    inLanguage: tv.spoken_languages?.[0]?.iso_639_1 || 'en',
  };
  return JSON.stringify(JSON.parse(JSON.stringify(data)));
}

function renderStarRating(voteAverage) {
  if (!voteAverage && voteAverage !== 0) return '';
  const outOfFive = Math.round(Number(voteAverage) / 2);
  const stars = '★★★★★';
  const empty = '☆☆☆☆☆';
  return `<span class="rating-stars">${stars.slice(0, outOfFive)}${empty.slice(outOfFive)}</span> <span>${Number(
    voteAverage,
  ).toFixed(1)}/10</span>`;
}

function renderProviderCategory(title, providers) {
  if (!providers || providers.length === 0) return '';
  return `
    <div class="streaming-category">
      <h4 class="streaming-category-title">${escapeHtml(title)}</h4>
      <div class="streaming-providers">
        ${providers
          .map(
            (provider) => `
              <div class="provider-item">
                <img loading="lazy" decoding="async" src="https://image.tmdb.org/t/p/w92${provider.logo_path}" alt="${escapeHtml(
              provider.provider_name,
            )}" class="provider-logo">
                <span class="provider-name">${escapeHtml(provider.provider_name)}</span>
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderWatchProviders(watchProviders, region) {
  const regional = watchProviders?.results?.[region];
  if (!regional) return '';
  const streaming = regional.flatrate || [];
  const rent = regional.rent || [];
  const buy = regional.buy || [];
  if (streaming.length === 0 && rent.length === 0 && buy.length === 0) return '';
  return `
    <div class="streaming-section">
      <h3 style="font-size: 18px; margin: 20px 0 12px 0; color: rgba(255,255,255,0.9);">Where to Watch (${escapeHtml(
        region,
      )})</h3>
      ${renderProviderCategory('Stream', streaming)}
      ${renderProviderCategory('Rent', rent)}
      ${renderProviderCategory('Buy', buy)}
    </div>
  `;
}

function renderSeasons(seasonsData) {
  if (!seasonsData || seasonsData.length === 0) return '';
  const items = seasonsData
    .sort((a, b) => a.season_number - b.season_number)
    .map((season) => {
      const airYear = season.air_date ? new Date(season.air_date).getFullYear() : 'TBA';
      const episodeCount = season.episode_count || 0;
      return `
        <div class="season-item">
          <div class="season-header">
            <div class="season-title">Season ${escapeHtml(String(season.season_number))}</div>
            <div class="season-meta">${escapeHtml(String(airYear))} • ${escapeHtml(String(episodeCount))} Episode${
        episodeCount !== 1 ? 's' : ''
      }</div>
          </div>
          ${season.overview ? `<div class="season-overview">${escapeHtml(season.overview)}</div>` : ''}
          ${!season.overview && season.episodes && season.episodes.length > 0 ? `<div class="season-overview">${escapeHtml(
            season.episodes[0].overview || ''
          )}</div>` : ''}
        </div>
      `;
    })
    .join('');
  return `
    <div class="seasons-section">
      <h3 style="font-size: 18px; margin: 20px 0 16px 0; color: rgba(255,255,255,0.9);">Seasons</h3>
      ${items}
    </div>
  `;
}

function renderCast(credits) {
  const cast = credits?.cast || [];
  if (cast.length === 0) return '';
  return `
    <div class="cast-section">
      <h3 style="font-size: 18px; margin: 20px 0 10px 0; color: rgba(255,255,255,0.9);">Cast</h3>
      <div class="cast-grid">
        ${cast
          .slice(0, 6)
          .map(
            (actor) => `
              <div class="cast-member">
                <img loading="lazy" decoding="async" src="${
                  actor.profile_path
                    ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                    : 'https://via.placeholder.com/80x80/666/fff?text=?'
                }" alt="${escapeHtml(actor.name)}" class="cast-photo">
                <div class="cast-name">${escapeHtml(actor.name)}</div>
                <div class="cast-character">${escapeHtml(actor.character || '')}</div>
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderCrew(credits) {
  const crew = credits?.crew || [];
  if (crew.length === 0) return '';
  const directors = crew.filter((p) => p.job === 'Director').slice(0, 3);
  const writers = crew.filter((p) => ['Writer', 'Screenplay', 'Story', 'Creator'].includes(p.job)).slice(0, 3);
  const producers = crew.filter((p) => ['Producer', 'Executive Producer'].includes(p.job)).slice(0, 3);
  if (directors.length === 0 && writers.length === 0 && producers.length === 0) return '';
  return `
    <div class="crew-section">
      <h3 style="font-size: 18px; margin: 20px 0 10px 0; color: rgba(255,255,255,0.9);">Crew</h3>
      <div class="crew-grid">
        ${
          directors.length > 0
            ? `<div class="crew-role"><div class="crew-role-title">Director</div><div class="crew-names">${directors
                .map((d) => escapeHtml(d.name))
                .join(', ')}</div></div>`
            : ''
        }
        ${
          writers.length > 0
            ? `<div class="crew-role"><div class="crew-role-title">Writer/Creator</div><div class="crew-names">${writers
                .map((w) => escapeHtml(w.name))
                .join(', ')}</div></div>`
            : ''
        }
        ${
          producers.length > 0
            ? `<div class="crew-role"><div class="crew-role-title">Producer</div><div class="crew-names">${producers
                .map((p) => escapeHtml(p.name))
                .join(', ')}</div></div>`
            : ''
        }
      </div>
    </div>
  `;
}

function renderKeywords(keywords) {
  const list = keywords?.results || [];
  if (list.length === 0) return '';
  return `
    <div class="keywords-section">
      <h4 style="font-size: 16px; margin: 0 0 8px 0; color: rgba(255,255,255,0.8);">Keywords</h4>
      <div class="keywords-container">
        ${list.slice(0, 10).map((k) => `<span class=\"keyword-tag\">${escapeHtml(k.name)}</span>`).join('')}
      </div>
    </div>
  `;
}

function renderReviews(reviews) {
  const results = reviews?.results || [];
  if (results.length === 0) return '';
  const sorted = results
    .filter((r) => r.created_at)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);
  if (sorted.length === 0) return '';
  return `
    <div class="reviews-section">
      <h3 style="font-size: 18px; margin: 20px 0 16px 0; color: rgba(255,255,255,0.9);">User Reviews</h3>
      ${sorted
        .map((review) => {
          const body = escapeHtml(stripHtmlTags(review.content || ''));
          return `
            <div class="review-item">
              <div class="review-header">
                <div class="review-author">${escapeHtml(review.author || 'Anonymous')}</div>
                ${
                  review.author_details && review.author_details.rating
                    ? `<div class=\"review-rating\">★ ${escapeHtml(String(review.author_details.rating))}/10</div>`
                    : ''
                }
              </div>
              <div class="review-content">${body}</div>
              ${
                review.created_at
                  ? `<div class=\"review-date\">${new Date(review.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}</div>`
                  : ''
              }
            </div>`;
        })
        .join('')}
    </div>
  `;
}

function generateTvSeriesHTML(tvSeries, credits, keywords, reviews, seasonsData, watchProviders, region) {
  const safeTitle = escapeHtml(tvSeries.name || 'TV Series');
  const safeOverview = escapeHtml(tvSeries.overview || `${safeTitle} - Watch and discover TV series on Verdict app`);
  const posterUrl = tvSeries.poster_path
    ? `https://image.tmdb.org/t/p/w500${tvSeries.poster_path}`
    : 'https://via.placeholder.com/300x450/cccccc/666666?text=No+Image';
  const backdropUrl = tvSeries.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tvSeries.backdrop_path}` : posterUrl;
  const year = tvSeries.first_air_date ? new Date(tvSeries.first_air_date).getFullYear() : 'Unknown';

  const jsonLd = buildTvJsonLd(tvSeries, credits, keywords, reviews, posterUrl);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} - Verdict</title>
  <meta name="description" content="${safeOverview}">
  <link rel="canonical" href="https://verdict.daniyar.link/tv/${escapeHtml(String(tvSeries.id))}">

  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${escapeHtml(tvSeries.overview || 'No description available')}">
  <meta property="og:image" content="${posterUrl}">
  <meta property="og:url" content="https://verdict.daniyar.link/tv/${escapeHtml(String(tvSeries.id))}">
  <meta property="og:type" content="video.tv_show">
  <meta property="og:site_name" content="Verdict">
  <meta property="og:locale" content="en_US">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${escapeHtml(tvSeries.overview || 'No description available')}">
  <meta name="twitter:image" content="${posterUrl}">

  <script type="application/ld+json">${jsonLd}</script>

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #000; color: #fff; overflow-x: hidden; }
    .background { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-image: url('${backdropUrl}'); background-size: cover; background-position: center; filter: blur(30px); z-index: -2; }
    .background-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 70%, rgba(0,0,0,0.9) 100%); z-index: -1; pointer-events: none; }
    .app-banner { color: white; padding: 20px; text-align: center; font-size: 16px; position: relative; z-index: 10; }
    .banner-text { font-weight: 500; margin-bottom: 12px; color: rgba(255,255,255,0.9); }
    .download-btn { background: rgba(255,255,255,0.15); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; display: inline-block; transition: all 0.3s ease; font-size: 15px; }
    .download-btn:hover { background: rgba(255,255,255,0.25); border-color: rgba(255,255,255,0.3); transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .content-container { position: relative; z-index: 10; padding-top: 60px; min-height: 100vh; }
    .main-content { max-width: 800px; margin: 0 auto; padding: 0 24px; text-align: center; }
    .poster-section { display: flex; justify-content: center; margin-bottom: 32px; }
    .poster-container { width: 60%; max-width: 300px; position: relative; }
    .poster { width: 100%; aspect-ratio: 2/3; object-fit: cover; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); }
    .poster-gradient { position: absolute; bottom: 0; left: 0; right: 0; height: 40%; background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.3) 100%); border-radius: 0 0 12px 12px; }
    .tv-info { text-align: left; margin-bottom: 24px; }
    .genres { margin: 16px 0; }
    .genre-tag { display: inline-block; background: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 12px; font-size: 13px; margin: 0 6px 6px 0; color: rgba(255,255,255,0.9); }
    .rating { display: flex; align-items: center; gap: 8px; margin: 12px 0; font-size: 16px; }
    .rating-stars { color: #ffd700; }
    .cast-section { margin: 24px 0; }
    .cast-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px; margin-top: 16px; }
    .cast-member { text-align: center; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 12px; transition: all 0.3s ease; }
    .cast-photo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin: 0 auto 8px; display: block; background: rgba(255,255,255,0.1); }
    .cast-name { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); margin-bottom: 4px; }
    .cast-character { font-size: 12px; color: rgba(255,255,255,0.6); }
    .crew-section { margin: 24px 0; }
    .crew-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 16px; }
    .crew-role { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; }
    .crew-role-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .crew-names { font-size: 15px; color: rgba(255,255,255,0.9); line-height: 1.4; }
    .keywords-section { margin: 24px 0; }
    .keywords-container { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .keyword-tag { display: inline-block; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 16px; font-size: 13px; color: rgba(255,255,255,0.8); transition: all 0.2s ease; }
    .keyword-tag:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.9); }
    .reviews-section { margin: 32px 0; }
    .review-item { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.08); }
    .review-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .review-author { font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.9); }
    .review-rating { background: rgba(255,215,0,0.2); color: #ffd700; padding: 4px 8px; border-radius: 8px; font-size: 14px; font-weight: 600; }
    .review-content { font-size: 15px; line-height: 1.6; color: rgba(255,255,255,0.8); }
    .review-content.truncated { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
    .review-date { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 12px; }
    .seasons-section { margin: 24px 0; }
    .season-item { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.08); }
    .season-header { margin-bottom: 12px; }
    .season-title { font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.9); margin-bottom: 4px; }
    .season-meta { font-size: 14px; color: rgba(255,255,255,0.6); }
    .season-overview { font-size: 15px; line-height: 1.6; color: rgba(255,255,255,0.8); white-space: pre-line; }
    .tv-title { font-size: 28px; font-weight: 700; line-height: 1.2; margin-bottom: 8px; }
    .release-year { font-size: 17px; color: rgba(255,255,255,0.7); margin-bottom: 8px; }
    .overview { font-size: 17px; line-height: 1.6; color: rgba(255,255,255,0.9); margin-top: 8px; }
    .streaming-section { margin: 24px 0; }
    .streaming-category { margin-bottom: 20px; }
    .streaming-category-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .streaming-providers { display: flex; flex-wrap: wrap; gap: 12px; }
    .provider-item { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 8px 12px; border: 1px solid rgba(255,255,255,0.1); }
    .provider-logo { width: 24px; height: 24px; border-radius: 4px; object-fit: cover; }
    .provider-name { font-size: 13px; color: rgba(255,255,255,0.9); font-weight: 500; }
    .footer { text-align: center; padding: 40px 24px; color: rgba(255,255,255,0.6); font-size: 14px; position: relative; z-index: 10; }
    .tv-details { display: flex; flex-wrap: wrap; gap: 16px; margin: 16px 0; }
    .detail-item { background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 20px; font-size: 14px; color: rgba(255,255,255,0.9); }
    @media (max-width: 768px) { .content-container { padding-top: 40px; } .tv-title { font-size: 24px; } }
    @media (max-width: 480px) { .tv-info { padding-left: 16px; padding-right: 16px; } .poster-section { padding: 0 16px; } }
  </style>
</head>
<body>
  <div class="background"></div>
  <div class="background-overlay"></div>

  <div class="app-banner">
    <div class="banner-text">📺 Open in Verdict, rate it and share with friends</div>
    <a href="https://go.daniyar.link/verdict-web" class="download-btn" target="_blank" rel="noopener noreferrer">Download from App Store</a>
  </div>

  <div class="content-container">
    <div class="main-content">
      <div class="poster-section">
        <div class="poster-container">
          <img src="${posterUrl}" alt="${safeTitle}" class="poster" decoding="async">
          <div class="poster-gradient"></div>
        </div>
      </div>

      <div class="tv-info">
        <h1 class="tv-title">${safeTitle}</h1>
        ${year !== 'Unknown' ? `<div class="release-year">${escapeHtml(String(year))}</div>` : ''}
        ${tvSeries.vote_average ? `<div class="rating">${renderStarRating(tvSeries.vote_average)}</div>` : ''}
        <div class="tv-details">
          ${tvSeries.number_of_seasons ? `<div class="detail-item">📺 ${escapeHtml(String(tvSeries.number_of_seasons))} Season${
            tvSeries.number_of_seasons > 1 ? 's' : ''
          }</div>` : ''}
          ${tvSeries.number_of_episodes ? `<div class="detail-item">🎬 ${escapeHtml(String(tvSeries.number_of_episodes))} Episodes</div>` : ''}
          ${tvSeries.status ? `<div class="detail-item">📅 ${escapeHtml(tvSeries.status)}</div>` : ''}
          ${tvSeries.original_language ? `<div class="detail-item">🌐 ${escapeHtml(tvSeries.original_language.toUpperCase())}</div>` : ''}
          ${tvSeries.episode_run_time && tvSeries.episode_run_time.length > 0 ? `<div class="detail-item">⏱️ ${escapeHtml(
            String(tvSeries.episode_run_time[0]),
          )} min/episode</div>` : ''}
        </div>
        ${tvSeries.genres && tvSeries.genres.length > 0 ? `<div class="genres">${tvSeries.genres
          .map((genre) => `<span class="genre-tag">${escapeHtml(genre.name)}</span>`)
          .join('')}</div>` : ''}
        ${tvSeries.overview ? `<div class="overview">${escapeHtml(tvSeries.overview)}</div>` : ''}
        ${renderWatchProviders(watchProviders, region)}
        ${renderSeasons(seasonsData)}
        ${renderCast(credits)}
        ${renderReviews(reviews)}
        ${renderCrew(credits)}
        ${
          tvSeries.networks && tvSeries.networks.length > 0
            ? `<div class="network-info"><h3 style="font-size: 18px; margin: 20px 0 10px 0; color: rgba(255,255,255,0.9);">Network</h3><div style="font-size: 15px; color: rgba(255,255,255,0.7);">${tvSeries.networks
                .map((n) => escapeHtml(n.name))
                .join(', ')}</div></div>`
            : ''
        }
        ${
          tvSeries.production_companies && tvSeries.production_companies.length > 0
            ? `<div class="production-info"><h3 style="font-size: 18px; margin: 20px 0 10px 0; color: rgba(255,255,255,0.9);">Production</h3><div style="font-size: 15px; color: rgba(255,255,255,0.7);">${tvSeries.production_companies
                .map((pc) => escapeHtml(pc.name))
                .join(', ')}</div></div>`
            : ''
        }
        ${renderKeywords(keywords)}
      </div>
    </div>

    <div class="footer">
      <a href="https://go.daniyar.link/x-verdictweb" target="_blank" rel="noopener noreferrer" style="color: rgba(255,255,255,0.8); text-decoration: underline;">made by Daniyar Agabekov</a>
      <div style="margin-top: 16px; font-size: 13px; color: white;">
        <div style="line-height: 1.6;">
          <div style="margin-bottom: 6px; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s;" onclick="copyToClipboard('bc1quzza9c30exsj7jj02kj2nukcxg7x8mf2259w2m', this)" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Bitcoin: bc1quzza9c30exsj7jj02kj2nukcxg7x8mf2259w2m</div>
          <div style="margin-bottom: 6px; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s;" onclick="copyToClipboard('0x655e13867c27292E04f5579918eb6A2B15eEdaCd', this)" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Ethereum: 0x655e13867c27292E04f5579918eb6A2B15eEdaCd</div>
          <div style="margin-bottom: 6px; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s;" onclick="copyToClipboard('0x655e13867c27292E04f5579918eb6A2B15eEdaCd', this)" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Tether USD: 0x655e13867c27292E04f5579918eb6A2B15eEdaCd</div>
          <div style="margin-bottom: 6px; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s;" onclick="copyToClipboard('5nroFAaVoz3iJhMY8xQiHMkDvkNt13douMsggjDiMALL', this)" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Solana: 5nroFAaVoz3iJhMY8xQiHMkDvkNt13douMsggjDiMALL</div>
          <div style="cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s;" onclick="copyToClipboard('DHgcLztxTA4GXFBV5FLP7qXCLJC4o1Rqoz', this)" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Dogecoin: DHgcLztxTA4GXFBV5FLP7qXCLJC4o1Rqoz</div>
        </div>
      </div>
    </div>
  </div>

  <script async defer src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
  <script>
    function copyToClipboard(text, element) {
      navigator.clipboard.writeText(text).then(function() {
        const originalText = element.innerHTML;
        element.innerHTML = originalText + ' <span style="color: #4CAF50;">✓ Copied!</span>';
        setTimeout(function() { element.innerHTML = originalText; }, 2000);
      }).catch(function(err) { console.error('Could not copy text: ', err); });
    }
  </script>
</body>
</html>
  `;
}

export default async function handler(req, res) {
  const { id } = req.query;

  const hasBearer = Boolean(process.env.TMDB_BEARER_TOKEN);
  const hasV3Key = Boolean(process.env.TMDB_API_KEY);
  if (!hasBearer && !hasV3Key) {
    return res.status(500).json({ error: 'TMDB credentials are not configured' });
  }

  const region = parseRegion(req.headers['accept-language']);

  try {
    // Fetch base TV series first (to know seasons), then fetch dependents in parallel
    const tvSeries = await fetchTmdb(`/tv/${id}`);

    const [credits, keywords, reviews, watchProviders, seasonsDataRaw] = await Promise.all([
      fetchTmdbOrNull(`/tv/${id}/credits`),
      fetchTmdbOrNull(`/tv/${id}/keywords`),
      fetchTmdbOrNull(`/tv/${id}/reviews`),
      fetchTmdbOrNull(`/tv/${id}/watch/providers`),
      tvSeries.seasons && tvSeries.seasons.length > 0
        ? Promise.all(
            tvSeries.seasons
              .filter((s) => s.season_number > 0)
              .slice(0, 10)
              .map(async (season) => {
                const detail = await fetchTmdbOrNull(`/tv/${id}/season/${season.season_number}`);
                if (detail) {
                  return {
                    ...season,
                    ...detail,
                    episode_count: detail.episodes ? detail.episodes.length : season.episode_count,
                  };
                }
                return season;
              }),
          )
        : Promise.resolve([]),
    ]);

    const seasonsData = Array.isArray(seasonsDataRaw) ? seasonsDataRaw : [];

    const html = generateTvSeriesHTML(
      tvSeries,
      credits || { cast: [], crew: [] },
      keywords || { results: [] },
      reviews || { results: [] },
      seasonsData,
      watchProviders || { results: {} },
      region,
    );

    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Vary', 'Accept-Language');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "base-uri 'self'",
        "img-src 'self' https: data:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self' 'unsafe-inline' https://scripts.simpleanalyticscdn.com",
        "connect-src 'self' https://api.simpleanalytics.com https://queue.simpleanalyticscdn.com",
        "frame-ancestors 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ].join('; '),
    );
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    return res.status(200).send(html);
  } catch (error) {
    if (error && error.status === 404) {
      // Fetch popular TV shows for 404 page
      const popularTvShows = await fetchTmdbOrNull('/tv/popular');
      const tvShows = popularTvShows?.results?.slice(0, 12) || [];
      
      // Use first TV show's backdrop for background
      const backdropUrl = tvShows.length > 0 && tvShows[0].backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${tvShows[0].backdrop_path}`
        : tvShows.length > 0 && tvShows[0].poster_path
        ? `https://image.tmdb.org/t/p/w500${tvShows[0].poster_path}`
        : '';
      
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
      return res.status(404).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TV Series Not Found - Verdict</title>
  <meta name="description" content="The TV series you're looking for was not found. Discover and rate TV shows on the Verdict app.">
  
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #000; color: #fff; overflow-x: hidden; min-height: 100vh; display: flex; flex-direction: column; }
    .background { position: fixed; top: 0; left: 0; width: 100%; height: 100%; ${backdropUrl ? `background-image: url('${backdropUrl}'); background-size: cover; background-position: center; filter: blur(30px);` : 'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);'} z-index: -2; }
    .background-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 70%, rgba(0,0,0,0.9) 100%); z-index: -1; pointer-events: none; }
    .app-banner { color: white; padding: 20px; text-align: center; font-size: 16px; position: relative; z-index: 10; }
    .banner-text { font-weight: 500; margin-bottom: 12px; color: rgba(255,255,255,0.9); }
    .download-btn { background: rgba(255,255,255,0.15); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; display: inline-block; transition: all 0.3s ease; font-size: 15px; }
    .download-btn:hover { background: rgba(255,255,255,0.25); border-color: rgba(255,255,255,0.3); transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .content-container { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 24px; }
    .main-content { text-align: center; max-width: 500px; }
    .error-title { font-size: 32px; font-weight: 700; margin-bottom: 16px; color: rgba(255,255,255,0.9); }
    .popular-section { margin-top: 24px; padding: 0 24px; max-width: 1200px; margin-left: auto; margin-right: auto; }
    .popular-title { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: rgba(255,255,255,0.9); text-align: center; }
    .tv-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; margin-bottom: 32px; }
    .tv-card { position: relative; transition: all 0.3s ease; }
    .tv-card:hover { transform: translateY(-4px); }
    .tv-poster { width: 100%; aspect-ratio: 2/3; object-fit: cover; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); }
    .tv-link { text-decoration: none; color: inherit; display: block; }
    .search-container { margin: 8px 0 24px 0; max-width: 400px; margin-left: auto; margin-right: auto; position: relative; }
    .search-input { width: 100%; padding: 16px 20px; font-size: 16px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); border-radius: 12px; color: white; outline: none; transition: all 0.3s ease; }
    .search-input::placeholder { color: rgba(255,255,255,0.6); }
    .search-input:focus { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.4); box-shadow: 0 0 0 4px rgba(255,255,255,0.1); }
    .search-suggestions { position: absolute; top: 100%; left: 0; right: 0; background: rgba(20,20,20,0.95); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; margin-top: 8px; max-height: 300px; overflow-y: auto; z-index: 1000; display: none; }
    .search-suggestion { padding: 12px 16px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1); transition: background 0.2s ease; }
    .search-suggestion:hover { background: rgba(255,255,255,0.1); }
    .search-suggestion:last-child { border-bottom: none; }
    .suggestion-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); margin-bottom: 4px; }
    .suggestion-meta { font-size: 12px; color: rgba(255,255,255,0.6); }
    .footer { text-align: center; padding: 40px 24px; color: rgba(255,255,255,0.6); font-size: 14px; position: relative; z-index: 10; }
    @media (max-width: 768px) { .error-title { font-size: 28px; } .tv-grid { grid-template-columns: repeat(3, 1fr); } .popular-section { padding: 0 16px; } }
    @media (max-width: 480px) { .tv-grid { grid-template-columns: repeat(2, 1fr); } }
  </style>
</head>
<body>
  <div class="background"></div>
  <div class="background-overlay"></div>
  
  <div class="app-banner">
    <div class="banner-text">📺 Open in Verdict, rate it and share with friends</div>
    <a href="https://go.daniyar.link/verdict-web" class="download-btn" target="_blank" rel="noopener noreferrer">Download from App Store</a>
  </div>

  <div class="content-container">
    <div class="main-content">
      <h1 class="error-title">Hmm, we don't have that</h1>
      <div class="search-container">
        <input type="text" class="search-input" placeholder="Find movies and TV shows" id="searchInput">
        <div class="search-suggestions" id="searchSuggestions"></div>
      </div>
    </div>
  </div>

  <div class="popular-section">
    <h2 class="popular-title">Popular now</h2>
    <div class="tv-grid">
      ${tvShows.map(tvShow => `
        <a href="/tv/${tvShow.id}" class="tv-link">
          <div class="tv-card">
            <img src="${tvShow.poster_path 
              ? `https://image.tmdb.org/t/p/w500${tvShow.poster_path}` 
              : 'https://via.placeholder.com/300x450/cccccc/666666?text=No+Image'}" 
              alt="${escapeHtml(tvShow.name || 'TV Series')}" 
              class="tv-poster" 
              loading="lazy" 
              decoding="async">
          </div>
        </a>
      `).join('')}
    </div>
  </div>

  <div class="footer">
    <a href="https://go.daniyar.link/x-verdictweb" target="_blank" rel="noopener noreferrer" style="color: rgba(255,255,255,0.8); text-decoration: underline;">made by Daniyar Agabekov</a>
    <div style="margin-top: 16px; font-size: 13px; color: white;">
      <div style="line-height: 1.6;">
        <div style="margin-bottom: 6px; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s;" onclick="copyToClipboard('bc1quzza9c30exsj7jj02kj2nukcxg7x8mf2259w2m', this)" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Bitcoin: bc1quzza9c30exsj7jj02kj2nukcxg7x8mf2259w2m</div>
        <div style="margin-bottom: 6px; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s;" onclick="copyToClipboard('0x655e13867c27292E04f5579918eb6A2B15eEdaCd', this)" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Ethereum: 0x655e13867c27292E04f5579918eb6A2B15eEdaCd</div>
        <div style="margin-bottom: 6px; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s;" onclick="copyToClipboard('0x655e13867c27292E04f5579918eb6A2B15eEdaCd', this)" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Tether USD: 0x655e13867c27292E04f5579918eb6A2B15eEdaCd</div>
        <div style="margin-bottom: 6px; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s;" onclick="copyToClipboard('5nroFAaVoz3iJhMY8xQiHMkDvkNt13douMsggjDiMALL', this)" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Solana: 5nroFAaVoz3iJhMY8xQiHMkDvkNt13douMsggjDiMALL</div>
        <div style="cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s;" onclick="copyToClipboard('DHgcLztxTA4GXFBV5FLP7qXCLJC4o1Rqoz', this)" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Dogecoin: DHgcLztxTA4GXFBV5FLP7qXCLJC4o1Rqoz</div>
      </div>
    </div>
  </div>

  <script>
    function copyToClipboard(text, element) {
      navigator.clipboard.writeText(text).then(function() {
        const originalText = element.innerHTML;
        element.innerHTML = originalText + ' <span style="color: #4CAF50;">✓ Copied!</span>';
        setTimeout(function() { element.innerHTML = originalText; }, 2000);
      }).catch(function(err) { console.error('Could not copy text: ', err); });
    }

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const suggestionsContainer = document.getElementById('searchSuggestions');
    let searchTimeout;

    searchInput.addEventListener('input', function() {
      const query = this.value.trim();
      clearTimeout(searchTimeout);
      
      if (query.length < 2) {
        suggestionsContainer.style.display = 'none';
        return;
      }

      searchTimeout = setTimeout(async () => {
        try {
          const response = await fetch(\`/api/search-tv?query=\${encodeURIComponent(query)}\`);
          const data = await response.json();
          
          if (data.results && data.results.length > 0) {
            displaySuggestions(data.results.slice(0, 5));
          } else {
            suggestionsContainer.style.display = 'none';
          }
        } catch (error) {
          console.error('Search error:', error);
          suggestionsContainer.style.display = 'none';
        }
      }, 300);
    });

    function displaySuggestions(tvShows) {
      suggestionsContainer.innerHTML = tvShows.map(tvShow => \`
        <div class="search-suggestion" onclick="openTvShow(\${tvShow.id})">
          <div class="suggestion-title">\${tvShow.name || 'Unknown Title'}</div>
          <div class="suggestion-meta">\${tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : 'Unknown Year'}</div>
        </div>
      \`).join('');
      suggestionsContainer.style.display = 'block';
    }

    function openTvShow(tvId) {
      window.location.href = \`/tv/\${tvId}\`;
    }

    // Hide suggestions when clicking outside
    document.addEventListener('click', function(event) {
      if (!searchInput.contains(event.target) && !suggestionsContainer.contains(event.target)) {
        suggestionsContainer.style.display = 'none';
      }
    });
  </script>
</body>
</html>
      `);
    }
    console.error('Error fetching TV series:', error);
    return res.status(500).json({ error: 'Failed to fetch TV series data' });
  }
}