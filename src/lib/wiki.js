// תמונה ופסקת פתיחה מוויקיפדיה, בזמן ריצה. כל מקטע מחזיק רשימת ערכים לפי סדר עדיפות.
const cache = new Map();

async function lookup(entry) {
  const [lang, title] = entry.split(':');
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages|extracts&piprop=thumbnail&pithumbsize=960&exintro=1&explaintext=1&exsentences=2&titles=${encodeURIComponent(title)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const page = Object.values(data?.query?.pages || {})[0];
  if (!page || page.missing !== undefined) return null;
  return {
    title: page.title,
    src: page.thumbnail?.source || null,
    extract: (page.extract || '').replace(/\s+/g, ' ').trim(),
    page: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
  };
}

/** הערך הראשון שיש לו תמונה, ואם אין, הראשון שקיים. */
export function wikiInfo(entries) {
  const key = entries.join('|');
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      let first = null;
      for (const e of entries) {
        try {
          const hit = await lookup(e);
          if (hit?.src) return hit;
          first = first || hit;
        } catch { /* רשת */ }
      }
      return first;
    })());
  }
  return cache.get(key);
}

export const commonsSearch = (q) => `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(q)}&title=Special:MediaSearch&type=image`;
