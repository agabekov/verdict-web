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

  // Generate sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(page => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.status(200).send(sitemap);
}