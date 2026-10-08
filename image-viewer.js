// Original photographs can be inspected without enlarging the product grid.
(()=>{
 const dialog=document.createElement('dialog');dialog.className='image-viewer';dialog.setAttribute('aria-label','Vista ampliada del producto');
 dialog.innerHTML='<div class="viewer-top"><span>ÉTOILE · EN DETALLE</span><button type="button" class="viewer-close" aria-label="Cerrar imagen">Cerrar ×</button></div><div class="viewer-photo"><img alt=""></div><div class="viewer-bottom"><button type="button" class="viewer-prev" aria-label="Imagen anterior">←</button><p aria-live="polite"></p><button type="button" class="viewer-next" aria-label="Imagen siguiente">→</button></div>';
 document.body.append(dialog);let images=[],current=0,opener=null;const photo=dialog.querySelector('img'),caption=dialog.querySelector('p'),prev=dialog.querySelector('.viewer-prev'),next=dialog.querySelector('.viewer-next');
 function render(){const image=images[current];photo.src=image.currentSrc||image.src;photo.alt=image.alt;caption.textContent=image.alt+(images.length>1?' · '+(current+1)+' / '+images.length:'');prev.hidden=next.hidden=images.length<2;}
 function open(list,index,button){images=list;current=index;opener=button;render();dialog.showModal();document.body.classList.add('viewer-is-open');document.dispatchEvent(new Event('etoile:viewer-state'));}
 function move(delta){current=(current+delta+images.length)%images.length;render();}
 dialog.querySelector('.viewer-close').addEventListener('click',()=>dialog.close());prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}if(event.key==='ArrowRight'){event.preventDefault();move(1);}});
 dialog.addEventListener('close',()=>{document.body.classList.remove('viewer-is-open');document.dispatchEvent(new Event('etoile:viewer-state'));opener?.focus({preventScroll:true});});
 const editorial=[...document.querySelectorAll('.product-editorial img')];editorial.forEach((image,index)=>{const button=document.createElement('button');button.type='button';button.className='editorial-zoom';button.setAttribute('aria-label','Ampliar: '+image.alt);image.before(button);button.append(image);const cue=document.createElement('span');cue.className='image-zoom-cue';cue.textContent='Ver detalle ↗';cue.setAttribute('aria-hidden','true');button.append(cue);button.addEventListener('click',()=>open(editorial,index,button));});
})();
