import type { APIRoute } from "astro";
import { fetchBloggerPosts } from "../lib/blogger";
import { SITE } from "../config/site.mjs";

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const GET: APIRoute = async () => {
  const posts = await fetchBloggerPosts();
  const siteUrl = SITE.url.replace(/\/$/, "");

  const itemsXml = posts
    .map((post) => {
      const postUrl = `${siteUrl}/artikel/${post.slug}`;
      const pubDate = new Date(post.published).toUTCString();
      const imageUrl = post.fullImage || post.thumbnail;

      const mediaTags = imageUrl
        ? `
      <enclosure url="${escapeXml(imageUrl)}" type="image/jpeg" length="0" />
      <media:content url="${escapeXml(imageUrl)}" medium="image" />`
        : "";

      const cleanExcerpt = escapeXml(post.excerpt || post.title);

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${cleanExcerpt}]]></description>${mediaTags}
    </item>`;
    })
    .join("\n");

  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(SITE.title)}</title>
    <description>${escapeXml(SITE.description)}</description>
    <link>${siteUrl}</link>
    <language>id</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemsXml}
  </channel>
</rss>`;

  return new Response(rssFeed.trim(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
