import { uuid } from '@/lib/crypto';
import type { TrafficTemplate } from '@/lib/data-amplifier';
import prisma from '@/lib/prisma';

type WebsiteRecord = {
  id: string;
  domain?: string | null;
};

type GeneratedPage = {
  path: string;
  title: string;
};

type VisitGenerationOptions = {
  template?: string | null;
  timeWindowMinutes?: number;
};

type TemplateDefinition = {
  browsers: string[];
  countries: string[];
  devices: string[];
  languages: string[];
  pageviews: { min: number; max: number };
  referrers: Array<string | null>;
  page: () => GeneratedPage;
};

const BROWSERS = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
const OS_LIST = ['Windows', 'macOS', 'Linux', 'Android', 'iOS'];
const DEVICES = ['desktop', 'mobile', 'tablet'];
const COUNTRIES = ['US', 'CN', 'GB', 'DE', 'FR', 'JP', 'KR', 'CA', 'AU', 'IN'];
const LANGUAGES = ['en-US', 'zh-CN', 'en-GB', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR'];

const SEARCH_ENGINES = ['google.com', 'bing.com', 'baidu.com', 'sogou.com', 'duckduckgo.com'];
const SOCIAL_REFERRERS = ['facebook.com', 'twitter.com', 'linkedin.com', 'reddit.com', 'youtube.com'];

const MOVIE_NAMES = [
  '暗夜追踪',
  '城市边缘',
  '星河旅人',
  '夏日回声',
  '风暴档案',
  '重启人生',
  '孤岛计划',
  '时间之外',
];
const MOVIE_TERMS = ['动作片', '喜剧片', '悬疑片', '国产剧', '韩剧', '动漫', '综艺', '最新电影'];

const BLOG_SLUGS = [
  'nextjs-performance-notes',
  'docker-deploy-checklist',
  'weekly-reading-list',
  'product-design-review',
  'postgres-index-guide',
  'remote-work-notes',
  'frontend-state-patterns',
  'personal-knowledge-base',
];

const SHOP_SLUGS = [
  'wireless-keyboard-pro',
  'portable-monitor-15',
  'usb-c-dock-station',
  'noise-cancel-headphones',
  'standing-desk-mat',
  'smart-led-light',
  'travel-backpack',
  'mechanical-switch-set',
];

const FORUM_TOPICS = [
  'docker-upgrade-failed',
  'best-vps-provider',
  'nextjs-cache-question',
  'postgres-backup-plan',
  'movie-site-seo',
  'analytics-traffic-growth',
  'cdn-config-share',
  'server-security-basic',
];

const GENERAL_PAGES = [
  { path: '/', title: '首页' },
  { path: '/about', title: '关于我们' },
  { path: '/contact', title: '联系我们' },
  { path: '/products', title: '产品' },
  { path: '/blog', title: '博客' },
  { path: '/services', title: '服务' },
  { path: '/pricing', title: '价格' },
  { path: '/features', title: '功能' },
  { path: '/docs', title: '文档' },
  { path: '/support', title: '支持' },
];

export const GENERATOR_TICKS_PER_HOUR = 12;

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomRecentDate(windowMinutes = 5) {
  const safeWindowMinutes = Math.max(1, windowMinutes);
  return new Date(Date.now() - Math.floor(Math.random() * safeWindowMinutes * 60_000));
}

function normalizeTemplate(template?: string | null): TrafficTemplate {
  if (template === 'blog' || template === 'forum' || template === 'movie' || template === 'shop') {
    return template;
  }

  return 'general';
}

function buildMoviePage(): GeneratedPage {
  const id = randomInt(1000, 9999);
  const name = randomChoice(MOVIE_NAMES);
  const pick = Math.random();

  if (pick < 0.5) {
    const line = randomInt(1, 3);
    const episode = randomInt(1, 36);

    return {
      path: `/vodplay/${id}-${line}-${episode}.html`,
      title: `${name} 第${episode}集 在线观看`,
    };
  }

  if (pick < 0.75) {
    return {
      path: `/voddetail/${id}.html`,
      title: `${name} 高清详情`,
    };
  }

  if (pick < 0.9) {
    const typeId = randomInt(1, 20);

    return {
      path: `/vodtype/${typeId}.html`,
      title: randomChoice(MOVIE_TERMS),
    };
  }

  const keyword = encodeURIComponent(randomChoice(MOVIE_TERMS));

  return {
    path: `/vodsearch?wd=${keyword}`,
    title: `搜索 ${decodeURIComponent(keyword)}`,
  };
}

function buildBlogPage(): GeneratedPage {
  const slug = randomChoice(BLOG_SLUGS);
  const pick = Math.random();

  if (pick < 0.65) {
    return {
      path: `/posts/${slug}`,
      title: slug
        .split('-')
        .map(word => word[0].toUpperCase() + word.slice(1))
        .join(' '),
    };
  }

  if (pick < 0.85) {
    const category = randomChoice(['engineering', 'notes', 'product', 'life', 'tutorials']);

    return {
      path: `/category/${category}`,
      title: `${category} 分类`,
    };
  }

  return randomChoice([
    { path: '/', title: '首页' },
    { path: '/archive', title: '归档' },
    { path: '/tags', title: '标签' },
    { path: '/about', title: '关于' },
  ]);
}

function buildShopPage(): GeneratedPage {
  const slug = randomChoice(SHOP_SLUGS);
  const pick = Math.random();

  if (pick < 0.55) {
    return {
      path: `/products/${slug}`,
      title: slug
        .split('-')
        .map(word => word[0].toUpperCase() + word.slice(1))
        .join(' '),
    };
  }

  if (pick < 0.75) {
    const category = randomChoice(['keyboards', 'monitors', 'audio', 'office', 'travel']);

    return {
      path: `/collections/${category}`,
      title: `${category} 商品列表`,
    };
  }

  return randomChoice([
    { path: '/', title: '商城首页' },
    { path: '/cart', title: '购物车' },
    { path: '/search?q=keyboard', title: '搜索 keyboard' },
    { path: '/account/login', title: '会员登录' },
  ]);
}

function buildForumPage(): GeneratedPage {
  const topic = randomChoice(FORUM_TOPICS);
  const topicId = randomInt(10000, 99999);
  const pick = Math.random();

  if (pick < 0.65) {
    return {
      path: `/t/${topic}/${topicId}`,
      title: topic.replace(/-/g, ' '),
    };
  }

  if (pick < 0.85) {
    const category = randomChoice(['server', 'webmaster', 'seo', 'dev', 'chat']);

    return {
      path: `/c/${category}`,
      title: `${category} 版块`,
    };
  }

  return randomChoice([
    { path: '/', title: '社区首页' },
    { path: '/latest', title: '最新主题' },
    { path: '/popular', title: '热门讨论' },
    { path: '/search?q=docker', title: '搜索 docker' },
  ]);
}

function buildGeneralPage(): GeneratedPage {
  return randomChoice(GENERAL_PAGES);
}

const TEMPLATE_DEFINITIONS: Record<TrafficTemplate, TemplateDefinition> = {
  general: {
    browsers: BROWSERS,
    countries: COUNTRIES,
    devices: DEVICES,
    languages: LANGUAGES,
    pageviews: { min: 1, max: 5 },
    referrers: [...SEARCH_ENGINES, ...SOCIAL_REFERRERS, null, null, null],
    page: buildGeneralPage,
  },
  movie: {
    browsers: ['Chrome', 'Safari', 'Edge', 'Firefox', 'Chrome'],
    countries: ['CN', 'US', 'TW', 'HK', 'SG', 'MY', 'JP', 'KR'],
    devices: ['mobile', 'mobile', 'desktop', 'tablet'],
    languages: ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR'],
    pageviews: { min: 2, max: 9 },
    referrers: ['baidu.com', 'sogou.com', 'bing.com', 'google.com', 'm.baidu.com', null, null],
    page: buildMoviePage,
  },
  blog: {
    browsers: ['Chrome', 'Safari', 'Firefox', 'Edge'],
    countries: ['US', 'CN', 'GB', 'DE', 'CA', 'AU', 'SG'],
    devices: ['desktop', 'desktop', 'mobile', 'tablet'],
    languages: ['en-US', 'zh-CN', 'en-GB', 'de-DE'],
    pageviews: { min: 1, max: 4 },
    referrers: ['google.com', 'bing.com', 'twitter.com', 'linkedin.com', 'news.ycombinator.com', null],
    page: buildBlogPage,
  },
  shop: {
    browsers: ['Chrome', 'Safari', 'Edge', 'Firefox'],
    countries: ['US', 'CN', 'GB', 'CA', 'AU', 'DE', 'FR'],
    devices: ['mobile', 'desktop', 'mobile', 'tablet'],
    languages: ['en-US', 'zh-CN', 'en-GB', 'de-DE', 'fr-FR'],
    pageviews: { min: 2, max: 7 },
    referrers: ['google.com', 'bing.com', 'facebook.com', 'instagram.com', 'youtube.com', null],
    page: buildShopPage,
  },
  forum: {
    browsers: ['Chrome', 'Firefox', 'Edge', 'Safari'],
    countries: ['CN', 'US', 'SG', 'HK', 'TW', 'MY', 'GB'],
    devices: ['desktop', 'mobile', 'desktop', 'mobile'],
    languages: ['zh-CN', 'zh-TW', 'en-US', 'en-GB'],
    pageviews: { min: 2, max: 6 },
    referrers: ['google.com', 'bing.com', 'baidu.com', 'reddit.com', 'twitter.com', null, null],
    page: buildForumPage,
  },
};

export function getVisitsForTick(visitsPerHour: number) {
  if (!Number.isFinite(visitsPerHour) || visitsPerHour <= 0) {
    return 0;
  }

  const expectedVisits = visitsPerHour / GENERATOR_TICKS_PER_HOUR;
  const baseVisits = Math.floor(expectedVisits);
  const fractionalVisitChance = expectedVisits - baseVisits;
  const jitter = baseVisits > 0 && Math.random() < 0.3 ? Math.floor(Math.random() * 3) - 1 : 0;

  return Math.max(0, baseVisits + (Math.random() < fractionalVisitChance ? 1 : 0) + jitter);
}

export async function generateFakeVisit(
  websiteId: string,
  website?: WebsiteRecord,
  options: VisitGenerationOptions = {},
) {
  const sessionId = uuid();
  const visitId = uuid();
  const template = TEMPLATE_DEFINITIONS[normalizeTemplate(options.template)];
  const createdAt = randomRecentDate(options.timeWindowMinutes);
  const pageviewCount = randomInt(template.pageviews.min, template.pageviews.max);

  await prisma.client.session.create({
    data: {
      id: sessionId,
      websiteId,
      browser: randomChoice(template.browsers),
      os: randomChoice(OS_LIST),
      device: randomChoice(template.devices),
      screen: randomChoice(['390x844', '414x896', '1366x768', '1440x900', '1920x1080']),
      language: randomChoice(template.languages),
      country: randomChoice(template.countries),
      createdAt,
    },
  });

  for (let index = 0; index < pageviewCount; index++) {
    const page = template.page();
    const referrerDomain = index === 0 ? randomChoice(template.referrers) : null;

    await prisma.client.websiteEvent.create({
      data: {
        id: uuid(),
        websiteId,
        sessionId,
        visitId,
        urlPath: page.path,
        pageTitle: page.title,
        referrerDomain: referrerDomain || undefined,
        eventType: 1,
        createdAt: new Date(createdAt.getTime() + index * randomInt(15_000, 75_000)),
        hostname: website?.domain || 'example.com',
      },
    });
  }

  return pageviewCount;
}

export async function generateBatchFakeVisits(
  websiteId: string,
  count: number,
  options: VisitGenerationOptions = {},
) {
  if (count <= 0) {
    return { visits: 0, pageviews: 0 };
  }

  const website = await prisma.client.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) {
    throw new Error(`Website ${websiteId} not found`);
  }

  let pageviews = 0;

  for (let index = 0; index < count; index++) {
    pageviews += await generateFakeVisit(websiteId, website, options);
  }

  return { visits: count, pageviews };
}

export async function runFakeVisitGenerator() {
  const configs = await prisma.client.dataAmplifierConfig.findMany({
    where: {
      enabled: true,
      generateFakeVisits: true,
    },
  });

  if (configs.length === 0) {
    console.log('[Data Amplifier] No websites enabled for fake visits.');
    return;
  }

  for (const config of configs) {
    const visitsToGenerate = getVisitsForTick(config.fakeVisitsPerHour);

    if (visitsToGenerate <= 0) {
      console.log(
        `[Data Amplifier] Skipped ${config.websiteId}; fake visits per hour is ${config.fakeVisitsPerHour}.`,
      );
      continue;
    }

    const result = await generateBatchFakeVisits(config.websiteId, visitsToGenerate, {
      template: config.trafficTemplate,
      timeWindowMinutes: 5,
    });

    console.log(
      `[Data Amplifier] Generated ${result.visits} visits and ${result.pageviews} pageviews for ${config.websiteId}`,
    );
  }
}
