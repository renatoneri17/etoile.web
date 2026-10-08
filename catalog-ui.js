(() => {
 'use strict';
 const api = window.EtoileCatalog;
 const products = api.publicProducts(window.EtoileProducts || []);
 const categoryName = id => api.categories.find(item => item.id === id)?.label || 'Todas las colecciones';
 const byId = new Map(products.map(product => [product.id, product]));
 const form = document.getElementById('catalog-filters');
 const search = document.getElementById('catalog-search');
 const brand = document.getElementById('catalog-brand');
 const style = document.getElementById('catalog-style');
 const results = document.getElementById('catalog-results');
 const empty = document.getElementById('catalog-empty');
 const status = document.getElementById('catalog-status');
 const detail = document.getElementById('product-detail');
 const defaultTitle = document.title;
 const meta = document.querySelector('meta[name="description"]');
 const defaultDescription = meta.content;
 let filters = {category:'',brand:'',style:'',query:''};
 let catalogHash = '#catalogo';
 let currentProduct = null;
 let page = 1;
 const pageSize = 24;
 const pagination = element('nav','catalog-pagination');
 pagination.setAttribute('aria-label','Páginas del catálogo');
 results.after(pagination);

 function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
 }
 function contactLink(text, label, className = 'button outline') {
  const link = element('a', className, label);
  link.href = api.whatsappUrl(text); link.target = '_blank'; link.rel = 'noopener noreferrer';
  return link;
 }
 function setPhoto(img, photo, context) {
  img.alt=photo.alt;img.decoding='async';
  if(photo.width && photo.height){img.width=photo.width;img.height=photo.height;}
  if(context==='card') {
   img.removeAttribute('srcset');img.removeAttribute('sizes');
   img.src=photo.thumbnail || photo.src;
  } else {
   if(photo.thumbnail && photo.thumbnailWidth<photo.width){
    img.sizes=context==='zoom'?'100vw':'(max-width: 700px) calc(100vw - 44px), (max-width: 1100px) 50vw, 600px';
    img.srcset=photo.thumbnail+' '+photo.thumbnailWidth+'w, '+photo.src+' '+photo.width+'w';
   } else {img.removeAttribute('srcset');img.removeAttribute('sizes');}
   img.src=photo.src;
  }
 }
 function card(product, index=3) {
  const article = element('article','catalog-card');
  const link = element('a'); link.href = '#producto/' + encodeURIComponent(product.id);
  const photo = element('div','catalog-card-photo');
  const img = element('img'); img.loading = index<3 && location.hash.startsWith('#catalogo') ? 'eager' : 'lazy';
  setPhoto(img,product.images[0],'card');photo.append(img);
  const copy = element('div','catalog-card-copy');
  copy.append(element('p','eyebrow',product.brand),element('h3','',product.model || product.code),element('p','catalog-card-code',product.code),element('span','','Ver ficha ↗'));
  link.append(photo,copy);article.append(link);
  article.append(contactLink(api.productMessage(product),'Consultar por WhatsApp ↗','catalog-card-contact'));
  return article;
 }
 function setOptions(select, values, all, selected='') {
  select.replaceChildren(new Option(all,''));
  values.forEach(value => select.append(new Option(value,value)));
  select.value = values.includes(selected) ? selected : '';
 }
 function refreshOptions() {
  const availableBrands = api.options(products,'brand',filters.category);
  const availableStyles = api.options(products,'style',filters.category);
  setOptions(brand,availableBrands,'Todas las marcas',filters.brand);
  setOptions(style,availableStyles,'Todos los estilos',filters.style);
  filters.brand = brand.value; filters.style = style.value;
  document.getElementById('catalog-brand-field').hidden = availableBrands.length < 2;
  document.getElementById('catalog-style-field').hidden = availableStyles.length < 2;
 }
 function updateCatalogHash() {
  const query = new URLSearchParams();
  if(filters.category)query.set('categoria',filters.category);
  if(filters.brand)query.set('marca',filters.brand);
  if(filters.style)query.set('estilo',filters.style);
  if(filters.query)query.set('buscar',filters.query);
  catalogHash = '#catalogo' + (query.size ? '?' + query : '');
  if(location.hash.startsWith('#catalogo'))history.replaceState(null,'',catalogHash);
 }
 function renderCatalog() {
  form.hidden = !products.length;
  document.querySelectorAll('#catalog-categories button').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.category === filters.category)));
  const matches = api.filterProducts(products,filters);
  const pageCount = Math.max(1,Math.ceil(matches.length/pageSize));
  page = Math.min(page,pageCount);
  const first = (page-1)*pageSize;
  results.replaceChildren(...matches.slice(first,first+pageSize).map(card));
  pagination.replaceChildren();pagination.hidden=pageCount<2;
  if(pageCount>1){
   const previous=element('button','button outline','← Anterior');previous.type='button';previous.disabled=page===1;
   const next=element('button','button outline','Siguiente →');next.type='button';next.disabled=page===pageCount;
   const move=direction=>{page+=direction;renderCatalog();document.getElementById('catalog-status').scrollIntoView({behavior:'instant',block:'start'});};
   previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
   pagination.append(previous,element('span','','Página '+page+' de '+pageCount),next);
  }
  empty.hidden = matches.length > 0;
  status.textContent = products.length ? (matches.length ? 'Mostrando '+(first+1)+'–'+Math.min(first+pageSize,matches.length)+' de '+matches.length+' fichas.' : 'No hay fichas que coincidan con tu búsqueda.') : '';
  document.getElementById('catalog-empty-title').textContent = products.length ? 'Probemos otra selección.' : (filters.category ? categoryName(filters.category) + ': fichas en preparación.' : 'Estamos preparando las fichas.');
  document.getElementById('catalog-empty-description').textContent = products.length ? 'Cambiá los filtros o contanos qué estás buscando para recibir asesoría personal.' : 'Estamos confirmando los modelos y sus características para que puedas conocer cada pieza. Mientras tanto, contanos qué estás buscando.';
  const text = 'Hola Étoile, quisiera recibir asesoría sobre ' + (filters.category ? categoryName(filters.category).toLowerCase() : 'sus colecciones') + '.';
  document.getElementById('catalog-empty-contact').href = api.whatsappUrl(text);
 }
 form.addEventListener('submit',event=>event.preventDefault());
 search.addEventListener('input',()=>{page=1;filters.query=search.value.trim();renderCatalog();updateCatalogHash();});
 brand.addEventListener('change',()=>{page=1;filters.brand=brand.value;renderCatalog();updateCatalogHash();});
 style.addEventListener('change',()=>{page=1;filters.style=style.value;renderCatalog();updateCatalogHash();});
 document.getElementById('catalog-clear').addEventListener('click',()=>{page=1;filters={category:'',brand:'',style:'',query:''};search.value='';refreshOptions();renderCatalog();updateCatalogHash();});
 document.querySelectorAll('#catalog-categories button').forEach(button=>button.addEventListener('click',()=>{
  page=1;filters.category=button.dataset.category;filters.brand='';filters.style='';refreshOptions();renderCatalog();updateCatalogHash();
 }));

 const zoom = element('dialog','detail-zoom'); zoom.setAttribute('aria-label','Fotografía del producto ampliada');
 const zoomTop=element('div','zoom-top');zoomTop.append(element('span','eyebrow','ÉTOILE · EN DETALLE'));
 const zoomClose=element('button','text-button','Cerrar ×');zoomClose.type='button';zoomTop.append(zoomClose);
 const zoomImage=element('img'),zoomCaption=element('p');zoom.append(zoomTop,zoomImage,zoomCaption);document.body.append(zoom);
 let zoomOpener;
 zoomClose.addEventListener('click',()=>zoom.close());
 zoom.addEventListener('click',event=>{if(event.target===zoom)zoom.close();});
 zoom.addEventListener('close',()=>{document.body.classList.remove('viewer-is-open');document.dispatchEvent(new Event('etoile:viewer-state'));zoomOpener?.focus();});
 function showZoom(image,opener){setPhoto(zoomImage,image,'zoom');zoomImage.loading='eager';zoomCaption.textContent=image.alt;zoomOpener=opener;zoom.showModal();document.body.classList.add('viewer-is-open');document.dispatchEvent(new Event('etoile:viewer-state'));}

 function renderProduct(id) {
  currentProduct=byId.get(id);detail.replaceChildren();
  const breadcrumb=element('nav','product-breadcrumb');breadcrumb.setAttribute('aria-label','Ruta del producto');
  const back=element('a','','← Volver al catálogo');back.href=catalogHash;breadcrumb.append(back);detail.append(breadcrumb);
  if(!currentProduct){
   document.title='Ficha no publicada | Étoile Paraguay';meta.content=defaultDescription;
   const title=element('h1','','Esta ficha no está publicada.');title.tabIndex=-1;
   detail.append(title,element('p','muted','Podés explorar las colecciones o recibir asesoría personal.'),contactLink('Hola Étoile, quisiera recibir asesoría sobre sus colecciones.','Conversá con Étoile ↗'));
   title.focus({preventScroll:true});return;
  }
  const product=currentProduct;
  document.title=product.brand+' · '+(product.model||product.code)+' | Étoile Paraguay';
  meta.content=product.description;
  breadcrumb.append(element('span','','/ '+categoryName(product.category)));
  const layout=element('div','product-layout');
  const gallery=element('div','detail-gallery');
  const mainPhoto=element('button','detail-photo-button');mainPhoto.type='button';mainPhoto.setAttribute('aria-label','Ampliar fotografía del producto');
  const image=element('img');image.loading='eager';setPhoto(image,product.images[0],'detail');
  mainPhoto.append(image,element('span','','Ampliar imagen ↗'));gallery.append(mainPhoto);
  let activeImage=product.images[0];mainPhoto.addEventListener('click',()=>showZoom(activeImage,mainPhoto));
  if(product.images.length>1){
   const thumbnails=element('div','detail-thumbnails');thumbnails.setAttribute('role','group');thumbnails.setAttribute('aria-label','Fotografías del producto');
   product.images.forEach((item,index)=>{
    const button=element('button');button.type='button';button.setAttribute('aria-label','Ver fotografía '+(index+1)+': '+item.alt);button.setAttribute('aria-pressed',String(index===0));
    const thumbnail=element('img');setPhoto(thumbnail,item,'card');thumbnail.alt='';thumbnail.loading='lazy';button.append(thumbnail);
    button.addEventListener('click',()=>{activeImage=item;setPhoto(image,item,'detail');thumbnails.querySelectorAll('button').forEach(node=>node.setAttribute('aria-pressed',String(node===button)));});thumbnails.append(button);
   });gallery.append(thumbnails);
  }
  const copy=element('div','detail-copy');
  const title=element('h1','',product.model||product.code);title.tabIndex=-1;
  copy.append(element('p','eyebrow',product.brand),title,element('p','description',product.description));
  const facts=element('dl');
  [['Categoría',categoryName(product.category)],['Marca',product.brand],['Modelo',product.model],['Código',product.code],['Referencia Étoile',product.id],['Estilo',product.tags.join(' · ')]].filter(([,value])=>value).forEach(([name,value])=>{const row=element('div');row.append(element('dt','',name),element('dd','',value));facts.append(row);});
  const text=api.productMessage(product);
  copy.append(facts,contactLink(text,'Consultar por WhatsApp ↗','button gold full'),element('p','small muted','Se abrirá tu consulta con esta pieza identificada. Vos decidís cuándo enviarla.'),element('p','message-preview',text));
  const privateVisit=element('a','text-link','Coordiná una visita privada ↗');privateVisit.href='#visita';copy.append(privateVisit);
  layout.append(gallery,copy);detail.append(layout);title.focus({preventScroll:true});
 }
 function route() {
  const hash=location.hash;
  const isProduct=hash.startsWith('#producto/');
  document.body.classList.toggle('product-route',isProduct);detail.hidden=!isProduct;
  if(zoom.open)zoom.close();
  if(isProduct){let id='';try{id=decodeURIComponent(hash.slice(10));}catch{}renderProduct(id);window.scrollTo({top:0,behavior:'instant'});return;}
  currentProduct=null;document.title=defaultTitle;meta.content=defaultDescription;
  if(hash.startsWith('#catalogo')){
   const params=new URLSearchParams(hash.split('?')[1]||'');
   filters={category:api.categories.some(c=>c.id===params.get('categoria'))?params.get('categoria'):'',brand:params.get('marca')||'',style:params.get('estilo')||'',query:(params.get('buscar')||'').slice(0,120)};
   page=1;search.value=filters.query;refreshOptions();renderCatalog();updateCatalogHash();document.getElementById('catalogo').scrollIntoView({behavior:'instant'});
  } else if(hash && document.getElementById(hash.slice(1))) document.getElementById(hash.slice(1)).scrollIntoView({behavior:'instant'});
 }

 // Recommendations can only come from the same verified, published records as the catalog.
 const panel=document.getElementById('style-experience');
 let step=0,preferences={category:'',brand:'',style:''};
 const steps=[{key:'category',title:'¿Qué pieza estás buscando?',all:'Elegí una categoría'},{key:'brand',title:'¿Tenés una marca en mente?',all:'Estoy abierto a descubrir'},{key:'style',title:'¿Qué estilo te representa?',all:'Quiero explorar'}];
 function renderQuiz(){
  if(!products.length)return;
  const hadFocus=panel.contains(document.activeElement);
  panel.replaceChildren();
  if(step===3){
   const recommendations=api.recommend(products,preferences);
   panel.append(element('p','eyebrow','TU SELECCIÓN'),element('h3','',recommendations.length?'Piezas para descubrir.':'Sigamos buscando juntos.'));
   if(recommendations.length){
    panel.append(element('p','','Estas fichas coinciden con las preferencias que elegiste.'));
    const list=element('div','quiz-results');list.append(...recommendations.slice(0,3).map(card));panel.append(list);
   }else{
    panel.append(element('p','','Todavía no tenemos fichas que coincidan con esa combinación. Podemos ayudarte personalmente.'),contactLink('Hola Étoile, quisiera asesoría.'+(preferences.category?' Me interesan '+categoryName(preferences.category).toLowerCase()+'.':'')+(preferences.brand?' Me gusta '+preferences.brand+'.':'')+(preferences.style?' Busco un estilo '+preferences.style+'.':''),'Recibir asesoría ↗'));
   }
   const restart=element('button','text-button','Volver a empezar');restart.type='button';restart.addEventListener('click',()=>{step=0;preferences={category:'',brand:'',style:''};renderQuiz();});panel.append(restart);
  }else{
   const current=steps[step];
   panel.append(element('p','eyebrow','PASO '+(step+1)+' DE 3'),element('h3','',current.title));
   const label=element('label','sr-only',current.title);label.htmlFor='style-answer';
   const select=element('select');select.id='style-answer';select.required=current.key==='category';select.append(new Option(current.all,''));
   if(current.key==='category')api.categories.filter(c=>products.some(p=>p.category===c.id)).forEach(c=>select.append(new Option(c.label,c.id)));
   else api.options(api.filterProducts(products,{category:preferences.category,brand:current.key==='style'?preferences.brand:''}),current.key,'').forEach(value=>select.append(new Option(value,value)));
   select.value=preferences[current.key];
   panel.append(label,select);
   const actions=element('div','quiz-actions');
   if(step>0){const back=element('button','text-button','← Anterior');back.type='button';back.addEventListener('click',()=>{preferences[current.key]=select.value;step--;renderQuiz();});actions.append(back);}
   const next=element('button','button outline',step===2?'Ver mi selección ↗':'Continuar →');next.type='button';
   next.addEventListener('click',()=>{if(!select.reportValidity())return;if(preferences[current.key]!==select.value){if(step===0)preferences.brand='';if(step<2)preferences.style='';}preferences[current.key]=select.value;step++;renderQuiz();});actions.append(next);panel.append(actions);
  }
  const heading=panel.querySelector('h3');heading.tabIndex=-1;if(hadFocus)heading.focus({preventScroll:true});
 }
 refreshOptions();renderCatalog();renderQuiz();
 window.addEventListener('hashchange',route);route();
})();
