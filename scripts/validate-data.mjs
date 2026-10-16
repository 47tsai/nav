import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve('data/data.json');
let data;
try {
  data = JSON.parse(readFileSync(file, 'utf8'));
} catch (error) {
  console.error(`✗ 無法解析 ${file}: ${error.message}`);
  process.exit(1);
}

const errors = [];
const warnings = [];
const seenUrls = new Map();
let linkCount = 0;

if (!Array.isArray(data)) {
  console.error('✗ data/data.json 最外層必須是陣列');
  process.exit(1);
}

const addLink = (link, location) => {
  linkCount++;
  if (!link || typeof link !== 'object' || Array.isArray(link)) {
    errors.push(`${location}: 連結項目必須是物件`);
    return;
  }
  if (typeof link.title !== 'string' || !link.title.trim()) {
    errors.push(`${location}: 缺少有效 title`);
  }
  if (typeof link.url !== 'string' || !link.url.trim()) {
    if (!link.is_copy) errors.push(`${location}: 缺少有效 url`);
  } else {
    try {
      const url = new URL(link.url);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push(`${location}: 不支援的 URL 協定 ${url.protocol}`);
      } else {
        const normalized = url.href.replace(/\/$/, '');
        if (seenUrls.has(normalized)) {
          warnings.push(`重複網址：${link.title}（也出現在 ${seenUrls.get(normalized)}）`);
        } else {
          seenUrls.set(normalized, location);
        }
      }
    } catch {
      errors.push(`${location}: URL 格式無效：${link.url}`);
    }
  }
  if (link.description != null && typeof link.description !== 'string') {
    errors.push(`${location}: description 必須是字串`);
  }
};

const taxonomies = new Set();
data.forEach((section, i) => {
  const where = `data[${i}]`;
  if (!section || typeof section !== 'object' || Array.isArray(section)) {
    errors.push(`${where}: 分類必須是物件`);
    return;
  }
  if (typeof section.taxonomy !== 'string' || !section.taxonomy.trim()) {
    errors.push(`${where}: 缺少 taxonomy`);
  } else if (taxonomies.has(section.taxonomy)) {
    warnings.push(`分類名稱重複：${section.taxonomy}`);
  } else {
    taxonomies.add(section.taxonomy);
  }

  if (Array.isArray(section.links)) {
    section.links.forEach((link, j) => addLink(link, `${where}.links[${j}]`));
  } else if (Array.isArray(section.list)) {
    const terms = new Set();
    section.list.forEach((group, j) => {
      const groupWhere = `${where}.list[${j}]`;
      if (!group || typeof group !== 'object' || Array.isArray(group)) {
        errors.push(`${groupWhere}: 子分類必須是物件`);
        return;
      }
      if (typeof group.term !== 'string' || !group.term.trim()) {
        errors.push(`${groupWhere}: 缺少 term`);
      } else if (terms.has(group.term)) {
        warnings.push(`${where}: 子分類名稱重複：${group.term}`);
      } else {
        terms.add(group.term);
      }
      if (!Array.isArray(group.links)) {
        errors.push(`${groupWhere}.links: 必須是陣列`);
        return;
      }
      group.links.forEach((link, k) => addLink(link, `${groupWhere}.links[${k}]`));
    });
  } else {
    errors.push(`${where}: 必須包含 links 或 list 陣列`);
  }
});

for (const warning of warnings) console.warn(`⚠ ${warning}`);
for (const error of errors) console.error(`✗ ${error}`);

console.log(`\n資料檢查：${data.length} 個分類、${linkCount} 筆連結、${errors.length} 個錯誤、${warnings.length} 個提醒`);
if (errors.length) process.exit(1);
console.log('✓ NAV 資料結構檢查通過');
