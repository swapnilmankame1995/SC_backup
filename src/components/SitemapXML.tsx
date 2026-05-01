import { useEffect } from 'react';

export function SitemapXML() {
  useEffect(() => {
    // Set the document content type to XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://sheetcutters.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://sheetcutters.com/#/laser-cutting</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://sheetcutters.com/#/convert-sketch-to-cad</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://legal.sheetcutters.com/#/philosophy</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://legal.sheetcutters.com/#/privacy</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://legal.sheetcutters.com/#/terms</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://legal.sheetcutters.com/#/affiliate</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`;

    // Replace the entire document with XML
    document.open();
    document.write(sitemap);
    document.close();
  }, []);

  // This component doesn't render anything visible
  return null;
}

export function RobotsTxt() {
  useEffect(() => {
    const robotsTxt = `# Sheetcutters.com - Robots.txt
User-agent: *
Allow: /

# Sitemap location
Sitemap: https://sheetcutters.com/sitemap.xml

# Disallow admin and user-specific pages
Disallow: /admin
Disallow: /dashboard
Disallow: /cart
Disallow: /checkout
Disallow: /orders

# Crawl-delay (optional, helps prevent overload)
Crawl-delay: 1`;

    // Replace the entire document with plain text
    document.open();
    document.write(`<pre style="font-family: monospace; white-space: pre; margin: 0; padding: 20px;">${robotsTxt}</pre>`);
    document.close();
  }, []);

  return null;
}
