// Run with Node.js and Playwright installed: node tests/ui-smoke.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

(async () => {
 const assets=path.resolve(__dirname,'../app/assets');
 const server=http.createServer(async(req,res)=>{
  try {
   const file=path.join(assets,new URL(req.url,'http://localhost').pathname==='/'?'index.html':new URL(req.url,'http://localhost').pathname);
   if(!file.startsWith(assets+path.sep)){res.writeHead(403).end();return;}
   res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'text/plain');
   res.end(await fs.readFile(file));
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try {
  browser=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'});
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install({time:new Date('2026-10-16T04:00:00Z')});
  await page.addInitScript(()=>{
   window.loadCount=0;window.saveCount=0;
   const start=new Date('2026-10-16T14:00:00+08:00').getTime();
   const courses=Array.from({length:5000},(_,i)=>({name:`测试课程 ${i}`,place:'教学楼 201',teacher:'老师',sections:'1–2 节',start:start+i*21600000,end:start+i*21600000+5400000}));
   window.Native={isDarkTheme:()=>false,isSystemDark:()=>false,loadState:()=>'{"theme":"system"}',
    loadCourses:()=>{loadCount++;return JSON.stringify({title:'测试课表',courses,lead:20});},
    coursePermissions:()=>'{"notifications":true,"exact":true}',setThemeMotion:(dark,animate)=>{window.nativeTheme={dark,animate};},
    saveState:()=>{saveCount++;},setSystemBarsMode:()=>{},exitApp:()=>{},clearCourses:()=>{}};
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const selected=()=>page.locator('#courseDays .selected').getAttribute('data-day');
  assert.equal(await selected(),'2026-10-16');
  assert.equal(await page.evaluate(()=>loadCount),1,'one initial course read');
  assert.equal(await page.evaluate(()=>saveCount),0,'startup does not rewrite state/widgets');
  assert.equal(await page.locator('#courseSlots input').count(),0,'timing fields are lazy');
  const cdp=await context.newCDPSession(page);
  async function swipe(selector,dx,dy=0){
   const box=await page.locator(selector).boundingBox(),x=box.x+box.width/2,y=box.y+Math.min(box.height/2,65);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/6,y:y+dy*i/6}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await swipe('#courseDays',-120);assert.equal(await selected(),'2026-10-17','date strip advances one day');
  await swipe('#courseDays',120);assert.equal(await selected(),'2026-10-16');
  await page.clock.fastForward(450);
  await page.locator('[data-day="2026-10-18"]').click();
  await swipe('#courseDays',-120);assert.equal(await selected(),'2026-10-19','date strip crosses into next week');
  await swipe('#courseDays',120);assert.equal(await selected(),'2026-10-18','date strip crosses into previous week');
  await page.locator('#courseNextWeek').click();assert.equal(await selected(),'2026-10-25','week arrow remains available');
  await page.locator('#coursePrev').click();assert.equal(await selected(),'2026-10-18');
  await page.locator('#courseToday').click();
  await swipe('#courseDayContent',-120);assert.equal(await selected(),'2026-10-17');
  await swipe('#courseDayContent',-120);assert.equal(await selected(),'2026-10-18');
  await swipe('#courseDayContent',-120);assert.equal(await selected(),'2026-10-19','cross-week day swipe');
  await swipe('#courseDays',-20);assert.equal(await selected(),'2026-10-19','short drag snaps back');
  await swipe('#courseDays',12,80);assert.equal(await selected(),'2026-10-19','vertical scroll keeps date');
  await page.locator('#courseDays').focus();await page.keyboard.press('ArrowLeft');assert.equal(await selected(),'2026-10-18');
  await page.locator('#courseToday').click();assert.equal(await selected(),'2026-10-16');
  // Periodic updates must preserve the day buttons and course cards.
  await page.evaluate(()=>{window.dayNode=document.querySelector('#courseDays button');window.cardNode=document.querySelector('#courseList article');});
  await page.clock.fastForward(10000);
  assert(await page.evaluate(()=>dayNode===document.querySelector('#courseDays button')&&cardNode===document.querySelector('#courseList article')));
  await page.locator('#themeToggle').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await page.locator('#themeToggle').click();await page.locator('#themeToggle').click();
  await page.clock.fastForward(600);assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  assert.equal(await page.locator('html').evaluate(e=>e.classList.contains('theme-transition')),false);
  await page.locator('#themeToggle').click();await page.clock.fastForward(600);
  if(process.env.SCREENSHOT_DIR){await page.evaluate(()=>document.documentElement.dataset.nativeSurface='false');await new Promise(resolve=>setTimeout(resolve,500));await fs.mkdir(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'light.png')});}
  await page.locator('#themeToggle').click();await page.clock.fastForward(600);
  if(process.env.SCREENSHOT_DIR)await new Promise(resolve=>setTimeout(resolve,500));
  if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'dark.png')});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#themeToggle').click();assert.deepEqual(await page.evaluate(()=>nativeTheme),{dark:false,animate:false});
  await page.locator('#courseImportToggle').click();await page.clock.fastForward(500);
  await page.locator('#courseClear').click();assert(await page.locator('#confirmSheet').isVisible());
  await page.locator('#confirmCancel').click();assert(await page.locator('#confirmSheet').isHidden());
  assert(await page.locator('#courseSettingsPage').isVisible());
  assert.equal(await page.locator('#settingsPageTitle').textContent(),'导入课表');
  assert(await page.locator('#courseTiming').isHidden());
  await page.locator('#settingsBack').click();assert(await page.locator('#courseSettingsPage').isHidden());
  await page.locator('[data-settings="courseTiming"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('#courseSlots input').length===26);assert.equal(await page.locator('#courseSlots input').count(),26);
  assert.equal(await page.locator('#settingsPageTitle').textContent(),'学期与作息');
  assert(await page.locator('#courseImport').isHidden());
  if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'settings-timing.png')});
  await page.evaluate(()=>window.onNativeBack());assert(await page.locator('#courseSettingsPage').isHidden());
  await page.locator('[data-settings="courseReminders"]').click();assert(await page.locator('#courseReminder').isVisible());assert(await page.locator('#courseTiming').isHidden());
  await page.locator('#settingsBack').click();
  await page.locator('[data-settings="courseWidgets"]').click();assert(await page.locator('#pinCourses').isVisible());assert(await page.locator('#courseReminder').isHidden());
  await page.locator('#settingsBack').click();

  await page.locator('#courseSheet > .sheet-body').evaluate(e=>e.scrollTop=0);
  await page.clock.setFixedTime(new Date('2026-10-16T06:30:00Z'));
  await page.evaluate(()=>window.refreshCourses());
  await page.locator('[data-day="2026-10-17"]').click();
  assert((await page.locator('#courseNext').textContent()).startsWith('正在上课：'));
  await page.locator('#courseNext').click();assert.equal(await selected(),'2026-10-16','current course banner returns to today');
  await page.locator('#courseList article').first().locator('h3').click();
  assert(await page.locator('#courseDetailSheet').isVisible());
  assert.equal(await page.locator('.course-detail-name').textContent(),'测试课程 0');
  if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'course-details.png')});
  const details=await page.locator('.course-detail-fields').textContent();
  for(const text of ['2026/10/16','第1–2节','14:00–15:30','教学楼 201','老师'])assert(details.includes(text));
  await page.locator('#closeCourseDetail').click();assert(await page.locator('#courseDetailSheet').isHidden());
  await page.locator('#courseList article').first().focus();await page.keyboard.press('Enter');
  assert(await page.locator('#courseDetailSheet').isVisible());
  await page.evaluate(()=>window.onNativeBack());assert(await page.locator('#courseDetailSheet').isHidden());
  await page.locator('#courseSheet > .sheet-body').evaluate(e=>e.scrollTop=0);
  await page.locator('#viewCampusMap').click();await page.waitForFunction(()=>!document.getElementById('imageViewer').hidden);assert(await page.locator('#imageViewer').isVisible());
  await page.locator('#closeImage').click();assert(await page.locator('#imageViewer').isHidden());
  // Slow first decode must not expose an empty viewer or the previous picture.
  await page.emulateMedia({reducedMotion:'no-preference'});
  let releaseImage;
  const imageGate=new Promise(resolve=>releaseImage=resolve);
  await page.route('**/school-timetable.png',async route=>{await imageGate;await route.continue();});
  await page.locator('#viewSchoolTimes').click();
  assert(await page.locator('#imageViewer').isHidden(),'viewer waits for decoding');
  releaseImage();await page.waitForFunction(()=>!document.getElementById('imageViewer').hidden);
  assert(await page.locator('#fullImage').evaluate(e=>e.complete&&e.naturalWidth>0));
  assert.equal(await page.locator('#fullImage').getAttribute('alt'),'教学作息时间表');
  assert.equal(await page.locator('#imageViewer').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(12, 21, 24)');
  assert.equal(await page.locator('#imageViewer').evaluate(e=>e.getAnimations().length),0,'backdrop never animates');
  await page.evaluate(()=>window.onNativeBack());
  await page.waitForFunction(()=>document.getElementById('imageViewer').hidden);
  assert.deepEqual(errors,[]);
  // Also exercise a browser without the Android bridge and persisted appearance.
  const web=await browser.newPage({viewport:{width:320,height:700},colorScheme:'dark'});
  web.on('pageerror',error=>errors.push(error.message));
  await web.goto(`http://127.0.0.1:${server.address().port}`);
  assert.equal(await web.locator('html').getAttribute('data-theme'),'dark');
  await web.locator('#themeToggle').click();await web.reload();
  assert.equal(await web.locator('html').getAttribute('data-theme'),'light');
  assert(await web.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log('PASS: startup, 5000 courses, touch navigation, keyboard, refresh stability, themes, reduced motion, dialogs, lazy settings, decoded images, course details, return to today, secondary settings pages, persistence, narrow layout.');
 } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
