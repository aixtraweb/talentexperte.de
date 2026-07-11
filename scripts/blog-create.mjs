#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const date = getArgValue('--date') || new Date().toISOString().slice(0, 10);
const jsonMode = args.has('--json');
const publicMode = args.has('--public');
const topic = selectTopic(date);
const article = buildArticle(topic, date);
const targetDir = publicMode ? path.join(root, 'blog') : path.join(root, 'drafts', 'blog');
fs.mkdirSync(targetDir, { recursive: true });

const htmlPath = path.join(targetDir, `${article.slug}.html`);
const mdPath = path.join(targetDir, `${article.slug}.md`);
fs.writeFileSync(mdPath, toMarkdown(article));
fs.writeFileSync(htmlPath, toHtml(article));

if (publicMode) updateBlogIndex(article);

const result = {
  date,
  title: article.title,
  slug: article.slug,
  description: article.description,
  htmlPath,
  markdownPath: mdPath,
  publicUrl: `${publicBaseUrl()}/blog/${article.slug}.html`,
  topicKey: topic.key
};

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Blog ${publicMode ? 'created' : 'drafted'}: ${htmlPath}`);
}

function getArgValue(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

function publicBaseUrl() {
  return process.env.PUBLIC_BASE_URL || 'https://www.talentexperte.de';
}

function selectTopic(isoDate) {
  const topics = [
    {
      key: 'sommercamp-selbstvertrauen',
      slug: 'sommercamp-aachen-selbstvertrauen',
      title: 'Wie ein Fußballcamp Kindern Selbstvertrauen schenkt',
      description: 'Warum Fußballferien Kindern Mut, Freundschaften und Erfolgserlebnisse geben können.',
      image: '/images/social-output/2026-05-10-sommercamp-team-v3.jpg',
      angle: 'Selbstvertrauen'
    },
    {
      key: 'ferien-mit-struktur',
      slug: 'fussballcamp-aachen-ferien-mit-struktur',
      title: 'Ferien mit Struktur: Warum ein gutes Fußballcamp Eltern entlastet',
      description: 'Ein gutes Feriencamp verbindet Betreuung, Bewegung und verlässliche Tageszeiten.',
      image: '/images/social-output/2026-05-09-sommercamp-action-v2.jpg',
      angle: 'Betreuung'
    },
    {
      key: 'neue-freunde',
      slug: 'fussballcamp-aachen-neue-freunde',
      title: 'Neue Freunde, neue Energie: Was Kinder im Fußballcamp erleben',
      description: 'Im Fußballcamp entstehen gemeinsame Erlebnisse, die weit über das Training hinausgehen.',
      image: '/images/social-output/sommercamp-2026-start.jpg',
      angle: 'Freunde'
    },
    {
      key: 'technik-spiel-spass',
      slug: 'fussballcamp-aachen-technik-spiel-spass',
      title: 'Technik, Spiel und Spaß: So fühlt sich ein guter Camp-Tag an',
      description: 'Ein Blick darauf, wie Fußballtraining, Spiel und Ferienfreude zusammenfinden.',
      image: '/images/social-output/sommercamp-2026-action.jpg',
      angle: 'Training'
    }
  ];
  const week = weekNumber(new Date(`${isoDate}T12:00:00+02:00`));
  return topics[week % topics.length];
}

function weekNumber(dateObj) {
  const d = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function buildArticle(topic, isoDate) {
  return {
    ...topic,
    date: isoDate,
    canonical: `${publicBaseUrl()}/blog/${topic.slug}.html`,
    sections: [
      {
        heading: 'Ferien, die Kindern in Erinnerung bleiben',
        body: [
          'Gute Ferienangebote erkennt man nicht nur daran, dass Kinder beschäftigt sind. Entscheidend ist, was sie aus einem Tag mitnehmen: Bewegung, Begegnung, Erfolgserlebnisse und das Gefühl, Teil einer Gruppe zu sein.',
          'Genau hier setzt ein Fußballcamp an. Kinder erleben klare Abläufe, gemeinsame Übungen, kleine Herausforderungen und viele Momente, in denen sie merken: Ich traue mir etwas zu.'
        ]
      },
      {
        heading: 'Warum Fußball so gut funktioniert',
        body: [
          'Fußball ist niedrigschwellig. Ein Ball reicht, und Kinder sind schnell im Spiel. Gleichzeitig lernen sie, aufeinander zu achten, Entscheidungen zu treffen und sich nach Fehlern wieder neu zu konzentrieren.',
          'Gerade in den Ferien ist diese Mischung wertvoll: genug Struktur, aber kein Schulgefühl. Training, Spiele und Pausen ergeben einen Tag, der aktiv ist und trotzdem nach Ferien klingt.'
        ]
      },
      {
        heading: 'Was Eltern wichtig ist',
        body: [
          'Eltern brauchen Verlässlichkeit. Unsere Sommercamps sind für Kinder von 5 bis 14 Jahren gedacht und laufen täglich von 09:00 bis 15:00 Uhr. Mittagessen, Getränke und Obst sind inklusive.',
          'Das schafft Planungssicherheit und gibt Kindern zugleich einen vollständigen Ferientag mit Sport, Betreuung und Gemeinschaft.'
        ]
      },
      {
        heading: 'Für Anfänger und Vereinsspieler',
        body: [
          'Ein gutes Camp nimmt Kinder dort auf, wo sie stehen. Manche kommen mit viel Vereinserfahrung, andere möchten Fußball einfach ausprobieren. Entscheidend ist, dass jedes Kind Aufgaben bekommt, die fordern, aber nicht überfordern.',
          'So entstehen Fortschritte, die Kinder spüren: ein besserer erster Kontakt, ein mutiger Torschuss, ein gelungenes Dribbling oder ein Moment, in dem ein Team zusammenhält.'
        ]
      }
    ],
    ctaTitle: 'Sommercamp 2026 in Aachen',
    ctaText: 'Vier Tage Fußball, Freunde und Ferienfreude für Kinder von 5 bis 14 Jahren.',
    ctaUrl: '/anmeldung.html'
  };
}

function toMarkdown(article) {
  return [
    `# ${article.title}`,
    '',
    article.description,
    '',
    ...article.sections.flatMap((section) => [
      `## ${section.heading}`,
      '',
      ...section.body.flatMap((paragraph) => [paragraph, ''])
    ]),
    `## ${article.ctaTitle}`,
    '',
    `${article.ctaText} Anmeldung: ${publicBaseUrl()}${article.ctaUrl}`,
    ''
  ].join('\n');
}

function toHtml(article) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.date,
    mainEntityOfPage: article.canonical,
    image: `${publicBaseUrl()}${article.image}`,
    author: { '@type': 'Organization', name: 'TALENTEXPERTE' },
    publisher: {
      '@type': 'Organization',
      name: 'TALENTEXPERTE',
      logo: { '@type': 'ImageObject', url: `${publicBaseUrl()}/ci/logo.png` }
    }
  };
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(article.title)} | TALENTEXPERTE</title>
<meta name="description" content="${escapeHtml(article.description)}">
<link rel="canonical" href="${article.canonical}">
<link rel="stylesheet" href="/css/fonts.css">
<link rel="stylesheet" href="/css/main.css">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(article.title)}">
<meta property="og:description" content="${escapeHtml(article.description)}">
<meta property="og:url" content="${article.canonical}">
<meta property="og:image" content="${publicBaseUrl()}${article.image}">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
<main class="content-page">
  <article class="container" style="max-width: 880px; padding: 48px 20px;">
    <p><a href="/">TALENTEXPERTE</a> / Blog</p>
    <h1>${escapeHtml(article.title)}</h1>
    <p><strong>${escapeHtml(article.description)}</strong></p>
    <img src="${article.image}" alt="${escapeHtml(article.title)}" style="width:100%;height:auto;border-radius:12px;margin:24px 0;">
    ${article.sections.map((section) => `
    <section>
      <h2>${escapeHtml(section.heading)}</h2>
      ${section.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n      ')}
    </section>`).join('\n')}
    <section style="margin-top:36px;padding:24px;border:1px solid #ddd;border-radius:12px;">
      <h2>${escapeHtml(article.ctaTitle)}</h2>
      <p>${escapeHtml(article.ctaText)}</p>
      <p><a href="${article.ctaUrl}">Jetzt anmelden</a></p>
    </section>
  </article>
</main>
</body>
</html>
`;
}

function updateBlogIndex(article) {
  const indexPath = path.join(root, 'blog', 'index.html');
  const entry = `<li><a href="/blog/${article.slug}.html">${escapeHtml(article.title)}</a> <span>${article.date}</span></li>`;
  let html = '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Blog | TALENTEXPERTE</title><link rel="stylesheet" href="/css/main.css"></head><body><main class="container" style="max-width:880px;padding:48px 20px;"><h1>Blog</h1><ul>\n<!-- BLOG_ENTRIES -->\n</ul></main></body></html>\n';
  if (fs.existsSync(indexPath)) html = fs.readFileSync(indexPath, 'utf8');
  if (!html.includes(`/blog/${article.slug}.html`)) {
    html = html.replace('<!-- BLOG_ENTRIES -->', `${entry}\n<!-- BLOG_ENTRIES -->`);
  }
  fs.writeFileSync(indexPath, html);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
