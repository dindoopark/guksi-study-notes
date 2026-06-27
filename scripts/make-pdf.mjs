#!/usr/bin/env node
// HTML 학습노트 → PDF 변환 스크립트 (Playwright + Chromium)
// 사용: node scripts/make-pdf.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pwPath = process.env.PLAYWRIGHT_PKG || '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = require(pwPath);
import { readdirSync, mkdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join, basename } from 'path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, 'pdf');
mkdirSync(outDir, { recursive: true });

// 변환 대상: 모든 콘텐츠 HTML (index.html 제외)
const files = readdirSync(root)
  .filter((f) => f.endsWith('.html') && f !== 'index.html')
  .sort();

// 한글 폰트를 Noto Sans CJK KR로 확실히 고정 + 인쇄 가독성 보정
const fontFix = `
  *{ font-family:"Noto Sans CJK KR","NanumGothic",sans-serif !important; }
  body{ font-size:11pt !important; }
`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.emulateMedia({ media: 'print' });

for (const f of files) {
  const url = pathToFileURL(join(root, f)).href;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: fontFix });
  const out = join(outDir, basename(f, '.html') + '.pdf');
  await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate:
      '<div style="font-size:8px;width:100%;text-align:center;color:#888;">' +
      '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });
  console.log('✓', basename(out));
}

await browser.close();
console.log('\n완료: pdf/ 폴더에', files.length, '개 PDF 생성');
