'use strict';
const native=typeof window.Native!=='undefined';
const get=id=>document.getElementById(id);
const headerIcons={sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>', moon: '<path d="M20.2 14A8.5 8.5 0 0 1 10 3.8 8.5 8.5 0 1 0 20.2 14Z"/><path d="M17.5 3v4M15.5 5h4"/>'};
function headerIcon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true">${headerIcons[name]}</svg>`;}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
let theme='system',confirmAction=null,toastTimer;
try{theme=JSON.parse(native?Native.loadState():localStorage.getItem('shiji-v1')||'{}').theme||'system';}catch(e){}
function setTheme(value){theme=value;const dark=value==='dark'||(value==='system'&&(native?Native.isSystemDark():matchMedia('(prefers-color-scheme: dark)').matches));document.documentElement.dataset.theme=dark?'dark':'light';get('themeToggle').innerHTML=headerIcon(dark?'sun':'moon');get('themeToggle').setAttribute('aria-label',dark?'切换亮色':'切换暗色');if(native){Native.setTheme(dark);Native.saveState(JSON.stringify({version:1,theme,notes:[],draft:null}));}else localStorage.setItem('shiji-v1',JSON.stringify({theme}));}
function toast(text){get('toast').textContent=text;get('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>get('toast').hidden=true,2500);}
function showSheet(id){if(id==='courseSheet'){get(id).hidden=false;return;}get(id).hidden=false;get('overlay').hidden=false;if(native)Native.setSystemBarsMode(1);}
function closeSheet(){get('confirmSheet').hidden=true;get('overlay').hidden=true;confirmAction=null;if(native)Native.setSystemBarsMode(0);}
function confirmDialog(title,text,action,label='确认'){get('confirmTitle').textContent=title;get('confirmText').textContent=text;get('confirmOkay').textContent=label;confirmAction=action;showSheet('confirmSheet');}
get('confirmCancel').onclick=closeSheet;get('overlay').onclick=closeSheet;
get('confirmOkay').onclick=()=>{const action=confirmAction;closeSheet();if(action)action();};
get('themeToggle').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
window.nativeMessage=toast;
get('closeImage').onclick=()=>get('imageViewer').hidden=true;
new MutationObserver(()=>{if(native)Native.setSystemBarsMode(!get('imageViewer').hidden?2:!get('confirmSheet').hidden?1:0);}).observe(get('imageViewer'),{attributes:true,attributeFilter:['hidden']});
window.onNativeBack=()=>{if(!get('imageViewer').hidden){get('imageViewer').hidden=true;return;}if(!get('confirmSheet').hidden)closeSheet();else if(native)Native.exitApp();};
window.onNativeThemeChanged=()=>{if(theme==='system')setTheme(theme);};
setTheme(theme);
