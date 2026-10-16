'use strict';
(()=>{
 const get=id=>document.getElementById(id),page=get('courseSettingsPage'),home=document.querySelector('.timetable-home');
 const titles={courseImport:'导入课表',courseTiming:'学期与作息',courseReminders:'上课提醒',courseWidgets:'桌面小组件'};
 let active=null,opener=null;
 window.openCourseSettings=id=>{
  if(!titles[id])return;
  if(!active)opener=document.activeElement;
  const changed=active!==id;active=id;
  for(const key of Object.keys(titles)){get(key).hidden=key!==id;get(key).open=key===id;}
  get('settingsPageTitle').textContent=titles[id];page.hidden=false;home.classList.add('settings-active');
  if(changed){page.querySelector('.settings-scroll').scrollTop=0;AppMotion.reveal(page.querySelector('.settings-scroll'));}
  get('settingsBack').focus({preventScroll:true});
 };
 window.closeCourseSettings=()=>{
  if(!active)return false;
  active=null;page.hidden=true;home.classList.remove('settings-active');
  for(const id of Object.keys(titles)){get(id).open=false;get(id).hidden=true;}
  opener?.focus({preventScroll:true});return true;
 };
 document.querySelectorAll('[data-settings]').forEach(button=>button.onclick=()=>window.openCourseSettings(button.dataset.settings));
 get('settingsBack').onclick=window.closeCourseSettings;
 for(const id of Object.keys(titles))get(id).hidden=true;
})();
