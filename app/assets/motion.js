'use strict';
// Keep animations interruptible so rapid taps always settle on the latest state.
window.AppMotion=(()=>{
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const active=new WeakMap();
 function animate(element,frames,options={}){
  active.get(element)?.cancel();
  if(reduced()||!element.animate)return null;
  const animation=element.animate(frames,{duration:240,easing:'cubic-bezier(.22,.68,0,1)',...options});
  active.set(element,animation);
  return animation;
 }
 function reveal(element){animate(element,[{opacity:0,translate:'0 12px'},{opacity:1,translate:'0 0'}]);}
 function hide(element,done){
  const animation=animate(element,[{opacity:1},{opacity:0}],{duration:150});
  if(animation)animation.onfinish=done;else done();
 }
 function slide(element,direction){animate(element,[{opacity:.35,transform:`translateX(${direction*22}px)`},{opacity:1,transform:'translateX(0)'}]);}
 // Observe visibility for picture viewers, dialogs and toasts, including native Back.
 function visibility(element){
  let hidden=element.hidden;
  new MutationObserver(()=>{if(hidden!==element.hidden){hidden=element.hidden;if(!hidden)reveal(element);else active.get(element)?.cancel();}}).observe(element,{attributes:true,attributeFilter:['hidden']});
 }
 document.querySelectorAll('#confirmSheet,#courseDetailSheet,#overlay,#toast').forEach(visibility);
 document.querySelectorAll('.course-tools details').forEach(detail=>detail.addEventListener('toggle',()=>{
  if(detail.open)[...detail.children].filter(child=>child.tagName!=='SUMMARY').forEach(reveal);
 }));
 return {reduced,animate,reveal,hide,slide};
})();
