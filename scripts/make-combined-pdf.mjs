#!/usr/bin/env node
// 계통별 노트를 PART 단위로 묶어 "합본 PDF" 생성
// 사용: node scripts/make-combined-pdf.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pwPath = process.env.PLAYWRIGHT_PKG || '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = require(pwPath);
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, 'pdf');
mkdirSync(outDir, { recursive: true });

// 합본 그룹 정의
const groups = [
  {
    out: 'part1_국시정리_전체.pdf',
    title: '① 국시 정리 — 계통별 핵심 요약 (통합본)',
    sub: '임상전문간호사 국가시험 대비 학습노트 · 질환 카드 169개',
    files: [
      'guksi_01_순환기계', 'guksi_02_호흡기계', 'guksi_03_신경계',
      'guksi_04_근골격계', 'guksi_05_소화기계', 'guksi_06_신장비뇨생식기계',
      'guksi_07_내분비계', 'guksi_08_혈액면역', 'guksi_09_병태생리약리',
      'guksi_10_간호관리보건의료',
    ],
  },
  {
    out: 'part2_문제집_전체.pdf',
    title: '② PART II 전문실무영역 — 계통별 문제집 (통합본)',
    sub: '임상전문간호사 국가시험 대비 학습노트 · 문항 카드 753개',
    files: [
      'part2_CH05_순환기계', 'part2_CH06_호흡기계', 'part2_CH07_신경계',
      'part2_CH08_근골격계', 'part2_CH09_소화기계', 'part2_CH10_내분비계',
      'part2_CH11_신장혈액면역기타',
    ],
  },
];

const fontFix = `
  *{ font-family:"Noto Sans CJK KR","NanumGothic",sans-serif !important; }
  body{ font-size:11pt !important; }
  .chapter-break{ page-break-before:always; }
  .cover{ page-break-after:always; min-height:88vh; display:flex; flex-direction:column;
    justify-content:center; align-items:flex-start; gap:14px; padding:0 8px; }
  .cover h1{ font-size:30px; color:#2f6fb3; margin:0; border:none; }
  .cover p{ font-size:15px; color:#5b6472; margin:0; }
  .cover .rule{ width:80px; height:5px; background:#0f8a6b; border-radius:3px; }
`;

function sharedHead(html) {
  return html.slice(html.indexOf('<style>'), html.indexOf('</style>') + 8);
}
function innerBody(html) {
  const a = html.indexOf('<body>') + '<body>'.length;
  const b = html.lastIndexOf('</body>');
  return html.slice(a, b);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.emulateMedia({ media: 'print' });

for (const g of groups) {
  const first = readFileSync(join(root, g.files[0] + '.html'), 'utf8');
  const head = sharedHead(first);
  const cover =
    `<section class="cover"><div class="rule"></div>` +
    `<h1>${g.title}</h1><p>${g.sub}</p>` +
    `<p style="font-size:13px;color:#8a9099;">밑줄·인쇄용 합본 PDF</p></section>`;
  const bodies = g.files
    .map((f, i) => {
      const inner = innerBody(readFileSync(join(root, f + '.html'), 'utf8'));
      return i === 0 ? inner : `<div class="chapter-break"></div>${inner}`;
    })
    .join('\n');

  const combined =
    `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">${head}</head>` +
    `<body>${cover}${bodies}</body></html>`;

  // 상대경로 이미지가 풀리도록 저장소 루트에 임시 파일로 기록 후 렌더
  const tmp = join(root, '.__combined_tmp.html');
  writeFileSync(tmp, combined);
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: fontFix });
  await page.pdf({
    path: join(outDir, g.out),
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate:
      '<div style="font-size:8px;width:100%;text-align:center;color:#888;">' +
      '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });
  console.log('✓', g.out, `(${g.files.length}개 계통 합본)`);
}

// 임시 파일 정리
import { rmSync } from 'fs';
try { rmSync(join(root, '.__combined_tmp.html')); } catch {}

await browser.close();
console.log('\n완료: 합본 PDF 2개 생성');
