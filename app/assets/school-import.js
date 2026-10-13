'use strict';
window.SchoolTimetable=(()=>{
 const schoolSlots=['08:30-09:15','09:15-10:00','10:05-10:50','11:00-11:45','11:45-12:30','13:30-14:15','14:15-15:00','15:05-15:50','16:00-16:45','16:45-17:30','18:30-19:15','19:15-20:00','20:05-20:50'];
 const calendars={autumn2026:{title:'2026–2027 第一学期',monday:'2026-09-14'},spring2027:{title:'2026–2027 第二学期',monday:'2027-02-22'}};
 function preset(key){return calendars[key]?{...calendars[key],slots:[...schoolSlots]}:null;}
 function presetFor(title){if(!/2026\s*[-–]\s*2027/.test(title))return null;if(/第?\s*[1一]\s*学期/.test(title))return preset('autumn2026');if(/第?\s*[2二]\s*学期/.test(title))return preset('spring2027');return null;}
 const clean=value=>(value||'').replace(/\s+/g,' ').trim();
 function weeksFrom(text){
  const match=text.replace(/\s/g,'').match(/([\d,，、\-－–—]+)周(?:[（(]([单双])[）)])?/);
  if(!match)throw Error('有课程缺少有效的周次安排');
  const weeks=new Set();for(const piece of match[1].replace(/[，、]/g,',').split(',')){
   const range=piece.split(/[\-－–—]/).map(Number);const from=range[0],to=range.length>1?range[1]:from;
   if(!Number.isInteger(from)||from<1||to>30||to<from)throw Error('课程周次超出 1–30 周');
   for(let week=from;week<=to;week++)if(!match[2]||(match[2]==='单'?week%2===1:week%2===0))weeks.add(week);
  }return [...weeks].sort((a,b)=>a-b);
 }
 function parseHtml(html){
  if(html.length>2*1024*1024)throw Error('课表网页不能超过 2 MB');
  // Saved pages are data. Never attach their markup, scripts, or resource URLs.
  html=html.replace(/<(script|style|iframe|object|embed|video|audio)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<(?:img|link|base|source|iframe|object|embed)\b[^>]*>/gi,'');
  const doc=new DOMParser().parseFromString(html,'text/html'),table=doc.querySelector('[id^="kbgrid_table"]');
  if(!table)throw Error('请选择“个人课表查询”网页，登录页或教务首页没有课表数据');
  const rules=[],seen=new Set();let skipped=0;
  for(const block of table.querySelectorAll('.timetable_con')){
   const cell=block.closest('td'),cellMatch=cell?.id.match(/^([1-7])-(\d+)$/),title=block.querySelector('.title');if(!cellMatch||!title)continue;
   if([...block.querySelectorAll('font')].some(f=>/^(red|#f00|#ff0000)$/i.test(f.getAttribute('color')||''))){skipped++;continue;}
   const name=clean(title.textContent).replace(/[★●]/g,'').trim();
   const field=label=>{const marker=[...block.querySelectorAll('[title]')].find(e=>clean(e.getAttribute('title')).startsWith(label));return clean(marker?.closest('p')?.textContent);};
   const arrangement=field('节/周'),section=arrangement.match(/[（(](\d+)-(\d+)节[）)]/);
   if(!name||!section)throw Error('有课程无法识别节次');
   const first=Number(section[1]),last=Number(section[2]);if(first<1||last<first||last>30)throw Error('课程节次不正确');
   const weeks=weeksFrom(arrangement),rule={name,day:Number(cellMatch[1]),first,last,weeks,weekText:arrangement.replace(/^[（(][^）)]*[）)]/,'').trim(),place:field('上课地点'),teacher:field('教师')};
   const key=JSON.stringify(rule);if(!seen.has(key)){seen.add(key);rules.push(rule);}
  }
  if(!rules.length)throw Error('网页里没有可导入的已选课程');
  const heading=clean(table.rows[0]?.textContent),term=heading.match(/\d{4}-\d{4}学年第\d学期/);
  return {title:term?term[0]:'教务课程表',courses:[],rules,semesterMonday:'',slots:[],updated:Date.now(),skipped};
 }
 function occurrences(rules,startDate,slots){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate))throw Error('请选择第 1 教学周的周一');
  const date=new Date(startDate+'T00:00:00+08:00'),monday=new Date(date.getTime()+8*3600000);
  if(!Number.isFinite(date.getTime())||monday.getUTCDay()!==1)throw Error('第 1 教学周起始日必须是周一');
  const parse=(index)=>{const value=slots[index-1]||'',m=value.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);if(!m)throw Error(`请设置第 ${index} 节的上下课时间`);const a=Number(m[1])*60+Number(m[2]),b=Number(m[3])*60+Number(m[4]);if(Number(m[1])>23||Number(m[3])>23||Number(m[2])>59||Number(m[4])>59||b<=a)throw Error(`第 ${index} 节时间不正确`);return {start:a,end:b};};
  const list=[],seen=new Set();for(const r of rules){const begin=parse(r.first),end=parse(r.last);if(end.end<=begin.start||end.end-begin.start>1440)throw Error(`${r.name} 的时间顺序不正确`);
   for(const week of r.weeks){const base=date.getTime()+((week-1)*7+r.day-1)*86400000,c={name:r.name,start:base+begin.start*60000,end:base+end.end*60000,place:r.place||'',teacher:r.teacher||'',sections:`${r.first}–${r.last} 节`,week};const key=c.name+'|'+c.start+'|'+c.end+'|'+c.place;if(!seen.has(key)){seen.add(key);list.push(c);}}
  }return list.sort((a,b)=>a.start-b.start);
 }
 return {parseHtml,weeksFrom,occurrences,preset,presetFor};
})();
