package cn.zufedfc.timetable;

import android.app.PendingIntent;
import android.appwidget.*;
import android.content.*;
import android.os.Bundle;
import android.widget.RemoteViews;
import org.json.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.io.File;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class CourseWidget extends AppWidgetProvider {
    private static int id(Context c,String name,String type){return c.getResources().getIdentifier(name,type,c.getPackageName());}
    public static void updateAll(Context c){
        AppWidgetManager manager=AppWidgetManager.getInstance(c);
        for(Class<?> type:new Class<?>[]{CourseWidget.class,NotesWidget.class})for(int widgetId:manager.getAppWidgetIds(new ComponentName(c,type)))update(c,manager,widgetId,type==NotesWidget.class);
    }
    static void update(Context c,AppWidgetManager manager,int widgetId,boolean notes){
        try{manager.updateAppWidget(widgetId,views(c,manager,widgetId,notes));}catch(Exception ignored){}
    }
    static RemoteViews views(Context c,AppWidgetManager manager,int widgetId,boolean notes)throws Exception{
            Bundle options=manager.getAppWidgetOptions(widgetId);int height=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,220);int rows=height>=320?5:height>=240?3:height>=190?2:1;
            RemoteViews views=new RemoteViews(c.getPackageName(),id(c,"widget_notes","layout"));
            List<String> lines=new ArrayList<>();String subtitle;
            if(notes){
                File file=new File(c.getFilesDir(),"notes.json");JSONArray items=file.exists()?new JSONObject(new String(Files.readAllBytes(file.toPath()),StandardCharsets.UTF_8)).getJSONArray("notes"):new JSONArray();
                for(int i=0;i<items.length();i++){JSONObject item=items.getJSONObject(i);if("active".equals(item.optString("location"))&&"resident".equals(item.optString("column"))){String title=item.optString("title","");if(title.isEmpty())title=item.optString("body","");if(title.isEmpty())title="图片 / 附件便签";String mark="urgent".equals(item.optString("status"))?"🔴 ":"important".equals(item.optString("status"))?"🟠 ":"🔵 ";lines.add(mark+title.replace('\n',' '));}}
                subtitle=lines.isEmpty()?"添加一张常驻便签":lines.size()+" 张便签";
            }else{
                LocalDate today=LocalDate.now(CourseStore.ZONE);JSONArray items=CourseStore.read(c).getJSONArray("courses");long now=System.currentTimeMillis();int total=0;
                for(int i=0;i<items.length();i++){JSONObject item=items.getJSONObject(i);ZonedDateTime start=Instant.ofEpochMilli(item.getLong("start")).atZone(CourseStore.ZONE);if(!start.toLocalDate().equals(today))continue;total++;if(item.getLong("end")<=now)continue;lines.add((item.getLong("start")<=now?"上课中 ":start.format(DateTimeFormatter.ofPattern("HH:mm"))+" ")+item.getString("name")+(item.optString("place").isEmpty()?"":"\n"+item.optString("place")));}
                JSONObject state=CourseStore.read(c);boolean pending=state.optJSONArray("rules")!=null&&state.getJSONArray("rules").length()>0&&items.length()==0;
                subtitle=pending?"请先设置教学周和作息时间":today.format(DateTimeFormatter.ofPattern("M月d日"))+" · "+(total==0?"今天没有课":lines.isEmpty()?"今日课程已结束":"还有 "+lines.size()+" 节课");
            }
            views.setTextViewText(id(c,"widget_title","id"),notes?"常驻便签":"今日课程");views.setTextViewText(id(c,"widget_subtitle","id"),subtitle);
            for(int i=0;i<5;i++){int viewId=id(c,"widget_row"+i,"id");views.setViewVisibility(viewId,i<Math.min(rows,lines.size())?android.view.View.VISIBLE:android.view.View.GONE);if(i<lines.size())views.setTextViewText(viewId,lines.get(i));}
            views.setTextViewText(id(c,"widget_more","id"),lines.size()>rows?"另有 "+(lines.size()-rows)+" 条 · 点击查看":"点击打开东方课表");
            Intent intent=new Intent(c,MainActivity.class).setAction("cn.zufedfc.timetable.WIDGET_OPEN_"+widgetId).putExtra(notes?"openResident":"openCourses",true).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
            views.setOnClickPendingIntent(id(c,"widget_root","id"),PendingIntent.getActivity(c,widgetId,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
            Intent refresh=new Intent(c,notes?NotesWidget.class:CourseWidget.class).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE).putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS,new int[]{widgetId});
            views.setOnClickPendingIntent(id(c,"widget_refresh","id"),PendingIntent.getBroadcast(c,widgetId,refresh,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));return views;
    }
    @Override public void onUpdate(Context c,AppWidgetManager manager,int[] ids){for(int widgetId:ids)update(c,manager,widgetId,this instanceof NotesWidget);CourseAlarm.schedule(c);}
    @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager manager,int id,Bundle options){update(c,manager,id,this instanceof NotesWidget);}
}
