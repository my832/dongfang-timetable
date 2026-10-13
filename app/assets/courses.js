'use strict';
(()=>{
 const get=id=>document.getElementById(id),zone='Asia/Shanghai';
 const dateKey=time=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(time);
 const asDate=key=>new Date(key+'T00:00:00+08:00');
 const addDays=(key,n)=>dateKey(asDate(key).getTime()+n*86400000);
 const monday=key=>{const day=new Date(asDate(key).getTime()+8*3600000).getUTCDay();return addDays(key,-((day+6)%7));};
 const time=stamp=>new Intl.DateTimeFormat('zh-CN',{timeZone:zone,hour:'2-digit',minute:'2-digit',hour12:false}).format(stamp);
 const today=()=>dateKey(Date.now());
 const sectionLabel=sections=>{const text=String(sections||'').trim(),m=text.match(/^(?:第)?(\d+)(?:\s*[-–—]\s*(\d+))?\s*节$/);return m?`第${m[1]}${m[2]&&m[2]!==m[1]?'–'+m[2]:''}节`:text;};
 const schedule=(sections,range)=>`<div class="course-schedule">${sections?`<b>${escapeHtml(sectionLabel(sections))}</b>`:''}<span>${escapeHtml(range)}</span></div>`;
 function ruleTime(rule){const slots=data.slots||[],start=(slots[rule.first-1]||'').split('-')[0],end=(slots[rule.last-1]||'').split('-')[1];return start&&end?start+'–'+end:'时间待设置';}
 let selected=today(),week=monday(selected),data={title:'我的课程表',courses:[],lead:20,reminderMode:'school',reminders:false},busy=false;
 function load(){try{data=JSON.parse(native?Native.loadCourses():localStorage.getItem('shiji-courses')||JSON.stringify(data));if(!data.reminderMode){data.reminderMode='school';data.lead=20;}}catch(e){toast('课表读取失败');}}
 window.refreshCoursePermissions=()=>{
  let p={notifications:false,exact:false};if(native){try{p=JSON.parse(Native.coursePermissions());}catch(e){}}
  get('coursePermissionStatus').textContent=data.reminders?(p.notifications?(p.exact?'提醒已开启':'请允许准时提醒'):'请允许通知'):'提醒已关闭';
  get('courseNotifyPermission').hidden=p.notifications;get('courseExactPermission').hidden=p.exact;
 };
 function render(){
  get('courseTitle').textContent=data.title||'我的课程表';get('courseWeekLabel').textContent=`${week.slice(5).replace('-','/')} — ${addDays(week,6).slice(5).replace('-','/')}`;
  const names=['一','二','三','四','五','六','日'];
  get('courseDays').innerHTML=names.map((name,i)=>{const key=addDays(week,i),count=data.courses.filter(c=>dateKey(c.start)===key).length;return `<button data-day="${key}" class="${key===selected?'selected':''} ${key===today()?'today':''}" aria-pressed="${key===selected}"><span>${name}</span><b>${Number(key.slice(-2))}</b><i class="${count?'has-class':''}"></i></button>`;}).join('');
  const items=data.courses.filter(c=>dateKey(c.start)===selected).sort((a,b)=>a.start-b.start),now=Date.now();
  get('courseDaySummary').textContent=(selected===today()?'今天':selected.slice(5).replace('-','/'))+` · ${items.length} 节课`;
  get('courseList').innerHTML=items.map((c,i)=>{const ended=c.end<=now,ongoing=c.start<=now&&!ended;return `<article class="course-card ${ended?'ended':''}" style="--course-color:${['#4b86cc','#d48a35','#567e68','#ae65ac'][i%4]}"><div class="course-info">${schedule(c.sections,time(c.start)+'–'+time(c.end))}<h3>${escapeHtml(c.name)}</h3>${c.place?`<p class="course-room">${escapeHtml(c.place)}</p>`:''}<small>${escapeHtml(c.teacher)}</small></div>${ongoing?'<span class="course-now">上课中</span>':''}</article>`;}).join('')||'<div class="course-empty">今天没有课程安排</div>';
  const next=data.courses.filter(c=>c.end>now).sort((a,b)=>a.start-b.start)[0];
  get('courseNext').textContent=next?(next.start<=now?'正在上课：':dateKey(next.start)===today()?'下一节：':`${dateKey(next.start).slice(5)} ${time(next.start)} · `)+next.name+(next.place?' · '+next.place:''):'请导入课表';
  if(data.rules?.length&&!data.courses.length){
   const day=new Date(asDate(selected).getTime()+8*3600000).getUTCDay()||7,rules=data.rules.filter(r=>r.day===day).sort((a,b)=>a.first-b.first);
   get('courseDaySummary').textContent='教学周和作息待设置';get('courseNext').textContent='请设置学期与作息';
   get('courseList').innerHTML=rules.map(r=>`<article class="course-card" style="--course-color:#4b86cc"><div class="course-info">${schedule(r.first+'–'+r.last+' 节',ruleTime(r))}<h3>${escapeHtml(r.name)}</h3>${r.place?`<p class="course-room">${escapeHtml(r.place)}</p>`:''}<small>${escapeHtml([r.teacher,r.weekText].filter(Boolean).join(' · '))}</small></div></article>`).join('')||'<div class="course-empty">这个星期没有课程安排</div>';
  }
  get('courseReminder').checked=!!data.reminders;get('courseLead').value=data.reminderMode==='school'?'school':String(data.lead||20);get('courseBellTimes').hidden=data.reminderMode!=='school';get('courseTotal').textContent=data.rules?.length?`${data.rules.length} 项安排 · ${data.courses.length} 次课`:`已保存 ${data.courses.length} 节课`;
  if(!get('courseTiming').open)renderTiming();
  window.refreshCoursePermissions();
 }
 function fillSchoolDefaults(value){
  if(!value.rules?.length||value.courses.length)return false;
  const defaults=SchoolTimetable.presetFor(value.title);if(!defaults||value.rules.some(r=>r.last>13))return false;
  const semester=value.semesterMonday||defaults.monday,slots=value.slots?.some(Boolean)?value.slots:defaults.slots;
  try{value.courses=SchoolTimetable.occurrences(value.rules,semester,slots);value.semesterMonday=semester;value.slots=[...slots];value.updated=Date.now();return true;}catch(e){return false;}
 }
 window.refreshCourses=()=>{load();if(fillSchoolDefaults(data))saveTimetable(data);render();};
 window.openCourses=()=>{window.refreshCourses();showSheet('courseSheet');};
 window.openResidentNotes=()=>{closeSheet();get('residentTab').click();};
 get('courseBtn').onclick=window.openCourses;
 get('coursePrev').onclick=()=>{week=addDays(week,-7);selected=addDays(selected,-7);render();};
 get('courseNextWeek').onclick=()=>{week=addDays(week,7);selected=addDays(selected,7);render();};
 get('courseToday').onclick=()=>{selected=today();week=monday(selected);render();};
 get('courseDays').onclick=e=>{const b=e.target.closest('[data-day]');if(b){selected=b.dataset.day;render();}};
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
 if(get('widgetsMenu'))get('widgetsMenu').onclick=()=>{window.openCourses();get('courseWidgets').open=true;get('courseWidgets').scrollIntoView({block:'nearest'});};
 setInterval(()=>{if(!get('courseSheet').hidden)render();},60000);
 let pendingHtml=null;
 function renderTiming(){
  get('semesterMonday').value=data.semesterMonday||'';
  get('schoolTermPreset').value=/第?\s*[2二]\s*学期/.test(data.title)?'spring2027':'autumn2026';
  const size=Math.max(13,...(data.rules||[]).map(r=>r.last));
  get('courseSlots').innerHTML=Array.from({length:size},(_,i)=>{const parts=(data.slots?.[i]||'').split('-');return `<div class="course-slot"><span>${i+1} 节</span><input type="time" data-slot="${i}" data-time="start" aria-label="第 ${i+1} 节上课" value="${escapeHtml(parts[0]||'')}"><span>–</span><input type="time" data-slot="${i}" data-time="end" aria-label="第 ${i+1} 节下课" value="${escapeHtml(parts[1]||'')}"></div>`;}).join('');
  get('courseTimingHint').textContent=data.rules?.length&&!data.courses.length?'请设置第 1 周周一及上课时间。':'';get('courseTimingHint').hidden=!get('courseTimingHint').textContent;
 }
 function saveTimetable(value){if(native)return Native.saveCourseTimetable(JSON.stringify(value));value.reminderMode=data.reminderMode||'custom';value.lead=data.lead||20;value.reminders=!!data.reminders&&!!value.courses.length;localStorage.setItem('shiji-courses',JSON.stringify(value));return true;}
 window.onCourseHtml=html=>{try{pendingHtml=SchoolTimetable.parseHtml(html);get('courseImportStatus').textContent=`识别 ${pendingHtml.rules.length} 项安排，导入将替换课表。`+(pendingHtml.skipped?`跳过 ${pendingHtml.skipped} 项未选课程。`:'');get('courseConfirmHtml').hidden=false;get('courseImport').open=true;get('courseConfirmHtml').scrollIntoView({block:'nearest'});}catch(e){get('courseImportStatus').textContent=e.message;toast(e.message);}};
 function commitHtml(value,online=false){
  load();
  if(data.title===value.title&&data.semesterMonday&&data.slots?.some(Boolean)){value.semesterMonday=data.semesterMonday;value.slots=[...data.slots];}
  fillSchoolDefaults(value);
  if(!saveTimetable(value))return false;
  const ready=!!value.courses.length;pendingHtml=null;get('courseConfirmHtml').hidden=true;
  window.refreshCourses();renderTiming();get('courseTiming').open=!ready;
  get('courseImportStatus').textContent=ready?'已导入，时间已匹配':'已导入，请设置学期与作息';
  if(online){get('courseImport').open=false;get('courseSheet').querySelector('.sheet-body').scrollTop=0;}
  if(!ready)get('courseTiming').scrollIntoView({block:'start',behavior:'smooth'});
  toast(ready?'已导入，时间已匹配':'已导入，请设置学期与作息');return true;
 }
 window.onOnlineCourseHtml=html=>{try{commitHtml(SchoolTimetable.parseHtml(html),true);}catch(e){get('courseImportStatus').textContent=e.message;get('courseImport').open=true;toast(e.message);}};
 get('courseConfirmHtml').onclick=()=>{if(pendingHtml)commitHtml(pendingHtml);};
 get('applySchoolPreset').onclick=()=>{const defaults=SchoolTimetable.preset(get('schoolTermPreset').value);if(!defaults)return;get('semesterMonday').value=defaults.monday;defaults.slots.forEach((slot,i)=>{const [start,end]=slot.split('-'),a=get('courseSlots').querySelector(`[data-slot="${i}"][data-time=start]`),b=get('courseSlots').querySelector(`[data-slot="${i}"][data-time=end]`);if(a)a.value=start;if(b)b.value=end;});toast('已填入学校预设，保存后生效');};
 get('courseSaveTiming').onclick=()=>{try{if(!data.rules?.length)throw Error('请先导入教务课表 HTML');const semesterMonday=get('semesterMonday').value,slots=[...get('courseSlots').querySelectorAll('[data-time=start]')].map(input=>{const end=get('courseSlots').querySelector(`[data-slot="${input.dataset.slot}"][data-time=end]`).value;return input.value&&end?input.value+'-'+end:'';});const courses=SchoolTimetable.occurrences(data.rules,semesterMonday,slots),next={...data,semesterMonday,slots,courses,updated:Date.now()};if(saveTimetable(next)){data=next;get('courseTiming').open=false;render();toast(`已生成 ${courses.length} 次课，可开启提醒`);}}catch(e){toast(e.message);}};
 get('schoolPortal').onclick=()=>{if(native)Native.openSchoolPortal();else toast('请在安卓应用中使用内置教务浏览器');};
 window.refreshCourses();
})();

document.getElementById('courseImportToggle').onclick=()=>{const section=document.getElementById('courseImport');section.open=true;section.scrollIntoView({block:'start',behavior:'smooth'});};window.openCourses();
