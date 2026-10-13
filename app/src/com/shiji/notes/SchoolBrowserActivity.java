package cn.zufedfc.timetable;

import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.*;
import android.util.AtomicFile;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

public class SchoolBrowserActivity extends Activity {
    public static final String COURSE_URL="http://jwglxt.zufedfc.edu.cn/jwglxt/kbcx/xskbcx_cxXskbcxIndex.html?gnmkdm=N2151&layout=default";
    private SystemBarsController barsController;
    private WebView web;private TextView status;private ProgressBar progress;private Button importButton;
    private String account="",password="";private boolean loginAttempted=false,loginInProgress=false,courseNavigated=false,importing=false,dark=false,pageFailed=false;
    private int loginWaits=0;
    private int tries=0;private final Handler handler=new Handler(Looper.getMainLooper());
    private static String pendingAccount="",pendingPassword="";
    public static synchronized void launch(Activity parent,String user,String pass){pendingAccount=user;pendingPassword=pass;try{parent.startActivityForResult(new Intent(parent,SchoolBrowserActivity.class),105);}catch(RuntimeException e){pendingAccount="";pendingPassword="";throw e;}}
    private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
    static boolean allowed(String address){try{Uri uri=Uri.parse(address);String host=uri.getHost();return ("http".equals(uri.getScheme())||"https".equals(uri.getScheme()))&&uri.getUserInfo()==null&&(uri.getPort()==-1||uri.getPort()==80||uri.getPort()==443)&&("jwglxt.zufedfc.edu.cn".equalsIgnoreCase(host)||"cas.paas.zufedfc.edu.cn".equalsIgnoreCase(host));}catch(Exception e){return false;}}
    private int foreground(){return Color.parseColor(dark?"#eef4eb":"#234d3e");}
    private Button button(String label){Button b=new Button(this);b.setText(label);b.setTextSize(15);b.setTextColor(foreground());b.setAllCaps(false);b.setMinWidth(0);return b;}
    @Override public void onCreate(Bundle saved){
        dark=(getResources().getConfiguration().uiMode&Configuration.UI_MODE_NIGHT_MASK)==Configuration.UI_MODE_NIGHT_YES;
        try{JSONObject notes=new JSONObject(new String(new AtomicFile(new File(getFilesDir(),"notes.json")).readFully(),StandardCharsets.UTF_8));String theme=notes.optString("theme","system");if(theme.equals("dark"))dark=true;else if(theme.equals("light"))dark=false;}catch(Exception ignored){}
        int style=getResources().getIdentifier(dark?"AppThemeDark":"AppThemeLight","style",getPackageName());if(style!=0)setTheme(style);super.onCreate(saved);
        synchronized(SchoolBrowserActivity.class){account=pendingAccount;password=pendingPassword;pendingAccount="";pendingPassword="";}
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        FrameLayout root=new FrameLayout(this);SystemBarsBackground bars=new SystemBarsBackground();barsController=new SystemBarsController(this,root,bars,dark);
        LinearLayout content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);content.setBackgroundColor(Color.parseColor(dark?"#17211e":"#f5f6f2"));root.addView(content,new FrameLayout.LayoutParams(-1,-1));setContentView(root);
        LinearLayout toolbar=new LinearLayout(this);toolbar.setGravity(Gravity.CENTER_VERTICAL);toolbar.setPadding(dp(6),0,dp(6),0);content.addView(toolbar,new LinearLayout.LayoutParams(-1,dp(54)));
        Button close=button("返回");close.setOnClickListener(v->finish());toolbar.addView(close,new LinearLayout.LayoutParams(dp(66),-1));TextView title=new TextView(this);title.setText("教务课表");title.setTextColor(foreground());title.setTextSize(18);toolbar.addView(title,new LinearLayout.LayoutParams(0,-2,1));
        Button course=button("课表");course.setOnClickListener(v->{tries=0;courseNavigated=true;web.loadUrl(COURSE_URL);});toolbar.addView(course,new LinearLayout.LayoutParams(dp(62),-1));Button refresh=button("刷新");refresh.setOnClickListener(v->{tries=0;web.reload();});toolbar.addView(refresh,new LinearLayout.LayoutParams(dp(62),-1));
        progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);content.addView(progress,new LinearLayout.LayoutParams(-1,dp(3)));
        status=new TextView(this);status.setTextColor(foreground());status.setTextSize(12);status.setPadding(dp(14),dp(8),dp(14),dp(8));status.setText("需连接校园网并关闭代理。");content.addView(status,new LinearLayout.LayoutParams(-1,-2));
        web=new WebView(this);content.addView(web,new LinearLayout.LayoutParams(-1,0,1));WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setSaveFormData(false);settings.setCacheMode(WebSettings.LOAD_NO_CACHE);settings.setSupportMultipleWindows(false);settings.setBuiltInZoomControls(true);settings.setDisplayZoomControls(false);settings.setUseWideViewPort(true);settings.setLoadWithOverviewMode(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebChromeClient(new WebChromeClient(){@Override public void onProgressChanged(WebView view,int value){progress.setProgress(value);progress.setVisibility(value==100?View.GONE:View.VISIBLE);}});
        web.setWebViewClient(new WebViewClient(){
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon){pageFailed=false;}
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){if(!allowed(request.getUrl().toString())){status.setText("该链接不是已接入的学校教务地址");return true;}return false;}
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){String scheme=request.getUrl().getScheme();if(("https".equals(scheme)||"http".equals(scheme))&&!allowed(request.getUrl().toString()))return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));return null;}
            @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame()){pageFailed=true;status.setText("联网失败：连接校园网并关闭代理后刷新。");}}
            @Override public void onReceivedHttpError(WebView view,WebResourceRequest request,WebResourceResponse response){if(request.isForMainFrame()){pageFailed=true;status.setText("加载失败（"+response.getStatusCode()+"）。请确认已连接校园网并关闭代理。");}}
            @Override public void onPageFinished(WebView view,String url){if(pageFailed||!allowed(url)||!url.equals(view.getUrl()))return;String path=Uri.parse(url).getPath();if(path!=null&&(path.contains("login")||path.contains("Login"))){fillLogin();}else{status.setText("正在识别课表…");tries=0;handler.postDelayed(()->extract(false),700);}}
        });
        importButton=button("重新识别课表");importButton.setVisibility(View.GONE);importButton.setTextColor(Color.WHITE);GradientDrawable bg=new GradientDrawable();bg.setColor(Color.parseColor("#345e4e"));bg.setCornerRadius(dp(16));importButton.setBackground(bg);LinearLayout.LayoutParams bottom=new LinearLayout.LayoutParams(-1,dp(50));bottom.setMargins(dp(14),dp(10),dp(14),dp(12));content.addView(importButton,bottom);importButton.setOnClickListener(v->{importButton.setVisibility(View.GONE);tries=0;extract(false);});
        web.loadUrl(COURSE_URL);
    }
    private void fillLogin(){
        status.setText(loginAttempted?"请检查账号密码；有验证码时在网页填写后登录":"正在准备学校登录页…");if(loginAttempted||loginInProgress||account.isEmpty()||password.isEmpty())return;
        loginInProgress=true;String script=loginScript(account,password);
        web.evaluateJavascript(script,result->{loginInProgress=false;if(result.contains("waiting")&&++loginWaits<25){handler.postDelayed(()->fillLogin(),300);return;}loginAttempted=true;password="";account="";if(result.contains("captcha"))status.setText("请填写验证码后登录。");else if(result.contains("policy"))status.setText("请阅读并确认登录协议。");else if(result.contains("submitted"))status.setText("正在登录教务系统…");else status.setText("请登录，课表将自动导入。");});
    }
    static String loginScript(String account,String password){
        return "(()=>{if(document.readyState!=='complete'||(window.jQuery&&jQuery.active>0))return 'waiting';const user=document.querySelector('#yhm,#username'),passes=[...document.querySelectorAll('#hidMm,#mm,#password')],button=document.querySelector('#dl,#login_submit,#submitBtn,button[type=submit]');if(!user||!passes.length||!button)return 'manual';user.value="+JSONObject.quote(account)+";for(const pass of passes)pass.value="+JSONObject.quote(password)+";for(const e of [user,...passes]){e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}const captcha=document.querySelector('#yzm,#captcha,#authcode,#verifyCode');if(captcha&&captcha.getClientRects().length&&!captcha.value)return 'captcha';const policy=document.querySelector('#agreePolicy');if(document.querySelector('#userPolicyOn')?.value==='1'&&policy&&!policy.checked)return 'policy';button.click();return 'submitted';})()";
    }
    static String extractionScript(){return "(()=>{function find(doc,depth){let table=doc.querySelector('[id^=kbgrid_table]');if(table)return table;if(depth<3)for(const f of doc.querySelectorAll('iframe,frame')){try{if(f.contentDocument){table=find(f.contentDocument,depth+1);if(table)return table;}}catch(e){}}return null;}const table=find(document,0);if(!table||!table.querySelector('.timetable_con .title'))return '';const clone=table.cloneNode(true),term=clone.rows[0]?.textContent.match(/\\d{4}-\\d{4}学年第\\d学期/);if(clone.rows[0]){clone.rows[0].replaceChildren();const heading=clone.ownerDocument.createElement('td');heading.textContent=term?term[0]:'教务课表';clone.rows[0].appendChild(heading);}for(const e of clone.querySelectorAll('script,style,iframe,img,input,button,form'))e.remove();return clone.outerHTML;})()";}
    private void extract(boolean manual){
        if(importing||pageFailed||web==null||!allowed(web.getUrl()))return;
        // Account fields are never extracted. Only the timetable table is returned.
        web.evaluateJavascript(extractionScript(),value->{
            if(isFinishing())return;try{String html=new JSONArray("["+value+"]").optString(0,"");if(!html.isEmpty()&&!html.equals("null")){
                if(html.getBytes(StandardCharsets.UTF_8).length>2*1024*1024){status.setText("课表过大，请使用 HTML 文件导入");return;}
                importing=true;importButton.setEnabled(false);File output=new File(getCacheDir(),"school-import-"+UUID.randomUUID()+".html");try(FileOutputStream out=new FileOutputStream(output)){out.write(html.getBytes(StandardCharsets.UTF_8));}setResult(RESULT_OK,new Intent().putExtra("courseFile",output.getName()));finish();return;
            }}catch(Exception e){status.setText("课表读取失败，请重试");return;}
            String path=Uri.parse(web.getUrl()).getPath();if(manual){status.setText("未找到课表，请打开个人课表查询。");return;}
            if(path!=null&&!path.contains("kbcx")&&!path.toLowerCase().contains("login")&&!courseNavigated){courseNavigated=true;web.loadUrl(COURSE_URL);return;}
            if(++tries<90)handler.postDelayed(()->extract(false),800);else {status.setText("加载超时：连接校园网并关闭代理后刷新。");importButton.setVisibility(View.VISIBLE);}
        });
    }
    @Override public void finish(){if(web!=null)web.stopLoading();account="";password="";CookieManager.getInstance().removeAllCookies(done->CookieManager.getInstance().flush());super.finish();}
    @Override public void onWindowFocusChanged(boolean focus){super.onWindowFocusChanged(focus);if(focus&&barsController!=null)barsController.refresh();}
    @Override public void onBackPressed(){finish();}
    @Override protected void onDestroy(){handler.removeCallbacksAndMessages(null);account="";password="";if(web!=null){web.stopLoading();web.clearFormData();web.clearCache(true);web.destroy();web=null;}if(isFinishing()){CookieManager.getInstance().removeAllCookies(null);CookieManager.getInstance().flush();WebStorage.getInstance().deleteOrigin("http://jwglxt.zufedfc.edu.cn");WebStorage.getInstance().deleteOrigin("https://jwglxt.zufedfc.edu.cn");WebStorage.getInstance().deleteOrigin("https://cas.paas.zufedfc.edu.cn");}super.onDestroy();}
}
