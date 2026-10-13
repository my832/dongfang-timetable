'use strict';
(()=>{
 const get=id=>document.getElementById(id);
 function openPicture(path,title){
  get('fullImage').src=path;get('fullImage').alt=title;
  get('imageCaption').textContent=title;get('imageViewer').hidden=false;
  if(window.resetImageZoom)window.resetImageZoom();
 }
 get('viewSchoolTimes').onclick=()=>openPicture('school-timetable.png','教学作息时间表');
 get('viewCampusMap').onclick=()=>openPicture('campus-map.png','校园地图');
})();
