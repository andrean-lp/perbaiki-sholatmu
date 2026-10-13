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
  categories: string[];
  originalUrl: string;
}

let cachedPosts: BloggerPost[] | null = null;

function cleanExcerpt(html: string): string {
  if (!html) return "";
  const plainText = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plainText.length > 160 ? `${plainText.slice(0, 157)}...` : plainText;
}

function extractImage(entry: any): string | null {
  // Check media$thumbnail first
  if (entry.media$thumbnail && entry.media$thumbnail.url) {
    let url = entry.media$thumbnail.url;
    // Upgrade Google thumbnail to high-res WebP/image
    url = url.replace(/\/s[0-9]+(-[^/]+)?\//, "/s1600/");
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
      return match[1];
    }
  }

  return null;
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
        // Fallback slugify title
        slug = cleanTitle
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-");
      }

      const categories = entry.category
        ? entry.category.map((c: any) => c.term).filter(Boolean)
        : [];
      const thumbnail = extractImage(entry);
      const excerpt = cleanExcerpt(rawContent);

      return {
        id: entry.id?.$t || slug,
        title: cleanTitle,
        slug,
        content: rawContent,
        excerpt,
        published,
        updated,
        author,
        thumbnail,
        categories,
        originalUrl: altLink,
      };
    });

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

export async function fetchBloggerPostBySlug(
  slug: string
): Promise<BloggerPost | null> {
  const posts = await fetchBloggerPosts();
  return posts.find((p) => p.slug === slug) || null;
}
