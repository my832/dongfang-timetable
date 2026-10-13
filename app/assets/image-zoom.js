'use strict';
(()=>{
 const stage=document.getElementById('imageStage'),image=document.getElementById('fullImage');
 const pointers=new Map();let scale=1,x=0,y=0,baseline=null,moved=false,multi=false,lastTap=null;
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
 function paint(){
  x=clamp(x,-Math.max(0,(image.clientWidth*scale-stage.clientWidth)/2),Math.max(0,(image.clientWidth*scale-stage.clientWidth)/2));
  y=clamp(y,-Math.max(0,(image.clientHeight*scale-stage.clientHeight)/2),Math.max(0,(image.clientHeight*scale-stage.clientHeight)/2));
  image.style.transform=`translate(-50%,-50%) translate(${x}px,${y}px) scale(${scale})`;
 }
 function geometry(){
  const points=[...pointers.values()],rect=stage.getBoundingClientRect();
  const a=points[0],b=points[1]||a;
  return {mx:(a.x+b.x)/2-rect.left-rect.width/2,my:(a.y+b.y)/2-rect.top-rect.height/2,distance:Math.hypot(a.x-b.x,a.y-b.y)};
 }
 function rebase(){baseline=pointers.size?{...geometry(),scale,x,y}:null;}
 window.resetImageZoom=()=>{pointers.clear();baseline=null;scale=1;x=0;y=0;lastTap=null;paint();};
 image.addEventListener('load',window.resetImageZoom);
 image.addEventListener('dragstart',e=>e.preventDefault());
 stage.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  e.preventDefault();if(!pointers.size){moved=false;multi=false;}
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});stage.setPointerCapture(e.pointerId);
  if(pointers.size>1){multi=true;lastTap=null;}rebase();
 });
 stage.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;e.preventDefault();
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const g=geometry();
  if(Math.hypot(g.mx-baseline.mx,g.my-baseline.my)>6||Math.abs(g.distance-baseline.distance)>6)moved=true;
  const next=pointers.size>1&&baseline.distance>0?clamp(baseline.scale*g.distance/baseline.distance,1,6):scale;
  const ratio=next/baseline.scale;
  x=g.mx-(baseline.mx-baseline.x)*ratio;y=g.my-(baseline.my-baseline.y)*ratio;scale=next;paint();
 });
 function end(e){
  if(!pointers.has(e.pointerId))return;
  pointers.delete(e.pointerId);
  if(e.type==='pointerup'&&!pointers.size&&!moved&&!multi){
   const now=performance.now();
   if(lastTap&&now-lastTap.time<300&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<30){
    const rect=stage.getBoundingClientRect(),mx=e.clientX-rect.left-rect.width/2,my=e.clientY-rect.top-rect.height/2;
    const next=scale>1?1:2.5,ratio=next/scale;x=mx-(mx-x)*ratio;y=my-(my-y)*ratio;scale=next;paint();lastTap=null;
   }else lastTap={time:now,x:e.clientX,y:e.clientY};
  }
  rebase();
 }
 ['pointerup','pointercancel','lostpointercapture'].forEach(type=>stage.addEventListener(type,end));
 window.addEventListener('resize',()=>{if(!document.getElementById('imageViewer').hidden)paint();});
 new MutationObserver(()=>{if(document.getElementById('imageViewer').hidden)window.resetImageZoom();}).observe(document.getElementById('imageViewer'),{attributes:true,attributeFilter:['hidden']});
})();
