package cn.zufedfc.timetable;

import android.app.PendingIntent;
import android.appwidget.*;
import android.content.*;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;
import org.json.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.io.File;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class CourseWidget extends AppWidgetProvider {
    private static final DateTimeFormatter CLOCK=DateTimeFormatter.ofPattern("HH:mm");
    private static final String[] WEEKDAYS={"","周一","周二","周三","周四","周五","周六","周日"};
    private static int id(Context c,String name,String type){return c.getResources().getIdentifier(name,type,c.getPackageName());}
    private static int view(Context c,String name){return id(c,name,"id");}
    private static int dp(Context c,int value){return Math.round(value*c.getResources().getDisplayMetrics().density);}

    public static void updateAll(Context c){
        AppWidgetManager manager=AppWidgetManager.getInstance(c);
        for(Class<?> type:new Class<?>[]{CourseWidget.class,NotesWidget.class})for(int widgetId:manager.getAppWidgetIds(new ComponentName(c,type)))update(c,manager,widgetId,type==NotesWidget.class);
        CourseWidgetRefresh.schedule(c);
    }
    static void update(Context c,AppWidgetManager manager,int widgetId,boolean notes){
        try{manager.updateAppWidget(widgetId,views(c,manager,widgetId,notes));}catch(Exception ignored){}
    }
    static RemoteViews views(Context c,AppWidgetManager manager,int widgetId,boolean notes)throws Exception{
        return notes?notesViews(c,manager,widgetId):courseViews(c,manager,widgetId);
    }

    // A fixed time is used here so transitions can be checked independently of the launcher.
    static JSONObject snapshot(JSONObject state,long now)throws Exception{
        LocalDate today=Instant.ofEpochMilli(now).atZone(CourseStore.ZONE).toLocalDate();
        JSONArray courses=state.getJSONArray("courses");List<JSONObject> upcoming=new ArrayList<>();int todayCount=0;
        for(int i=0;i<courses.length();i++){
            JSONObject course=courses.getJSONObject(i);if(course.getLong("end")<=now)continue;
            upcoming.add(course);if(date(course.getLong("start")).equals(today))todayCount++;
        }
        upcoming.sort(Comparator.comparingLong(a->a.optLong("start")));
        JSONObject current=null,next=null;
        for(JSONObject course:upcoming){if(course.getLong("start")<=now){if(current==null||course.getLong("end")<current.getLong("end"))current=course;}else if(next==null)next=course;}
        JSONObject focus=current!=null?current:next;
        JSONArray extra=new JSONArray();
        if(focus!=null){LocalDate focusDate=date(focus.getLong("start"));for(JSONObject course:upcoming)if(course!=focus&&date(course.getLong("start")).equals(focusDate))extra.put(course);}
        boolean pending=state.optJSONArray("rules")!=null&&state.optJSONArray("rules").length()>0&&courses.length()==0;
        return new JSONObject().put("todayCount",todayCount).put("active",current!=null).put("pending",pending).put("focus",focus==null?JSONObject.NULL:focus).put("extra",extra).put("hasTimetable",courses.length()>0||state.optJSONArray("rules")!=null&&state.optJSONArray("rules").length()>0);
    }
    static long nextRefresh(JSONObject state,long now)throws Exception{
        LocalDate today=date(now);long next=CourseStore.midnight(today.plusDays(1));
        JSONArray courses=state.getJSONArray("courses");
        for(int i=0;i<courses.length();i++){
            JSONObject course=courses.getJSONObject(i);long start=course.getLong("start"),end=course.getLong("end");
            for(long boundary:new long[]{start-20*60000L,start,end})if(boundary>now)next=Math.min(next,boundary);
        }
        return next;
    }
    private static LocalDate date(long instant){return Instant.ofEpochMilli(instant).atZone(CourseStore.ZONE).toLocalDate();}
    private static String clock(long instant){return Instant.ofEpochMilli(instant).atZone(CourseStore.ZONE).format(CLOCK);}
    private static String relativeDate(LocalDate day,LocalDate today){if(day.equals(today))return "今日";if(day.equals(today.plusDays(1)))return "明日";return day.format(DateTimeFormatter.ofPattern("M月d日"))+" "+WEEKDAYS[day.getDayOfWeek().getValue()];}
    private static String sections(JSONObject course){String sections=course.optString("sections").trim();return sections.isEmpty()?"":sections.startsWith("第")?sections:"第 "+sections;}
    private static void text(Context c,RemoteViews views,String name,CharSequence value){views.setTextViewText(view(c,name),value);}
    private static void visible(Context c,RemoteViews views,String name,boolean show){views.setViewVisibility(view(c,name),show?View.VISIBLE:View.GONE);}

    static RemoteViews courseViews(Context c,AppWidgetManager manager,int widgetId)throws Exception{
        long now=System.currentTimeMillis();LocalDate today=date(now);JSONObject model=snapshot(CourseStore.read(c),now),focus=model.optJSONObject("focus");
        Bundle options=manager.getAppWidgetOptions(widgetId);int height=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,220),width=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,250);
        boolean compact=height<215,narrow=width<240;int rows=height>=445?4:height>=395?3:height>=350?2:height>=305?1:0;
        RemoteViews views=new RemoteViews(c.getPackageName(),id(c,"widget_courses","layout"));
        text(c,views,"course_widget_date",narrow?"":today.format(DateTimeFormatter.ofPattern("M月d日"))+" "+WEEKDAYS[today.getDayOfWeek().getValue()]);
        views.setViewPadding(view(c,"course_widget_root"),dp(c,compact?12:16),dp(c,compact?10:14),dp(c,compact?12:16),dp(c,compact?10:14));
        views.setViewPadding(view(c,"course_widget_focus"),dp(c,compact?12:14),dp(c,compact?8:12),dp(c,compact?12:14),dp(c,compact?8:12));
        views.setTextViewTextSize(view(c,"course_widget_name"),TypedValue.COMPLEX_UNIT_SP,compact||narrow?18:21);
        views.setTextViewTextSize(view(c,"course_widget_place"),TypedValue.COMPLEX_UNIT_SP,compact?19:narrow?21:25);
        views.setInt(view(c,"course_widget_name"),"setMaxLines",height<280?1:2);
        views.setInt(view(c,"course_widget_time"),"setMaxLines",narrow?2:1);
        visible(c,views,"course_widget_badge",!compact);
        visible(c,views,"course_widget_footer",!compact);
        visible(c,views,"course_widget_countdown",false);
        JSONArray extras=model.getJSONArray("extra");
        if(focus!=null){
            LocalDate focusDate=date(focus.getLong("start"));boolean sameDay=focusDate.equals(today),active=model.getBoolean("active");String day=relativeDate(focusDate,today);
            String badge=active?"上课中":sameDay?(focus.getLong("start")-now<=20*60000L?"即将上课":"下一节课"):day+"上课";
            text(c,views,"course_widget_heading",compact?badge:"课程表");
            text(c,views,"course_widget_badge",badge);
            text(c,views,"course_widget_name",focus.getString("name"));
            String place=focus.optString("place");text(c,views,"course_widget_place",place.isEmpty()?"教室待定":place);
            text(c,views,"course_widget_time",(sections(focus).isEmpty()?"":sections(focus)+" · ")+clock(focus.getLong("start"))+"–"+clock(focus.getLong("end")));
            boolean countdown=sameDay&&!compact;
            visible(c,views,"course_widget_countdown",countdown);
            long boundary=active?focus.getLong("end"):focus.getLong("start");
            views.setChronometer(view(c,"course_widget_countdown"),SystemClock.elapsedRealtime()+boundary-now,active?"距下课 %s":"距上课 %s",countdown);
            views.setChronometerCountDown(view(c,"course_widget_countdown"),true);
            text(c,views,"course_widget_list_title",sameDay?"今日剩余 · "+model.getInt("todayCount")+" 节":day+" · "+(extras.length()+1)+" 节");
            text(c,views,"course_widget_footer",sameDay?(extras.length()>rows?"另有 "+(extras.length()-rows)+" 节 · 查看课表":"点击查看课表"):model.getInt("todayCount")==0?"今日无课 · 点击查看课表":"点击查看课表");
        }else{
            views.setChronometer(view(c,"course_widget_countdown"),SystemClock.elapsedRealtime(),"%s",false);
            boolean pending=model.getBoolean("pending"),has=model.getBoolean("hasTimetable");
            text(c,views,"course_widget_heading",compact?(pending?"课表待设置":has?"课程已结束":"还没有课表"):"课程表");
            text(c,views,"course_widget_badge",pending?"课表待设置":has?"课程已结束":"还没有课表");
            text(c,views,"course_widget_name",pending?"设置学期日期":has?"近期没有课程":"导入你的课程");
            text(c,views,"course_widget_place",pending?"设置后自动匹配":has?"本学期安排已结束":"点击开始导入");
            text(c,views,"course_widget_time",pending?"已保留导入的课程安排":has?"查看课表可切换学期":"课表导入后自动更新");
            text(c,views,"course_widget_footer",pending?"点击设置学期":has?"点击查看课表":"点击导入课表");
        }
        visible(c,views,"course_widget_list_title",rows>0&&extras.length()>0);
        for(int i=0;i<4;i++){
            visible(c,views,"course_widget_row"+i,i<rows&&i<extras.length());
            if(i<extras.length()){
                JSONObject course=extras.getJSONObject(i);String place=course.optString("place");
                text(c,views,"course_widget_row_time"+i,course.getLong("start")<=now?"上课中":clock(course.getLong("start")));
                text(c,views,"course_widget_row_name"+i,course.getString("name"));
                text(c,views,"course_widget_row_place"+i,place.isEmpty()?clock(course.getLong("start"))+"–"+clock(course.getLong("end")):place);
            }
        }
        bindClicks(c,views,widgetId,false,"course_widget_root","course_widget_refresh");
        return views;
    }

    // Keep resident notes on their existing layout and sizing behavior.
    private static RemoteViews notesViews(Context c,AppWidgetManager manager,int widgetId)throws Exception{
        Bundle options=manager.getAppWidgetOptions(widgetId);int height=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,220);int rows=height>=320?5:height>=240?3:height>=190?2:1;
        RemoteViews views=new RemoteViews(c.getPackageName(),id(c,"widget_notes","layout"));
        List<String> lines=new ArrayList<>();File file=new File(c.getFilesDir(),"notes.json");JSONArray items=file.exists()?new JSONObject(new String(Files.readAllBytes(file.toPath()),StandardCharsets.UTF_8)).getJSONArray("notes"):new JSONArray();
        for(int i=0;i<items.length();i++){JSONObject item=items.getJSONObject(i);if("active".equals(item.optString("location"))&&"resident".equals(item.optString("column"))){String title=item.optString("title","");if(title.isEmpty())title=item.optString("body","");if(title.isEmpty())title="图片 / 附件便签";String mark="urgent".equals(item.optString("status"))?"🔴 ":"important".equals(item.optString("status"))?"🟠 ":"🔵 ";lines.add(mark+title.replace('\n',' '));}}
        text(c,views,"widget_title","常驻便签");text(c,views,"widget_subtitle",lines.isEmpty()?"添加一张常驻便签":lines.size()+" 张便签");
        for(int i=0;i<5;i++){visible(c,views,"widget_row"+i,i<Math.min(rows,lines.size()));if(i<lines.size())text(c,views,"widget_row"+i,lines.get(i));}
        text(c,views,"widget_more",lines.size()>rows?"另有 "+(lines.size()-rows)+" 条 · 点击查看":"点击打开东方课表");
        bindClicks(c,views,widgetId,true,"widget_root","widget_refresh");return views;
    }
    private static void bindClicks(Context c,RemoteViews views,int widgetId,boolean notes,String root,String refreshId){
        Intent intent=new Intent(c,MainActivity.class).setAction("cn.zufedfc.timetable.WIDGET_OPEN_"+widgetId).putExtra(notes?"openResident":"openCourses",true).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        views.setOnClickPendingIntent(view(c,root),PendingIntent.getActivity(c,widgetId,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
        Intent refresh=new Intent(c,notes?NotesWidget.class:CourseWidget.class).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE).putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS,new int[]{widgetId});
        views.setOnClickPendingIntent(view(c,refreshId),PendingIntent.getBroadcast(c,widgetId,refresh,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
    }
    @Override public void onUpdate(Context c,AppWidgetManager manager,int[] ids){for(int widgetId:ids)update(c,manager,widgetId,this instanceof NotesWidget);if(this instanceof NotesWidget)CourseAlarm.schedule(c);CourseWidgetRefresh.schedule(c);}
    @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager manager,int id,Bundle options){update(c,manager,id,this instanceof NotesWidget);CourseWidgetRefresh.schedule(c);}
    @Override public void onDeleted(Context c,int[] ids){CourseWidgetRefresh.schedule(c);}
    @Override public void onDisabled(Context c){CourseWidgetRefresh.schedule(c);}
}
