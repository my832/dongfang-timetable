'use strict';
const native=typeof window.Native!=='undefined';
const get=id=>document.getElementById(id);
const headerIcons={sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>', moon: '<path d="M20.2 14A8.5 8.5 0 0 1 10 3.8 8.5 8.5 0 1 0 20.2 14Z"/><path d="M17.5 3v4M15.5 5h4"/>'};
function headerIcon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true">${headerIcons[name]}</svg>`;}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
let theme='system',confirmAction=null,toastTimer;
try{theme=JSON.parse(native?Native.loadState():localStorage.getItem('shiji-v1')||'{}').theme||'system';}catch(e){}
let themeTimer;
function setTheme(value,animate=true){
 const preferenceChanged=theme!==value;theme=value;
 const root=document.documentElement,dark=value==='dark'||(value==='system'&&(native?Native.isSystemDark():matchMedia('(prefers-color-scheme: dark)').matches));
 const changed=root.dataset.theme!==(dark?'dark':'light'),motion=animate&&!AppMotion.reduced();
 clearTimeout(themeTimer);
 root.classList.toggle('theme-transition',changed&&motion);
 if(changed&&motion){void root.offsetWidth;themeTimer=setTimeout(()=>root.classList.remove('theme-transition'),420);}
 root.dataset.theme=dark?'dark':'light';
 const button=get('themeToggle');button.innerHTML=headerIcon(dark?'sun':'moon');
 button.setAttribute('aria-label',dark?'切换亮色':'切换暗色');button.setAttribute('aria-pressed',String(dark));
 if(changed&&motion)AppMotion.animate(button.firstElementChild,[{opacity:0,transform:'rotate(-60deg) scale(.65)'},{opacity:1,transform:'rotate(0) scale(1)'}],{duration:360});
 if(native){if(Native.setThemeMotion)Native.setThemeMotion(dark,motion);else Native.setTheme(dark);if(preferenceChanged)Native.saveState(JSON.stringify({version:1,theme,notes:[],draft:null}));}
 else if(preferenceChanged)localStorage.setItem('shiji-v1',JSON.stringify({theme}));
}
function toast(text){get('toast').textContent=text;get('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>get('toast').hidden=true,2500);}
let modalTrigger=null;
function showSheet(id){if(id==='courseSheet'){get(id).hidden=false;return;}modalTrigger=document.activeElement;sheetRevision++;get(id).hidden=false;get('overlay').hidden=false;AppMotion.reveal(get(id));AppMotion.reveal(get('overlay'));if(native)Native.setSystemBarsMode(1);}
let sheetRevision=0;
function closeSheet(){
 const revision=++sheetRevision;confirmAction=null;
 document.querySelectorAll('.sheet[role=dialog]:not([hidden])').forEach(sheet=>AppMotion.hide(sheet,()=>{if(revision!==sheetRevision)return;sheet.hidden=true;modalTrigger?.focus({preventScroll:true});}));
 AppMotion.hide(get('overlay'),()=>{if(revision===sheetRevision)get('overlay').hidden=true;});
 if(native)Native.setSystemBarsMode(0);
}
function confirmDialog(title,text,action,label='确认'){get('confirmTitle').textContent=title;get('confirmText').textContent=text;get('confirmOkay').textContent=label;confirmAction=action;showSheet('confirmSheet');}
get('closeCourseDetail').onclick=closeSheet;get('confirmCancel').onclick=closeSheet;get('overlay').onclick=closeSheet;
get('confirmOkay').onclick=()=>{const action=confirmAction;closeSheet();if(action)action();};
get('themeToggle').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
window.nativeMessage=toast;
get('closeImage').onclick=()=>window.closePicture?window.closePicture():get('imageViewer').hidden=true;
new MutationObserver(()=>{if(native)Native.setSystemBarsMode(!get('imageViewer').hidden?2:document.querySelector('.sheet[role=dialog]:not([hidden])')?1:0);}).observe(get('imageViewer'),{attributes:true,attributeFilter:['hidden']});
window.onNativeBack=()=>{if(!get('imageViewer').hidden){get('closeImage').click();return;}if(window.cancelPendingPicture?.())return;if(document.querySelector('.sheet[role=dialog]:not([hidden])'))closeSheet();else if(window.closeCourseSettings?.())return;else if(native)Native.exitApp();};
window.onNativeThemeChanged=()=>{if(theme==='system')setTheme(theme);};
setTheme(theme,false);

matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(theme==='system')setTheme(theme);});

document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!get('imageViewer').hidden)get('closeImage').click();else if(document.querySelector('.sheet[role=dialog]:not([hidden])'))closeSheet();else window.closeCourseSettings?.();}});
