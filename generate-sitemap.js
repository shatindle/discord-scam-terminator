const { writeFileSync } = require("fs");
const gitDateExtractor = require('git-date-extractor');

(async () => {
    const stamps = await gitDateExtractor.getStamps({});

    let sortedAsc = Object.values(stamps).map(t => t.modified).sort();

    let mostRecent = new Date(sortedAsc[sortedAsc.length - 1] * 1000);

    let lastmod = mostRecent.toISOString().split("T")[0];

    let sitemapStart = 
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">';

    let urlTemplate = 
    '<url>' +
    '<loc>{{URL}}</loc>' +
    '<lastmod>{{DATE}}</lastmod>' +
    '</url>';

    let sitemapEnd = '</urlset>';

    let sitemap = 
        sitemapStart +
        urlTemplate.replace("{{URL}}", "https://antiphish.info/").replace("{{DATE}}", lastmod) + 
        urlTemplate.replace("{{URL}}", "https://antiphish.info/activity").replace("{{DATE}}", lastmod) +
        sitemapEnd;

    writeFileSync(__dirname + "/website/static/sitemap.xml", sitemap);
})();