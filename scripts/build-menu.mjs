#!/usr/bin/env node
// scripts/build-menu.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const data = JSON.parse(readFileSync(resolve(root, "evie-menu.json"), "utf8"));

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
const money = (n, from) => `${from ? "from " : ""}$${n}`;

function renderItem(it) {
  const price = it.price != null ? `<span class="price">${money(it.price, it.from)}</span>` : "";
  const unit  = it.unit ? `<span class="unit"> / ${esc(it.unit)}</span>` : "";
  const note  = it.note ? `<p class="item-note">${esc(it.note)}</p>` : "";
  const inc   = it.includes
    ? `<ul class="includes">${it.includes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`
    : "";
  return `<article class="item${it.modifier ? " modifier" : ""}">
    <header><h3>${esc(it.name)}</h3>${price}${unit}</header>
    ${inc}${note}
  </article>`;
}

const sections = data.sections.map(s => `
  <section id="${esc(s.id)}" class="menu-section">
    <h2>${esc(s.title)}</h2>
    ${s.note ? `<p class="section-note">${esc(s.note)}</p>` : ""}
    <div class="items">${s.items.map(renderItem).join("")}</div>
  </section>`).join("");

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kissed by Evie — Menu</title>
<link rel="stylesheet" href="style.css">
</head><body>
<header class="hero" style="background-image:url('${esc(data.hero.image)}')">
  <h1>${esc(data.hero.tagline)}</h1>
</header>
<main class="menu">${sections}</main>
<footer><small>Menu ${esc(data.version)}</small></footer>
</body></html>`;

writeFileSync(resolve(root, "menu.generated.html"), html);
writeFileSync(resolve(root, "menu.generated.js"),
  `// AUTO-GENERATED from evie-menu.json — do not edit\nexport const MENU = ${JSON.stringify(data, null, 2)};\n`);
console.log(`Built ${data.sections.length} sections, ${data.sections.reduce((a,s)=>a+s.items.length,0)} items.`);