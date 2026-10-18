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
const seenIds = new Set();
let linkCount = 0;

if (!Array.isArray(data)) {
  console.error('✗ data/data.json 最外層必須是陣列');
  process.exit(1);
}

const normalizeName = value => value.trim().toLocaleLowerCase();

const addLink = (link, location) => {
  linkCount++;
  if (!link || typeof link !== 'object' || Array.isArray(link)) {
    errors.push(`${location}: 連結項目必須是物件`);
    return;
  }

  if (link.id != null) {
    if (typeof link.id !== 'string' || !link.id.trim()) {
      errors.push(`${location}: id 必須是非空字串`);
    } else if (seenIds.has(link.id)) {
      errors.push(`${location}: 網站 ID 重複：${link.id}`);
    } else {
      seenIds.add(link.id);
    }
  }

  if (typeof link.title !== 'string' || !link.title.trim() || link.title.length > 80) {
    errors.push(`${location}: title 必須是 1 到 80 個字元的非空字串`);
  }

  if (typeof link.url !== 'string' || !link.url.trim()) {
    errors.push(`${location}: url 必須是有效的 HTTP 或 HTTPS 網址`);
  } else {
    try {
      const url = new URL(link.url.trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        errors.push(`${location}: url 僅接受不含帳號密碼的 HTTP 或 HTTPS 網址`);
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
  } else if ((link.description ?? '').length > 240) {
    errors.push(`${location}: description 不得超過 240 個字元`);
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
    errors.push(`${where}: 缺少有效 taxonomy`);
  } else {
    const taxonomyKey = normalizeName(section.taxonomy);
    if (taxonomies.has(taxonomyKey)) {
      errors.push(`${where}: 主要分類名稱重複：${section.taxonomy}`);
    } else {
      taxonomies.add(taxonomyKey);
    }
  }

  if (Object.prototype.hasOwnProperty.call(section, 'list') && !Array.isArray(section.list)) {
    errors.push(`${where}.list: 必須是陣列`);
    return;
  }

  if (Array.isArray(section.list)) {
    const terms = new Set();
    section.list.forEach((group, j) => {
      const groupWhere = `${where}.list[${j}]`;
      if (!group || typeof group !== 'object' || Array.isArray(group)) {
        errors.push(`${groupWhere}: 子分類必須是物件`);
        return;
      }

      if (typeof group.term !== 'string' || !group.term.trim() || group.term.length > 80) {
        errors.push(`${groupWhere}: term 必須是 1 到 80 個字元的非空字串`);
      } else {
        const termKey = normalizeName(group.term);
        if (terms.has(termKey)) {
          errors.push(`${where}: 子分類名稱重複：${group.term}`);
        } else {
          terms.add(termKey);
        }
      }

      if (!Array.isArray(group.links)) {
        errors.push(`${groupWhere}.links: 必須是陣列`);
        return;
      }
      group.links.forEach((link, k) => addLink(link, `${groupWhere}.links[${k}]`));
    });
  } else if (Array.isArray(section.links)) {
    section.links.forEach((link, j) => addLink(link, `${where}.links[${j}]`));
  } else {
    errors.push(`${where}: 必須包含 links 或 list 陣列`);
  }
});

for (const warning of warnings) console.warn(`⚠ ${warning}`);
for (const error of errors) console.error(`✗ ${error}`);

console.log(`\n資料檢查：${data.length} 個分類、${linkCount} 筆連結、${errors.length} 個錯誤、${warnings.length} 個提醒`);
if (errors.length) process.exit(1);
console.log('✓ NAV 資料結構檢查通過');
