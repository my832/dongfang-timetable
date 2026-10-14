package cn.zufedfc.timetable;

import android.content.Context;
import android.util.AtomicFile;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

public final class CourseStore {
    public static final ZoneId ZONE=ZoneId.of("Asia/Shanghai");
    public static LocalDate monday(LocalDate date){return date.minusDays(date.getDayOfWeek().getValue()-1);}
    public static long midnight(LocalDate date){return date.atStartOfDay(ZONE).toInstant().toEpochMilli();}
    private static AtomicFile file(Context c){return new AtomicFile(new File(c.getFilesDir(),"courses.json"));}
    public static synchronized JSONObject read(Context c){
        try{return validate(new JSONObject(new String(file(c).readFully(),StandardCharsets.UTF_8)));}
        catch(Exception e){try{return new JSONObject("{\"title\":\"我的课程表\",\"courses\":[],\"reminders\":false,\"lead\":20,\"reminderMode\":\"school\"}");}catch(Exception impossible){throw new RuntimeException(impossible);}}
    }
    public static JSONObject validate(JSONObject value)throws Exception{
        JSONArray list=value.getJSONArray("courses");if(list.length()>5000)throw new IOException("课程最多 5000 条");
        List<JSONObject> sorted=new ArrayList<>();Set<String> seen=new HashSet<>();
        for(int i=0;i<list.length();i++){
            JSONObject item=list.getJSONObject(i);String name=item.getString("name").trim();long start=item.getLong("start"),end=item.getLong("end");
            if(name.isEmpty()||name.length()>200||start<946684800000L||start>4102444800000L||end<=start||end-start>86400000L)throw new IOException("课程名称或时间不正确（时间须为毫秒时间戳）");
            String place=item.optString("place",""),teacher=item.optString("teacher","");if(place.length()>300||teacher.length()>300)throw new IOException("课程信息过长");
            String key=name+"|"+start+"|"+end+"|"+place+"|"+teacher;
            if(seen.add(key))sorted.add(new JSONObject().put("name",name).put("start",start).put("end",end).put("place",place).put("teacher",teacher).put("sections",item.optString("sections","").substring(0,Math.min(50,item.optString("sections","").length()))));
        }
        sorted.sort(Comparator.comparingLong((JSONObject a)->a.optLong("start")).thenComparingLong(a->a.optLong("end")));
        List<JSONObject> merged=new ArrayList<>();
        for(JSONObject item:sorted){
            JSONObject previous=merged.isEmpty()?null:merged.get(merged.size()-1);
            int[] before=previous==null?null:sectionRange(previous.optString("sections","")),after=sectionRange(item.optString("sections",""));
            long gap=previous==null?Long.MAX_VALUE:item.optLong("start")-previous.optLong("end");
            if(previous!=null&&before!=null&&after!=null&&before[1]+1==after[0]&&gap>=0&&gap<=10*60_000L
                    &&Instant.ofEpochMilli(previous.optLong("start")).atZone(ZONE).toLocalDate().equals(Instant.ofEpochMilli(item.optLong("start")).atZone(ZONE).toLocalDate())
                    &&sameCourse(previous,item)){
                previous.put("end",item.getLong("end"));previous.put("sections",before[0]+"–"+after[1]+" 节");
                if(previous.optString("place").isEmpty())previous.put("place",item.optString("place",""));
                if(previous.optString("teacher").isEmpty())previous.put("teacher",item.optString("teacher",""));
            }else merged.add(item);
        }
        JSONArray normalized=new JSONArray();for(JSONObject item:merged)normalized.put(item);
        String mode=value.optString("reminderMode","school");if(!mode.equals("school"))mode="custom";
        int lead=mode.equals("school")?20:value.optInt("lead",20);if(lead!=5&&lead!=10&&lead!=15&&lead!=20&&lead!=30)lead=20;
        String title=value.optString("title","我的课程表");if(title.length()>200)title=title.substring(0,200);
        JSONObject valid=new JSONObject().put("title",title).put("courses",normalized).put("reminders",value.optBoolean("reminders",false)).put("lead",lead).put("reminderMode",mode).put("updated",value.optLong("updated",0));
        if(value.has("rules")){
            JSONArray rules=value.getJSONArray("rules");if(rules.length()>1000)throw new IOException("课程安排过多");
            for(int i=0;i<rules.length();i++){JSONObject r=rules.getJSONObject(i);if(r.getString("name").isEmpty()||r.getString("name").length()>200||r.getInt("day")<1||r.getInt("day")>7||r.getInt("first")<1||r.getInt("last")<r.getInt("first")||r.getInt("last")>30||r.optString("place").length()>300||r.optString("teacher").length()>300)throw new IOException("教学安排格式不正确");JSONArray weeks=r.getJSONArray("weeks");if(weeks.length()>30)throw new IOException("周次过多");for(int j=0;j<weeks.length();j++)if(weeks.getInt(j)<1||weeks.getInt(j)>30)throw new IOException("周次不正确");}
            String monday=value.optString("semesterMonday","");if(!monday.isEmpty()&&LocalDate.parse(monday).getDayOfWeek()!=DayOfWeek.MONDAY)throw new IOException("第 1 教学周必须从周一开始");
            JSONArray slots=value.optJSONArray("slots");if(slots==null)slots=new JSONArray();if(slots.length()>30)throw new IOException("节次过多");for(int i=0;i<slots.length();i++)if(slots.getString(i).length()>20)throw new IOException("作息时间格式不正确");
            valid.put("rules",rules).put("semesterMonday",monday).put("slots",slots);
        }
        return valid;
    }
    private static String comparable(String value){return value==null?"":value.replaceAll("\\s+"," ").trim().toLowerCase(Locale.ROOT);}
    private static boolean sameCourse(JSONObject a,JSONObject b){
        if(!comparable(a.optString("name")).equals(comparable(b.optString("name"))))return false;
        String ap=comparable(a.optString("place")),bp=comparable(b.optString("place")),at=comparable(a.optString("teacher")),bt=comparable(b.optString("teacher"));
        return (ap.isEmpty()||bp.isEmpty()||ap.equals(bp))&&(at.isEmpty()||bt.isEmpty()||at.equals(bt));
    }
    private static int[] sectionRange(String value){
        String normalized=value==null?"":value.replaceAll("\\s+","").replace('–','-').replace('—','-');
        java.util.regex.Matcher m=java.util.regex.Pattern.compile("^(?:第)?(\\d+)(?:-(\\d+))?节?$").matcher(normalized);
        if(!m.matches())return null;
        try{int first=Integer.parseInt(m.group(1)),last=m.group(2)==null?first:Integer.parseInt(m.group(2));return first>0&&last>=first?new int[]{first,last}:null;}catch(NumberFormatException e){return null;}
    }
    public static synchronized void write(Context c,JSONObject value)throws Exception{
        JSONObject valid=validate(value);AtomicFile f=file(c);FileOutputStream out=null;
        try{out=f.startWrite();out.write(valid.toString().getBytes(StandardCharsets.UTF_8));f.finishWrite(out);}catch(Exception e){if(out!=null)f.failWrite(out);throw e;}
        CourseWidget.updateAll(c);CourseAlarm.schedule(c);
    }
    public static JSONObject parseImport(JSONObject response,LocalDate week)throws Exception{
        if(response.has("courses"))return validate(response);
        if(response.has("code")&&response.optInt("code")!=0)throw new IOException(response.optInt("code")==-4?"登录已失效，请重新登录":"学校接口返回失败，请稍后重试");
        JSONObject data=response.optJSONObject("data");if(data==null)data=response;
        JSONArray items=data.optJSONArray("list");if(items==null)throw new IOException("文件不是支持的课表 JSON");
        JSONArray courses=new JSONArray();
        for(int i=0;i<items.length();i++){
            JSONObject row=items.getJSONObject(i),course=row.optJSONObject("course"),desc=row.optJSONObject("description");if(course==null||desc==null)throw new IOException("课程缺少 course/description 信息");
            long start=row.optLong("begin_time",0),end=row.optLong("end_time",0);
            if(start>0&&start<100000000000L)start*=1000;if(end>0&&end<100000000000L)end*=1000;
            if(start==0||end==0){
                int day=desc.optInt("week_day",0);String[] time=row.optString("course_time","").replace('～','-').replace('—','-').split("-");
                if(day<1||day>7||time.length!=2)throw new IOException("课程没有有效日期或上课时间");
                LocalDate date=monday(week).plusDays(day-1);
                start=date.atTime(LocalTime.parse(time[0].trim(),DateTimeFormatter.ofPattern("H:mm"))).atZone(ZONE).toInstant().toEpochMilli();
                end=date.atTime(LocalTime.parse(time[1].trim(),DateTimeFormatter.ofPattern("H:mm"))).atZone(ZONE).toInstant().toEpochMilli();
            }
            String place=desc.optString("position","");if(place.isEmpty()){JSONArray places=course.optJSONArray("position_list");if(places!=null&&places.length()>0)place=places.optString(0);}
            String teacher=course.optString("teacher_name_list","");if(teacher.isEmpty()&&course.optJSONObject("teacher")!=null)teacher=course.getJSONObject("teacher").optString("name","");
            courses.put(new JSONObject().put("name",course.optString("name","")).put("start",start).put("end",end).put("place",place).put("teacher",teacher).put("sections",desc.optInt("begin_index",0)>0?desc.optInt("begin_index")+"–"+desc.optInt("end_index",desc.optInt("begin_index"))+" 节":""));
        }
        return validate(new JSONObject().put("title",data.optString("title","导入课程表")).put("courses",courses));
    }
    public static synchronized int merge(Context c,JSONObject imported,Long from,Long to)throws Exception{
        JSONObject current=read(c);JSONArray combined=new JSONArray(),old=current.getJSONArray("courses"),fresh=imported.getJSONArray("courses");
        if(imported.has("rules")){imported.put("reminders",false).put("lead",current.optInt("lead",20)).put("reminderMode",current.optString("reminderMode","school"));write(c,imported);CourseAlarm.reset(c);return fresh.length();}
        for(int i=0;i<old.length();i++){JSONObject item=old.getJSONObject(i);long start=item.getLong("start");if(from==null||start<from||start>=to)combined.put(item);}
        for(int i=0;i<fresh.length();i++)combined.put(fresh.getJSONObject(i));
        current.put("courses",combined).put("title",imported.optString("title","我的课程表")).put("updated",System.currentTimeMillis());write(c,current);return fresh.length();
    }
}
