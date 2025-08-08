export default async function handler(req, res) {
  const baseUrl = 'https://verdict.daniyar.link';
  const currentDate = new Date().toISOString().split('T')[0];

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: '1.0'
    }
  ];

  // Popular movie/TV pages for SEO discovery
  const popularContent = [
    // Popular movies
    { type: 'movie', id: '550', title: 'Fight Club' },
    { type: 'movie', id: '238', title: 'The Godfather' },
    { type: 'movie', id: '424', title: 'Schindlers List' },
    { type: 'movie', id: '680', title: 'Pulp Fiction' },
    { type: 'movie', id: '13', title: 'Forrest Gump' },
    // Popular TV shows
    { type: 'tv', id: '1399', title: 'Game of Thrones' },
    { type: 'tv', id: '1396', title: 'Breaking Bad' },
    { type: 'tv', id: '82856', title: 'The Mandalorian' },
    { type: 'tv', id: '1402', title: 'The Walking Dead' },
    { type: 'tv', id: '1418', title: 'The Big Bang Theory' }
  ];

  const contentPages = popularContent.map(content => ({
    url: `${baseUrl}/${content.type}/${content.id}`,
    lastmod: currentDate,
    changefreq: 'weekly',
    priority: '0.8'
  }));

  const allPages = [...staticPages, ...contentPages];

  // Generate sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.status(200).send(sitemap);
}