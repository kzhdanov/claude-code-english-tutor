import { NextResponse } from "next/server";
import type { NewsItem, NewsCategory } from "@/types";

const CATEGORIES: { label: string; topic: string }[] = [
  { label: "Top Stories", topic: "TOP" },
  { label: "World", topic: "WORLD" },
  { label: "Politics", topic: "NATION" },
  { label: "Business", topic: "BUSINESS" },
  { label: "Technology", topic: "TECHNOLOGY" },
  { label: "Science", topic: "SCIENCE" },
  { label: "Health", topic: "HEALTH" },
  { label: "Sports", topic: "SPORTS" },
  { label: "Entertainment", topic: "ENTERTAINMENT" },
];

function rssUrl(topic: string) {
  if (topic === "TOP") {
    return "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en";
  }
  return `https://news.google.com/rss/headlines/section/topic/${topic}?hl=en-US&gl=US&ceid=US:en`;
}

function parseItems(xml: string, limit: number): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const itemXml = match[1];
    const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
    const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim();

    if (title && link) {
      const cleanTitle = title
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      items.push({ title: cleanTitle, link });
    }
  }

  return items;
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      CATEGORIES.map(async ({ label, topic }) => {
        const res = await fetch(rssUrl(topic), {
          next: { revalidate: 3600 },
        });
        if (!res.ok) return { label, items: [] };
        const xml = await res.text();
        return { label, items: parseItems(xml, 12) };
      }),
    );

    const categories: NewsCategory[] = results
      .filter(
        (r): r is PromiseFulfilledResult<NewsCategory> =>
          r.status === "fulfilled" && r.value.items.length > 0,
      )
      .map((r) => r.value);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json({ categories: [], error: "Failed to fetch news" });
  }
}
