export interface BloggerPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  published: string;
  updated: string;
  author: string;
  thumbnail: string | null;
  fullImage: string | null;
  categories: string[];
  originalUrl: string;
}

let cachedPosts: BloggerPost[] | null = null;
let cachedCategories: string[] = [];

function cleanExcerpt(html: string): string {
  if (!html) return "";
  const plainText = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Jika teks kosong atau terlalu pendek (misal infografis tanpa teks)
  if (plainText.length < 5) return "";

  return plainText.length > 160 ? `${plainText.slice(0, 157)}...` : plainText;
}

function extractImage(entry: any, highRes: boolean = false): string | null {
  // Check media$thumbnail first
  if (entry.media$thumbnail && entry.media$thumbnail.url) {
    let url = entry.media$thumbnail.url;
    if (highRes) {
      url = url.replace(/\/s[0-9]+(-[^/]+)?\//, "/s1600/");
    } else {
      // Auto resize ke 600px dan convert ke WebP langsung oleh Google CDN
      url = url.replace(/\/s[0-9]+(-[^/]+)?\//, "/w600-rw/");
    }
    // Upgrade YouTube thumbnail
    if (url.includes("img.youtube.com") && url.includes("/default.jpg")) {
      url = url.replace("/default.jpg", "/hqdefault.jpg");
    }
    return url;
  }

  // Fallback to first img tag in content
  if (entry.content && entry.content.$t) {
    const match = entry.content.$t.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match && match[1]) {
      let imgUrl = match[1];
      if (!highRes && imgUrl.includes("blogger.googleusercontent.com") && /\/s[0-9]+(-[^/]+)?\//.test(imgUrl)) {
        imgUrl = imgUrl.replace(/\/s[0-9]+(-[^/]+)?\//, "/w600-rw/");
      }
      return imgUrl;
    }
  }

  return null;
}

function formatPostContent(html: string): string {
  if (!html) return "";

  // Ensure all anchor tags wrapping images or pointing to images open in a new tab
  return html.replace(/<a\b([^>]*)>/gi, (match, attrs) => {
    const isImageLink =
      attrs.toLowerCase().includes("imageanchor") ||
      attrs.toLowerCase().includes("blogger.googleusercontent.com") ||
      /\.(png|jpe?g|webp|gif|svg)/i.test(attrs);

    if (isImageLink) {
      let updated = attrs;
      if (!/target\s*=/i.test(updated)) {
        updated += ' target="_blank"';
      } else {
        updated = updated.replace(/target\s*=\s*["'][^"']*["']/i, 'target="_blank"');
      }

      if (!/rel\s*=/i.test(updated)) {
        updated += ' rel="noopener noreferrer"';
      } else if (!/noopener/i.test(updated)) {
        updated = updated.replace(/rel\s*=\s*["']([^"']*)["']/i, 'rel="$1 noopener noreferrer"');
      }

      return `<a${updated}>`;
    }

    return match;
  });
}

export async function fetchBloggerPosts(): Promise<BloggerPost[]> {
  if (cachedPosts && cachedPosts.length > 0) {
    return cachedPosts;
  }

  try {
    const feedUrl =
      "https://qataquran.blogspot.com/feeds/posts/default?alt=json&max-results=500";
    const res = await fetch(feedUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.error(`Failed to fetch Blogger posts: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const entries = data.feed?.entry || [];

    const posts: BloggerPost[] = entries.map((entry: any) => {
      const rawTitle = entry.title?.$t || "Tanpa Judul";
      const cleanTitle = rawTitle.trim();
      const rawContent = entry.content?.$t || "";
      const published = entry.published?.$t || new Date().toISOString();
      const updated = entry.updated?.$t || published;
      const author = entry.author?.[0]?.name?.$t || "Qata Quran";

      const altLink =
        entry.link?.find((l: any) => l.rel === "alternate")?.href || "";
      // Extract slug from URL: e.g. https://qataquran.blogspot.com/2026/10/ar-ridha-bil-qalil.html -> ar-ridha-bil-qalil
      const slugMatch = altLink.match(/\/([^/]+)\.html$/);
      let slug = slugMatch ? slugMatch[1] : "";
      if (!slug) {
        slug = cleanTitle
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-");
      }

      const categories = entry.category
        ? entry.category.map((c: any) => c.term).filter(Boolean)
        : [];
      const thumbnail = extractImage(entry, false);
      const fullImage = extractImage(entry, true);
      const excerpt = cleanExcerpt(rawContent);

      return {
        id: entry.id?.$t || slug,
        title: cleanTitle,
        slug,
        content: formatPostContent(rawContent),
        excerpt,
        published,
        updated,
        author,
        thumbnail,
        fullImage,
        categories,
        originalUrl: altLink,
      };
    });

    // Merge and extract categories
    const feedCategories = (data.feed?.category || [])
      .map((c: any) => c.term)
      .filter(Boolean);
    const postCategories = posts.flatMap((p) => p.categories);
    cachedCategories = Array.from(new Set([...feedCategories, ...postCategories]))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "id"));

    // Sort by publication date (newest first)
    posts.sort(
      (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime()
    );

    cachedPosts = posts;
    return posts;
  } catch (err) {
    console.error("Error fetching Blogger feed:", err);
    return [];
  }
}

export async function fetchBloggerCategories(): Promise<string[]> {
  if (cachedCategories.length === 0) {
    await fetchBloggerPosts();
  }
  return cachedCategories;
}

export async function fetchBloggerPostBySlug(
  slug: string
): Promise<BloggerPost | null> {
  const posts = await fetchBloggerPosts();
  return posts.find((p) => p.slug === slug) || null;
}
