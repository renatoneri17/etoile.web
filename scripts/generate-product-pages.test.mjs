import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {root,loadSite,generate,escapeHtml} from './generate-product-pages.mjs';
const {products:vmProducts,core,base}=loadSite(); const products=JSON.parse(JSON.stringify(vmProducts));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const meta=(html,name)=>{const tag=html.match(new RegExp('<meta (?:name|property)="'+name+'" content="([^"]*)"'));assert.ok(tag,'Missing '+name);return decode(tag[1]);};
const files=()=>['index.html','sitemap.xml','robots.txt','site-config.js','scripts/generated-product-pages.json',...products.map(p=>'productos/'+p.id+'/index.html')];
const digest=()=>crypto.createHash('sha256').update(files().map(f=>read(f)).join('\0')).digest('hex');
test('Every published verified product has one nonempty static page',()=>{
 const entries=fs.readdirSync(path.join(root,'productos'),{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name).sort();
 assert.equal(new Set(products.map(p=>p.id)).size,products.length);
 assert.deepEqual(entries,products.map(p=>p.id).sort());
 for(const p of products){assert.equal(p.status,'published');assert.equal(p.verified,true);assert.ok(read('productos/'+p.id+'/index.html').length>1000);}
});
test('All pages preserve verified facts, images, metadata and exact WhatsApp message',()=>{
 const titles=new Set();const brands=new Map();
 for(const p of products){
  const html=read('productos/'+p.id+'/index.html'),url=new URL('productos/'+p.id+'/',base).href;
  const title=decode(html.match(/<title>([^<]+)<\/title>/)[1]);assert.ok(title.includes(p.brand)&&title.includes(p.code||p.model)&&title.includes('Étoile Paraguay'));assert.ok(!titles.has(title));titles.add(title);
  assert.equal(meta(html,'description'),p.description);assert.equal(meta(html,'og:description'),p.description);assert.equal(meta(html,'og:title'),title);assert.equal(meta(html,'og:type'),'product');assert.equal(meta(html,'og:url'),url);assert.equal(meta(html,'og:image'),new URL(p.images[0].src,base).href);
  assert.equal(decode(html.match(/<link rel="canonical" href="([^"]+)"/)[1]),url);
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);assert.equal(schema['@type'],'Product');assert.equal(schema.url,url);assert.equal(schema.description,p.description);assert.equal(schema.productID,p.id);assert.equal(schema.brand.name,p.brand);assert.deepEqual(schema.image,p.images.map(i=>new URL(i.src,base).href));
  assert.ok(!/"(?:offers|price|priceCurrency|availability|inventoryLevel)"/.test(JSON.stringify(schema)));
  const body=html.slice(html.indexOf('<body'));assert.ok(!body.includes('<script'));assert.ok(body.includes('<h1>'+escapeHtml(p.model||p.code)+'</h1>'));assert.ok(body.includes(escapeHtml(p.description)));assert.ok(body.includes(escapeHtml(p.id)));assert.ok(body.includes(escapeHtml(p.brand)));assert.ok(body.includes(escapeHtml(schema.category)));for(const tag of p.tags)assert.ok(body.includes(escapeHtml(tag)));
  const contact=[...html.matchAll(/href="([^"]+)"/g)].map(m=>decode(m[1])).find(h=>h.startsWith('https://wa.me/')&&h.includes('?text='));assert.equal(contact,core.whatsappUrl(core.productMessage(p)));assert.equal(new URL(contact).searchParams.get('text'),core.productMessage(p));
  const images=[...body.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);assert.equal(images.length,p.images.length);
  p.images.forEach((i,n)=>{assert.ok(images[n].includes('src="'+new URL(i.src,base).pathname+'"'));assert.ok(images[n].includes('alt="'+escapeHtml(i.alt)+'"'));assert.ok(images[n].includes('loading="'+(n===0?'eager':'lazy')+'"'));if(i.width&&i.height){assert.ok(images[n].includes('width="'+i.width+'"'));assert.ok(images[n].includes('height="'+i.height+'"'));}});
  for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){const link=decode(m[1]);if(!link.startsWith('/'))continue;assert.ok(link.startsWith(base.pathname));let rel=new URL(link,base).pathname.slice(base.pathname.length);if(rel.endsWith('/')||rel==='')rel+='index.html';assert.ok(fs.existsSync(path.join(root,rel)),p.id+': '+link);}
  assert.ok(!/[$€£¥₲]|\b(?:precio|precios|usd|pyg|cuotas|stock|disponibilidad|disponibles|existencias)\b/i.test(body));
  if(!brands.has(p.brand))brands.set(p.brand,url);
 }
 assert.ok(brands.size>=3);console.log('Verified examples:',JSON.stringify([...brands].slice(0,3)));
});
test('Sitemap, robots, homepage and static card routes',()=>{
 const urls=[...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>decode(m[1]));assert.equal(urls.length,products.length+1);assert.equal(new Set(urls).size,urls.length);assert.equal(urls[0],base.href);assert.deepEqual(urls.slice(1),products.map(p=>new URL('productos/'+p.id+'/',base).href));
 assert.ok(read('robots.txt').includes('Allow: /'));assert.ok(read('robots.txt').includes('Sitemap: '+new URL('sitemap.xml',base).href));assert.ok(fs.existsSync(path.join(root,'.nojekyll')));
 const home=read('index.html');assert.equal(decode(home.match(/<link rel="canonical" href="([^"]+)"/)[1]),base.href);assert.equal(meta(home,'og:url'),base.href);assert.equal(meta(home,'og:type'),'website');for(const name of ['og:title','og:description','og:image'])assert.ok(meta(home,name));assert.ok(home.indexOf('src="site-config.js"')<home.indexOf('src="catalog-ui.js"'));
 const ui=read('catalog-ui.js');assert.ok(ui.includes("hash.startsWith('#producto/')"));assert.ok(!/href\s*=\s*['"]#producto\//.test(ui));assert.ok(ui.includes('window.EtoileSite.baseUrl'));assert.ok(ui.includes("new URL('productos/'"));
});
test('Existing filtering, search, pagination inputs and WhatsApp are preserved',()=>{
 for(const brand of new Set(products.map(p=>p.brand))){const matches=core.filterProducts(products,{brand});assert.ok(matches.length);assert.ok(matches.every(p=>p.brand===brand));}
 const p=products[0];assert.ok(core.filterProducts(products,{query:p.id}).some(i=>i.id===p.id));
 const ui=read('catalog-ui.js');assert.ok(/pageSize|PAGE_SIZE|perPage/.test(ui));
 for(const file of ['catalog-core.js','catalog-data.js','catalog-ui.js','site-config.js'])new vm.Script(read(file),{filename:file});
});
test('Generator is reproducible',()=>{const before=digest();assert.equal(generate().pages,products.length);assert.equal(digest(),before);});

test('Three distinct brands resolve over HTTP from deep GitHub Pages paths',async()=>{
 const {createServer}=await import('node:http');
 const server=createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(!pathname.startsWith(base.pathname)){res.writeHead(404).end();return;}let relative=pathname.slice(base.pathname.length);if(relative.endsWith('/')||!relative)relative+='index.html';const file=path.join(root,relative);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}res.writeHead(200);fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 try{
  const chosen=[];for(const p of products)if(!chosen.some(c=>c.brand===p.brand)&&chosen.length<3)chosen.push(p);
  for(const p of chosen){const response=await fetch(origin+base.pathname+'productos/'+p.id+'/');assert.equal(response.status,200);const html=await response.text();for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g)){if(!m[1].startsWith('/'))continue;const asset=await fetch(origin+decode(m[1]).split('#')[0]);assert.equal(asset.status,200);await asset.arrayBuffer();}}
 }finally{await new Promise(resolve=>server.close(resolve));}
});
