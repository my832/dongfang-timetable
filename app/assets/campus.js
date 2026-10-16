'use strict';
(()=>{
 const get=id=>document.getElementById(id),viewer=get('imageViewer'),image=get('fullImage'),stage=get('imageStage');
 const pictures=new Map();let revision=0,pending=false;
 function decodedPicture(path){
  if(!pictures.has(path)){
   const picture=new Image();picture.src=path;
   const ready=picture.decode?picture.decode():new Promise((resolve,reject)=>{picture.onload=resolve;picture.onerror=reject;});
   pictures.set(path,ready.catch(error=>{pictures.delete(path);throw error;}));
  }
  return pictures.get(path);
 }
 async function openPicture(path,title){
  const request=++revision;pending=true;
  try{
   // Keep the current screen intact until the requested bitmap is decoded.
   await decodedPicture(path);if(request!==revision)return;
   image.src=path;image.alt=title;
   if(image.decode)await image.decode();if(request!==revision)return;
   get('imageCaption').textContent=title;
   if(window.resetImageZoom)window.resetImageZoom();
   pending=false;viewer.hidden=false;
   // The full-screen backdrop stays opaque and stationary. Only its content enters.
   AppMotion.reveal(stage);
  }catch(error){if(request===revision){pending=false;toast('图片加载失败，请重试');}}
 }
 window.closePicture=()=>{
  const request=++revision;pending=false;
  AppMotion.hide(stage,()=>{if(request===revision)viewer.hidden=true;});
 };
 window.cancelPendingPicture=()=>{if(!pending)return false;revision++;pending=false;return true;};
 get('viewSchoolTimes').onclick=()=>openPicture('school-timetable.png','教学作息时间表');
 get('viewCampusMap').onclick=()=>openPicture('campus-map.png','校园地图');
})();
