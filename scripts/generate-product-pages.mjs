import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function loadSite(){
 const config=JSON.parse(fs.readFileSync(path.join(root,'site-config.json'),'utf8').replace(/^\uFEFF/,''));
 const base=new URL(config.baseUrl);
 if(base.protocol!=='https:'||base.search||base.hash||base.username||base.password||!base.pathname.endsWith('/'))throw Error('Invalid base URL');
 const context={window:{}};vm.createContext(context);
 vm.runInContext(fs.readFileSync(path.join(root,'catalog-core.js'),'utf8'),context);
 vm.runInContext(fs.readFileSync(path.join(root,'catalog-data.js'),'utf8'),context);
 const records=context.window.EtoileProducts,core=context.EtoileCatalog;
 if(!Array.isArray(records))throw Error('Missing product data');
 const eligible=records.filter(p=>p.status==='published'&&p.verified===true),seen=new Set();
 for(const p of eligible){if(seen.has(p.id))throw Error('Duplicate product ID: '+p.id);seen.add(p.id);const errors=core.validate(p);if(errors.length)throw Error(p.id+': '+errors.join(' '));}
 const products=core.publicProducts(records);
 if(products.length!==eligible.length)throw Error('Some eligible products were rejected');
 if(!fs.existsSync(path.join(root,config.homeImage)))throw Error('Missing homepage OG photo');
 for(const p of products)for(const i of p.images)for(const src of [i.src,i.thumbnail].filter(Boolean)){if(!fs.existsSync(path.join(root,src)))throw Error('Missing image: '+src);}
 return {config,base,core,products};
}
export function generate(){
 const {config,base,core,products}=loadSite();
 const absolute=src=>new URL(src,base).href,local=src=>new URL(src,base).pathname,e=escapeHtml;
 const titleFor=p=>p.brand+' · '+(p.code||p.model)+' | Étoile Paraguay';
 const frequencies=new Map();for(const p of products)frequencies.set(titleFor(p),(frequencies.get(titleFor(p))||0)+1);
 const canonicalIds=new Set(products.map(p=>p.id));
 const output=path.join(root,'productos');fs.mkdirSync(output,{recursive:true});
 const manifestPath=path.join(root,'scripts','generated-product-pages.json');
 const previousIds=new Set(fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):[]);
 // Preserve retired pages for rollback, but remove them from the public directory.
 for(const entry of fs.readdirSync(output,{withFileTypes:true}))if(entry.isDirectory()&&!canonicalIds.has(entry.name)){
  if(!previousIds.has(entry.name))throw Error('Unmanaged product directory; preserve and review manually: '+entry.name);
  const source=path.join(output,entry.name),backup=path.join(root,'.generated-page-backups',new Date().toISOString().replaceAll(':','-'),entry.name);
  fs.mkdirSync(path.dirname(backup),{recursive:true});fs.cpSync(source,backup,{recursive:true});fs.rmSync(source,{recursive:true});
 }
 for(const p of products){
  const canonical=absolute('productos/'+p.id+'/');
  const title=frequencies.get(titleFor(p))===1?titleFor(p):p.brand+' · '+(p.code||p.model)+' · '+p.id+' | Étoile Paraguay';
  const category=core.categories.find(c=>c.id===p.category).label,first=p.images[0];
  const schema={'@context':'https://schema.org','@type':'Product','@id':canonical,url:canonical,name:p.brand+' '+(p.model||p.code),description:p.description,brand:{'@type':'Brand',name:p.brand},category,image:p.images.map(i=>absolute(i.src)),productID:p.id};
  if(p.model)schema.model=p.model;
  const json=JSON.stringify(schema).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
  const photo=(i,loading)=>`<img src="${e(local(i.src))}"${i.thumbnail&&i.thumbnailWidth<i.width?` srcset="${e(local(i.thumbnail))} ${i.thumbnailWidth}w, ${e(local(i.src))} ${i.width}w" sizes="(max-width: 800px) 88vw, (max-width: 1100px) 50vw, 600px"`:''} alt="${e(i.alt)}"${i.width&&i.height?` width="${i.width}" height="${i.height}"`:''} loading="${loading}" decoding="async">`;
  const facts=[['Categoría',category],['Marca',p.brand],['Modelo',p.model],['Código',p.code],['Referencia Étoile',p.id],['Estilo',p.tags.join(' · ')]].filter(([,v])=>v).map(([k,v])=>`<div><dt>${e(k)}</dt><dd>${e(v)}</dd></div>`).join('');
  const message=core.productMessage(p);
  const html=`<!doctype html>
<html lang="es-PY"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#000000"><title>${e(title)}</title><meta name="description" content="${e(p.description)}"><link rel="canonical" href="${e(canonical)}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(p.description)}"><meta property="og:url" content="${e(canonical)}"><meta property="og:type" content="product"><meta property="og:image" content="${e(absolute(first.src))}"><link rel="stylesheet" href="${local('style.css')}"><link rel="stylesheet" href="${local('catalog.css')}"><script type="application/ld+json">${json}</script></head>
<body class="product-route"><a class="skip-link" href="#product-detail">Ir al producto</a><header><a class="wordmark" href="${local('')}" aria-label="Étoile inicio">ÉTOILE</a><nav aria-label="Principal"><a href="${local('')}#catalogo">Catálogo</a><a href="${local('')}#descubri">Descubrí tu estilo</a><a href="${local('')}#visita">Visita privada</a></nav><a class="nav-contact" href="https://wa.me/595985562593" target="_blank" rel="noopener noreferrer">Conversemos ↗</a></header>
<main><section id="product-detail" class="product-detail" aria-label="Ficha del producto"><nav class="product-breadcrumb" aria-label="Ruta del producto"><a href="${local('')}#catalogo">← Volver al catálogo</a><span>/ ${e(category)}</span></nav><div class="product-layout"><div class="detail-gallery"><a class="detail-photo-button" href="${e(local(first.src))}" target="_blank" rel="noopener">${photo(first,'eager')}<span>Ampliar imagen ↗</span></a>${p.images.slice(1).map(i=>`<a class="detail-photo-button" href="${e(local(i.src))}" target="_blank" rel="noopener">${photo(i,'lazy')}</a>`).join('')}</div><div class="detail-copy"><p class="eyebrow">${e(p.brand)}</p><h1>${e(p.model||p.code)}</h1><p class="description">${e(p.description)}</p><dl>${facts}</dl><a class="button gold full" href="${e(core.whatsappUrl(message))}" target="_blank" rel="noopener noreferrer">Consultar por WhatsApp ↗</a><p class="small muted">Se abrirá tu consulta con esta pieza identificada. Vos decidís cuándo enviarla.</p><p class="message-preview">${e(message)}</p><a class="text-link" href="${local('')}#visita">Coordiná una visita privada ↗</a></div></div></section></main>
<footer><a class="wordmark" href="${local('')}">ÉTOILE</a><span>Lentes · Relojes · Carteras · Accesorios</span><a href="https://www.instagram.com/etoileparaguay/" target="_blank" rel="noopener">Instagram ↗</a><a href="https://wa.me/595985562593" target="_blank" rel="noopener">+595 985 562 593 ↗</a></footer></body></html>
`;
  const dir=path.join(output,p.id);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),html);
 }
 const urls=[base.href,...products.map(p=>absolute('productos/'+p.id+'/'))];
 fs.writeFileSync(path.join(root,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(u=>`  <url><loc>${e(u)}</loc></url>`).join('\n')+'\n</urlset>\n');
 fs.writeFileSync(path.join(root,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${absolute('sitemap.xml')}\n`);
 fs.writeFileSync(path.join(root,'site-config.js'),'// Generated from site-config.json.\nwindow.EtoileSite = '+JSON.stringify({baseUrl:base.href})+';\n');
 fs.writeFileSync(path.join(root,'.nojekyll'),'');
 const homePath=path.join(root,'index.html');let home=fs.readFileSync(homePath,'utf8');
 home=home.replace(/<link\b[^>]*rel="canonical"[^>]*>/g,'').replace(/<meta\b[^>]*property="og:[^"]+"[^>]*>/g,'');
 const homeTitle=home.match(/<title>([^<]+)<\/title>/)[1],homeDescription=home.match(/<meta name="description" content="([^"]+)"/)[1];
 if(!fs.existsSync(path.join(root,config.homeImage)))throw Error('Missing homepage OG photo');
 home=home.replace('</head>',`<link rel="canonical" href="${e(base.href)}"><meta property="og:title" content="${homeTitle}"><meta property="og:description" content="${homeDescription}"><meta property="og:url" content="${e(base.href)}"><meta property="og:type" content="website"><meta property="og:image" content="${e(absolute(config.homeImage))}"></head>`);
 if(!home.includes('src="site-config.js"'))home=home.replace('<script src="catalog-ui.js"','<script src="site-config.js" defer></script><script src="catalog-ui.js"');
 fs.writeFileSync(homePath,home);
 fs.writeFileSync(manifestPath,JSON.stringify([...canonicalIds],null,2)+'\n');
 return {products:products.length,pages:products.length,sitemapUrls:urls.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(generate()));
