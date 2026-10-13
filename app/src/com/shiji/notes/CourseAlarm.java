package cn.zufedfc.timetable;

import android.app.*;
import android.content.*;
import android.os.Build;
import org.json.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class CourseAlarm extends BroadcastReceiver {
    public static final String CHANNEL="class_reminders";
    public static boolean exact(Context c){return Build.VERSION.SDK_INT<31||c.getSystemService(AlarmManager.class).canScheduleExactAlarms();}
    public static boolean notifications(Context c){NotificationManager manager=c.getSystemService(NotificationManager.class);NotificationChannel channel=manager.getNotificationChannel(CHANNEL);return manager.areNotificationsEnabled()&&(channel==null||channel.getImportance()!=NotificationManager.IMPORTANCE_NONE);}
    private static PendingIntent pending(Context c){return PendingIntent.getBroadcast(c,230,new Intent(c,CourseAlarm.class).setAction("cn.zufedfc.timetable.COURSE_ALARM"),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    public static void channel(Context c){NotificationChannel channel=new NotificationChannel(CHANNEL,"上课提醒",NotificationManager.IMPORTANCE_HIGH);channel.setDescription("按课程实际日期，在上课前提醒");c.getSystemService(NotificationManager.class).createNotificationChannel(channel);}
    static int leadMinutes(JSONObject state){return "school".equals(state.optString("reminderMode"))?20:state.optInt("lead",20);}
    static long trigger(JSONObject state,JSONObject course){return course.optLong("start")-leadMinutes(state)*60000L;}
    static JSONArray due(JSONObject state,long now,long last)throws Exception{
        JSONArray due=new JSONArray();if(!state.optBoolean("reminders"))return due;
        JSONArray courses=state.getJSONArray("courses");
        for(int i=0;i<courses.length();i++){JSONObject item=courses.getJSONObject(i);long start=item.getLong("start"),trigger=trigger(state,item);if(trigger>last&&trigger<=now&&start>now)due.put(item);}return due;
    }
    static long next(JSONObject state,long now)throws Exception{
        long next=CourseStore.midnight(Instant.ofEpochMilli(now).atZone(CourseStore.ZONE).toLocalDate().plusDays(1));
        if(state.optBoolean("reminders")){JSONArray courses=state.getJSONArray("courses");for(int i=0;i<courses.length();i++){long trigger=trigger(state,courses.getJSONObject(i));if(trigger>now)next=Math.min(next,trigger);}}return next;
    }
    public static synchronized void schedule(Context c){
        channel(c);AlarmManager alarm=c.getSystemService(AlarmManager.class);PendingIntent p=pending(c);alarm.cancel(p);
        try{long next=next(CourseStore.read(c),System.currentTimeMillis());if(exact(c))alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next,p);else alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next,p);}catch(SecurityException e){try{alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,System.currentTimeMillis()+60000,p);}catch(Exception ignored){}}catch(Exception ignored){}
    }
    public static void reset(Context c){c.getSharedPreferences("reminder_runtime",0).edit().putLong("last",System.currentTimeMillis()).apply();schedule(c);}
    @Override public void onReceive(Context c,Intent intent){
        long now=System.currentTimeMillis();String action=intent.getAction();
        if("cn.zufedfc.timetable.COURSE_ALARM".equals(action)){
            try{
                long last=c.getSharedPreferences("reminder_runtime",0).getLong("last",now-86400000L);if(last>now)last=now;
                JSONObject state=CourseStore.read(c);JSONArray items=due(state,now,last);
                if(items.length()>0&&notifications(c)){
                    Map<Long,List<JSONObject>> groups=new TreeMap<>();for(int i=0;i<items.length();i++){JSONObject item=items.getJSONObject(i);long start=item.getLong("start");groups.computeIfAbsent(start,k->new ArrayList<>()).add(item);}
                    for(Map.Entry<Long,List<JSONObject>> entry:groups.entrySet()){
                        StringBuilder lines=new StringBuilder();for(JSONObject item:entry.getValue()){if(lines.length()>0)lines.append('\n');if(!item.optString("sections").isEmpty())lines.append(item.optString("sections")).append(" · ");lines.append(item.getString("name"));if(!item.optString("place").isEmpty())lines.append(" · ").append(item.optString("place"));}
                        long minutes=Math.max(1,(entry.getKey()-now+59999)/60000);String time=Instant.ofEpochMilli(entry.getKey()).atZone(CourseStore.ZONE).format(DateTimeFormatter.ofPattern("HH:mm"));
                        PendingIntent open=PendingIntent.getActivity(c,231,new Intent(c,MainActivity.class).setAction("cn.zufedfc.timetable.OPEN_COURSES").putExtra("openCourses",true).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
                        int icon=c.getResources().getIdentifier("ic_notification","drawable",c.getPackageName());
                        String title=("school".equals(state.optString("reminderMode"))?"课前提醒 · ":"")+time+" 上课 · "+minutes+" 分钟后";
                        Notification n=new Notification.Builder(c,CHANNEL).setSmallIcon(icon).setContentTitle(title).setContentText(lines.toString()).setStyle(new Notification.BigTextStyle().bigText(lines.toString())).setContentIntent(open).setAutoCancel(true).setCategory(Notification.CATEGORY_EVENT).setVisibility(Notification.VISIBILITY_PRIVATE).build();
                        c.getSystemService(NotificationManager.class).notify((int)(entry.getKey()/60000),n);
                    }
                }
            }catch(Exception ignored){}
        }
        c.getSharedPreferences("reminder_runtime",0).edit().putLong("last",now).apply();CourseWidget.updateAll(c);schedule(c);
    }
}
