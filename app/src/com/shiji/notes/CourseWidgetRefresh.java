package cn.zufedfc.timetable;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** Widget-only alarm, separate from reminder delivery and its last-delivered marker. */
public final class CourseWidgetRefresh extends BroadcastReceiver {
    public static final String ACTION="cn.zufedfc.timetable.COURSE_WIDGET_REFRESH";
    private static PendingIntent pending(Context c){return PendingIntent.getBroadcast(c,232,new Intent(c,CourseWidgetRefresh.class).setAction(ACTION),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    public static void schedule(Context c){
        AlarmManager manager=c.getSystemService(AlarmManager.class);if(manager==null)return;
        // Read the store before taking the scheduling lock. CourseStore.write also
        // refreshes widgets while it holds its lock, so the reverse order can deadlock.
        boolean installed=AppWidgetManager.getInstance(c).getAppWidgetIds(new ComponentName(c,CourseWidget.class)).length>0;
        long next=0;
        try{
            if(installed)next=CourseWidget.nextRefresh(CourseStore.read(c),System.currentTimeMillis());
        }catch(Exception ignored){return;}
        synchronized(CourseWidgetRefresh.class){
            PendingIntent p=pending(c);manager.cancel(p);if(!installed)return;
            try{
                // A launcher widget does not need to wake a sleeping phone just to redraw.
                if(Build.VERSION.SDK_INT<31||manager.canScheduleExactAlarms())manager.setExact(AlarmManager.RTC,next,p);
                else manager.setAndAllowWhileIdle(AlarmManager.RTC,next,p);
            }catch(SecurityException e){try{manager.setAndAllowWhileIdle(AlarmManager.RTC,System.currentTimeMillis()+60000,p);}catch(Exception ignored){}}
            catch(Exception ignored){}
        }
    }
    @Override public void onReceive(Context c,Intent intent){if(ACTION.equals(intent.getAction()))CourseWidget.updateAll(c);}
}
