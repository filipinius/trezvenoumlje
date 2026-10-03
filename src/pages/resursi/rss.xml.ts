import rss from '@astrojs/rss';
import { getArticles } from '../../lib/content';
import { RESOURCES_INTRO } from '../../lib/resursi';
import { abs } from '../../lib/site';

export async function GET() {
  const articles = await getArticles();
  return rss({
    title: 'Trezvene misli – Trezvenoumlje',
    description: RESOURCES_INTRO,
    site: abs('/resursi/'),
    customData: '<language>sr</language>',
    items: articles.map(({ data }) => ({
      title: data.naslov,
      description: data.sazetak,
      link: abs(`/resursi/${data.slug}/`),
      ...(data.datum ? { pubDate: data.datum } : {}),
    })),
  });
}
