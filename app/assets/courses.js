'use strict';
(()=>{
 const get=id=>document.getElementById(id),zone='Asia/Shanghai';
 const dateFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}),timeFormatter=new Intl.DateTimeFormat('zh-CN',{timeZone:zone,hour:'2-digit',minute:'2-digit',hour12:false});
 const dateKey=time=>dateFormatter.format(time);
 const asDate=key=>new Date(key+'T00:00:00+08:00');
 const addDays=(key,n)=>dateKey(asDate(key).getTime()+n*86400000);
 const monday=key=>{const day=new Date(asDate(key).getTime()+8*3600000).getUTCDay();return addDays(key,-((day+6)%7));};
 const time=stamp=>timeFormatter.format(stamp);
 const today=()=>dateKey(Date.now());
 const sectionLabel=sections=>{const text=String(sections||'').trim(),m=text.match(/^(?:第)?(\d+)(?:\s*[-–—]\s*(\d+))?\s*节$/);return m?`第${m[1]}${m[2]&&m[2]!==m[1]?'–'+m[2]:''}节`:text;};
 const sectionRange=value=>{const m=String(value||'').replace(/\s+/g,'').replace(/[–—]/g,'-').match(/^(?:第)?(\d+)(?:-(\d+))?节?$/);return m?[Number(m[1]),Number(m[2]||m[1])]:null;};
 const sameCourse=(a,b)=>{const norm=v=>String(v||'').replace(/\s+/g,' ').trim().toLocaleLowerCase();return norm(a.name)===norm(b.name)&&(!norm(a.place)||!norm(b.place)||norm(a.place)===norm(b.place))&&(!norm(a.teacher)||!norm(b.teacher)||norm(a.teacher)===norm(b.teacher));};
 function mergeCourses(courses){
  const sorted=courses.map(c=>({...c})).sort((a,b)=>a.start-b.start||a.end-b.end),merged=[];
  for(const course of sorted){const previous=merged[merged.length-1],a=previous&&sectionRange(previous.sections),b=sectionRange(course.sections),gap=previous?course.start-previous.end:Infinity;
   if(previous&&a&&b&&a[1]+1===b[0]&&gap>=0&&gap<=10*60000&&dateKey(previous.start)===dateKey(course.start)&&sameCourse(previous,course)){
    previous.end=course.end;previous.sections=`${a[0]}–${b[1]} 节`;previous.place||=course.place||'';previous.teacher||=course.teacher||'';
   }else merged.push(course);
  }return merged;
 }
 function mergeRules(rules){
  const sorted=rules.map(r=>({...r})).sort((a,b)=>a.day-b.day||a.first-b.first),merged=[];
  const minute=value=>{const m=String(value||'').match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):null;};
  const adjacent=(a,b)=>{const left=minute((data.slots?.[a.last-1]||'').split('-')[1]),right=minute((data.slots?.[b.first-1]||'').split('-')[0]);return left===null||right===null||right-left>=0&&right-left<=10;};
  for(const rule of sorted){const previous=merged[merged.length-1],weeks=r=>JSON.stringify([...(r.weeks||[])].sort((a,b)=>a-b));
   if(previous&&previous.day===rule.day&&previous.last+1===rule.first&&sameCourse(previous,rule)&&weeks(previous)===weeks(rule)&&String(previous.weekText||'').trim()===String(rule.weekText||'').trim()&&adjacent(previous,rule))previous.last=rule.last;
   else merged.push(rule);
  }return merged;
 }
 const schedule=(sections,range)=>`<div class="course-schedule">${sections?`<b>${escapeHtml(sectionLabel(sections))}</b>`:''}<span>${escapeHtml(range)}</span></div>`;
 function ruleTime(rule){const slots=data.slots||[],start=(slots[rule.first-1]||'').split('-')[0],end=(slots[rule.last-1]||'').split('-')[1];return start&&end?start+'–'+end:'时间待设置';}
 let selected=today(),week=monday(selected),data={title:'我的课程表',courses:[],lead:20,reminderMode:'school',reminders:false},busy=false;
 function load(){try{data=JSON.parse(native?Native.loadCourses():localStorage.getItem('shiji-courses')||JSON.stringify(data));if(!data.reminderMode){data.reminderMode='school';data.lead=20;}}catch(e){toast('课表读取失败');}}
 window.refreshCoursePermissions=()=>{
  let p={notifications:false,exact:false};if(native){try{p=JSON.parse(Native.coursePermissions());}catch(e){}}
  get('coursePermissionStatus').textContent=data.reminders?(p.notifications?(p.exact?'提醒已开启':'请允许准时提醒'):'请允许通知'):'提醒已关闭';
  get('courseNotifyPermission').hidden=p.notifications;get('courseExactPermission').hidden=p.exact;
 };
 let displayedCourses=[],indexedSource=null,allCourses=[],coursesByDate=new Map(),timingDirty=true;
 function updateCourseIndex(){
  if(indexedSource===data.courses)return;
  indexedSource=data.courses;allCourses=mergeCourses(data.courses);coursesByDate=new Map();
  for(const course of allCourses){const key=dateKey(course.start);if(!coursesByDate.has(key))coursesByDate.set(key,[]);coursesByDate.get(key).push(course);}
 }
 function htmlIfChanged(id,html){const element=get(id);if(element.innerHTML!==html)element.innerHTML=html;}
 function render(){
  updateCourseIndex();
  get('courseTitle').textContent=data.title||'我的课程表';get('courseWeekLabel').textContent=`${week.slice(5).replace('-','/')} — ${addDays(week,6).slice(5).replace('-','/')}`;
  const names=['一','二','三','四','五','六','日'];
  htmlIfChanged('courseDays',names.map((name,i)=>{const key=addDays(week,i),count=(coursesByDate.get(key)||[]).length;return `<button data-day="${key}" class="${key===selected?'selected':''} ${key===today()?'today':''}" aria-pressed="${key===selected}"><span>${name}</span><b>${Number(key.slice(-2))}</b><i class="${count?'has-class':''}"></i></button>`;}).join(''));
  const now=Date.now(),isToday=selected===today();
  const items=(coursesByDate.get(selected)||[]).filter(c=>!isToday||c.end>now);
  displayedCourses=items;
  const upcoming=items.find(c=>c.start>now);
  get('courseDaySummary').textContent=(selected===today()?'今天':selected.slice(5).replace('-','/'))+` · ${items.length} 节课`;
  htmlIfChanged('courseList',items.map((c,i)=>{const ongoing=isToday&&c.start<=now&&c.end>now,isNext=isToday&&c===upcoming;return `<article data-course-index="${i}" role="button" tabindex="0" aria-label="${escapeHtml(c.name)}，查看课程详情" class="course-card ${ongoing?'ongoing':isNext?'upcoming':''}" style="--course-color:${['#4b86cc','#d48a35','#567e68','#ae65ac'][i%4]}"><div class="course-info">${schedule(c.sections,time(c.start)+'–'+time(c.end))}<h3>${escapeHtml(c.name)}</h3>${c.place?`<p class="course-room">${escapeHtml(c.place)}</p>`:''}<small>${escapeHtml(c.teacher)}</small></div>${ongoing||isNext?`<span class="course-now">${ongoing?'上课中':'下一节'}</span>`:''}</article>`;}).join('')||`<div class="course-empty">${isToday&&coursesByDate.has(selected)?'今天的课已上完':'当天没有课程安排'}</div>`);
  const next=allCourses.find(c=>c.end>now);
  get('courseNext').textContent=next?(next.start<=now?'正在上课：':dateKey(next.start)===today()?'下一节：':`${dateKey(next.start).slice(5)} ${time(next.start)} · `)+next.name+(next.place?' · '+next.place:''):'请导入课表';
  if(data.rules?.length&&!data.courses.length){
   const day=new Date(asDate(selected).getTime()+8*3600000).getUTCDay()||7,rules=mergeRules(data.rules.filter(r=>r.day===day));
   get('courseDaySummary').textContent='教学周和作息待设置';get('courseNext').textContent='请设置学期与作息';
   displayedCourses=rules;
   htmlIfChanged('courseList',rules.map((r,i)=>`<article data-course-index="${i}" role="button" tabindex="0" aria-label="${escapeHtml(r.name)}，查看课程详情" class="course-card" style="--course-color:#4b86cc"><div class="course-info">${schedule(r.first+'–'+r.last+' 节',ruleTime(r))}<h3>${escapeHtml(r.name)}</h3>${r.place?`<p class="course-room">${escapeHtml(r.place)}</p>`:''}<small>${escapeHtml([r.teacher,r.weekText].filter(Boolean).join(' · '))}</small></div></article>`).join('')||'<div class="course-empty">这个星期没有课程安排</div>');
  }
  get('courseReminder').checked=!!data.reminders;get('courseLead').value=data.reminderMode==='school'?'school':String(data.lead||20);get('courseBellTimes').hidden=data.reminderMode!=='school';get('courseTotal').textContent=data.rules?.length?`${data.rules.length} 项安排 · ${data.courses.length} 次课`:`已保存 ${data.courses.length} 节课`;
  window.refreshCoursePermissions();
 }
 function fillSchoolDefaults(value){
  if(!value.rules?.length||value.courses.length)return false;
  const defaults=SchoolTimetable.presetFor(value.title);if(!defaults||value.rules.some(r=>r.last>13))return false;
  const semester=value.semesterMonday||defaults.monday,slots=value.slots?.some(Boolean)?value.slots:defaults.slots;
  try{value.courses=SchoolTimetable.occurrences(value.rules,semester,slots);value.semesterMonday=semester;value.slots=[...slots];value.updated=Date.now();return true;}catch(e){return false;}
 }
 window.refreshCourses=()=>{load();timingDirty=true;if(fillSchoolDefaults(data))saveTimetable(data);render();};
 window.openCourses=()=>{window.closeCourseSettings?.();window.refreshCourses();showSheet('courseSheet');};
 window.openResidentNotes=()=>{closeSheet();get('residentTab').click();};
 get('courseBtn').onclick=window.openCourses;
 function navigateDate(next){
  if(next===selected)return;
  const direction=next>selected?1:-1,oldWeek=week;
  selected=next;week=monday(selected);render();
  AppMotion.slide(get('courseDayContent'),direction);
  if(oldWeek!==week){AppMotion.slide(get('courseDays'),direction);AppMotion.slide(get('courseWeekLabel'),direction);}
 }
 function returnToToday(){
  navigateDate(today());
  (get('courseList').querySelector('.ongoing')||get('courseDaySummary')).scrollIntoView({block:'start',behavior:AppMotion.reduced()?'auto':'smooth'});
 }
 function courseDetails(index){
  const course=displayedCourses[index];if(!course)return;
  const date=course.start?dateKey(course.start):selected;
  const fields=[['日期',date.replace(/-/g,'/')],['节次',sectionLabel(course.sections||(course.first?`${course.first}–${course.last} 节`:'未设置'))],['时间',course.start?time(course.start)+'–'+time(course.end):ruleTime(course)],['教室',course.place||'未填写'],['教师',course.teacher||'未填写']];
  if(course.weekText)fields.push(['教学周',course.weekText]);
  get('courseDetailContent').innerHTML=`<h3 class="course-detail-name">${escapeHtml(course.name)}</h3><dl class="course-detail-fields">${fields.map(([label,value])=>`<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>`;
  showSheet('courseDetailSheet');get('closeCourseDetail').focus({preventScroll:true});
 }
 get('courseNext').onclick=returnToToday;
 get('courseNext').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();returnToToday();}};
 get('courseList').onclick=e=>{if(e.target.closest('.ongoing .course-now')){returnToToday();return;}const card=e.target.closest('[data-course-index]');if(card)courseDetails(Number(card.dataset.courseIndex));};
 get('courseList').onkeydown=e=>{if(e.key!=='Enter'&&e.key!==' ')return;const card=e.target.closest('[data-course-index]');if(card){e.preventDefault();courseDetails(Number(card.dataset.courseIndex));}};
 get('coursePrev').onclick=()=>navigateDate(addDays(selected,-7));
 get('courseNextWeek').onclick=()=>navigateDate(addDays(selected,7));
 get('courseToday').onclick=()=>navigateDate(today());
 get('courseDays').onclick=e=>{const b=e.target.closest('[data-day]');if(b)navigateDate(b.dataset.day);};
 // Native vertical scrolling and pinch zoom remain available; only a deliberate
 // horizontal drag commits navigation. One pointer sequence advances once.
 function swipe(element,step){
  let gesture=null,suppressClickUntil=0;
  element.addEventListener('pointerdown',e=>{
   if(!e.isPrimary||e.button!==0){if(gesture){const id=gesture.id;gesture=null;element.style.transform='';if(element.hasPointerCapture(id))element.releasePointerCapture(id);}return;}
   gesture={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,locked:false,vertical:false};
  });
  element.addEventListener('pointermove',e=>{
   if(!gesture||gesture.id!==e.pointerId)return;
   const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
   if(!gesture.locked&&!gesture.vertical&&Math.max(Math.abs(dx),Math.abs(dy))>10){
    if(Math.abs(dx)>Math.abs(dy)*1.35){gesture.locked=true;element.setPointerCapture(e.pointerId);}
    else gesture.vertical=true;
   }
   if(gesture.locked){gesture.dx=dx;if(!AppMotion.reduced())element.style.transform=`translateX(${Math.max(-46,Math.min(46,dx*.3))}px)`;}
  });
  const end=(e,cancelled)=>{
   if(!gesture||gesture.id!==e.pointerId)return;
   const current=gesture;gesture=null;element.style.transform='';
   if(element.hasPointerCapture(e.pointerId))element.releasePointerCapture(e.pointerId);
   if(!current.locked)return;
   suppressClickUntil=performance.now()+400;
   if(!cancelled&&Math.abs(current.dx)>=Math.min(64,element.clientWidth*.18))navigateDate(addDays(selected,current.dx<0?step:-step));
   else AppMotion.animate(element,[{transform:`translateX(${Math.max(-46,Math.min(46,current.dx*.3))}px)`},{transform:'translateX(0)'}],{duration:180});
  };
  element.addEventListener('pointerup',e=>end(e,false));
  element.addEventListener('pointercancel',e=>end(e,true));
  element.addEventListener('lostpointercapture',e=>{if(e.target===element)end(e,true);});
  element.addEventListener('click',e=>{if(performance.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
  element.addEventListener('keydown',e=>{
   if(!['ArrowLeft','ArrowRight'].includes(e.key))return;
   e.preventDefault();navigateDate(addDays(selected,e.key==='ArrowRight'?step:-step));
   if(element.id==='courseDays')get('courseDays').querySelector(`[data-day="${selected}"]`)?.focus();
  });
 }
 swipe(get('courseDays'),1);swipe(get('courseDayContent'),1);
 get('courseImportMonday').value=week;
 function settings(){const enabled=get('courseReminder').checked,school=get('courseLead').value==='school',lead=school?20:Number(get('courseLead').value);if(enabled&&data.rules?.length&&!data.courses.length){get('courseReminder').checked=false;toast('请先设置学期和上课时间');return;}if(native){if(!Native.courseSettings(enabled,school?0:lead)){render();return;}}else{data.reminders=enabled;data.lead=lead;data.reminderMode=school?'school':'custom';localStorage.setItem('shiji-courses',JSON.stringify(data));}window.refreshCourses();}
 get('courseReminder').onchange=settings;get('courseLead').onchange=settings;
 get('courseNotifyPermission').onclick=()=>{if(native)Native.courseNotificationPermission();};
 get('courseExactPermission').onclick=()=>{if(native)Native.courseExactPermission();};
 get('courseBattery').onclick=()=>{if(native)Native.courseBatterySettings();};
 get('pinCourses').onclick=()=>{if(native)Native.pinWidget(false);else toast('请在安卓应用中添加桌面小组件');};
 if(get('pinNotes'))get('pinNotes').onclick=()=>{if(native)Native.pinWidget(true);else toast('请在安卓应用中添加桌面小组件');};
 window.courseImportProgress=(text,done)=>{get('courseImportStatus').textContent=text;if(done){busy=false;window.refreshCourses();toast(text);}};
 get('schoolLogin').onclick=()=>{const account=get('schoolAccount').value.trim(),password=get('schoolPassword').value;if(!account||!password){get('courseImportStatus').textContent='请输入教务系统账号和密码';return;}if(native){Native.loginSchool(account,password);get('schoolPassword').value='';}else toast('请在安卓应用中使用内置教务浏览器');};
 get('courseFileImport').onclick=()=>{if(!get('courseImportMonday').value){toast('请选择课表对应的一周');return;}if(native)Native.importCourseFile(get('courseImportMonday').value);else toast('请在安卓应用中选择课表 HTML / JSON 文件');};
 get('courseClear').onclick=()=>{confirmDialog('清空课程表？','将删除已导入的课程并取消对应提醒。',()=>{if(native)Native.clearCourses();else{data.courses=[];delete data.rules;data.reminders=false;localStorage.setItem('shiji-courses',JSON.stringify(data));window.refreshCourses();}toast('课程表已清空');},'清空');};
 if(get('widgetsMenu'))get('widgetsMenu').onclick=()=>window.openCourseSettings('courseWidgets');
 setInterval(()=>{if(!get('courseSheet').hidden)render();},10000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!get('courseSheet').hidden)render();});
 let pendingHtml=null;
 get('courseTiming').addEventListener('toggle',()=>{if(get('courseTiming').open&&timingDirty){renderTiming();timingDirty=false;}});
 function renderTiming(){
  get('semesterMonday').value=data.semesterMonday||'';
  get('schoolTermPreset').value=/第?\s*[2二]\s*学期/.test(data.title)?'spring2027':'autumn2026';
  const size=Math.max(13,...(data.rules||[]).map(r=>r.last));
  get('courseSlots').innerHTML=Array.from({length:size},(_,i)=>{const parts=(data.slots?.[i]||'').split('-');return `<div class="course-slot"><span>${i+1} 节</span><input type="time" data-slot="${i}" data-time="start" aria-label="第 ${i+1} 节上课" value="${escapeHtml(parts[0]||'')}"><span>–</span><input type="time" data-slot="${i}" data-time="end" aria-label="第 ${i+1} 节下课" value="${escapeHtml(parts[1]||'')}"></div>`;}).join('');
  get('courseTimingHint').textContent=data.rules?.length&&!data.courses.length?'请设置第 1 周周一及上课时间。':'';get('courseTimingHint').hidden=!get('courseTimingHint').textContent;
 }
 function saveTimetable(value){if(native)return Native.saveCourseTimetable(JSON.stringify(value));value.reminderMode=data.reminderMode||'custom';value.lead=data.lead||20;value.reminders=!!data.reminders&&!!value.courses.length;localStorage.setItem('shiji-courses',JSON.stringify(value));return true;}
 window.onCourseHtml=html=>{try{pendingHtml=SchoolTimetable.parseHtml(html);get('courseImportStatus').textContent=`识别 ${pendingHtml.rules.length} 项安排，导入将替换课表。`+(pendingHtml.skipped?`跳过 ${pendingHtml.skipped} 项未选课程。`:'');get('courseConfirmHtml').hidden=false;window.openCourseSettings('courseImport');get('courseConfirmHtml').scrollIntoView({block:'nearest'});}catch(e){get('courseImportStatus').textContent=e.message;toast(e.message);}};
 function commitHtml(value,online=false){
  load();
  if(data.title===value.title&&data.semesterMonday&&data.slots?.some(Boolean)){value.semesterMonday=data.semesterMonday;value.slots=[...data.slots];}
  fillSchoolDefaults(value);
  if(!saveTimetable(value))return false;
  const ready=!!value.courses.length;pendingHtml=null;get('courseConfirmHtml').hidden=true;
  window.refreshCourses();renderTiming();if(!ready)window.openCourseSettings('courseTiming');
  get('courseImportStatus').textContent=ready?'已导入，时间已匹配':'已导入，请设置学期与作息';
  if(online&&ready){window.closeCourseSettings();get('courseSheet').querySelector('.sheet-body').scrollTop=0;}
  if(!ready)get('courseTiming').scrollIntoView({block:'start',behavior:AppMotion.reduced()?'auto':'smooth'});
  toast(ready?'已导入，时间已匹配':'已导入，请设置学期与作息');return true;
 }
 window.onOnlineCourseHtml=html=>{try{commitHtml(SchoolTimetable.parseHtml(html),true);}catch(e){get('courseImportStatus').textContent=e.message;window.openCourseSettings('courseImport');toast(e.message);}};
 get('courseConfirmHtml').onclick=()=>{if(pendingHtml)commitHtml(pendingHtml);};
 get('applySchoolPreset').onclick=()=>{const defaults=SchoolTimetable.preset(get('schoolTermPreset').value);if(!defaults)return;get('semesterMonday').value=defaults.monday;defaults.slots.forEach((slot,i)=>{const [start,end]=slot.split('-'),a=get('courseSlots').querySelector(`[data-slot="${i}"][data-time=start]`),b=get('courseSlots').querySelector(`[data-slot="${i}"][data-time=end]`);if(a)a.value=start;if(b)b.value=end;});toast('已填入学校预设，保存后生效');};
 get('courseSaveTiming').onclick=()=>{try{if(!data.rules?.length)throw Error('请先导入教务课表 HTML');const semesterMonday=get('semesterMonday').value,slots=[...get('courseSlots').querySelectorAll('[data-time=start]')].map(input=>{const end=get('courseSlots').querySelector(`[data-slot="${input.dataset.slot}"][data-time=end]`).value;return input.value&&end?input.value+'-'+end:'';});const courses=SchoolTimetable.occurrences(data.rules,semesterMonday,slots),next={...data,semesterMonday,slots,courses,updated:Date.now()};if(saveTimetable(next)){data=next;window.closeCourseSettings();render();toast(`已生成 ${courses.length} 次课，可开启提醒`);}}catch(e){toast(e.message);}};
 get('schoolPortal').onclick=()=>{if(native)Native.openSchoolPortal();else toast('请在安卓应用中使用内置教务浏览器');};
 window.refreshCourses();
})();

document.getElementById('courseImportToggle').onclick=()=>window.openCourseSettings('courseImport');
