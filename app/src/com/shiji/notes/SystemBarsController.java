package cn.zufedfc.timetable;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Insets;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.widget.FrameLayout;

/** Shared safe-area and contrast handling for the local UI and school browser. */
public final class SystemBarsController {
    private final Window window;
    private final FrameLayout root;
    private final SystemBarsBackground background;
    private boolean dark;
    private int mode;
    private int windowColor;

    public SystemBarsController(Activity activity,FrameLayout root,SystemBarsBackground background,boolean dark){
        this.window=activity.getWindow();this.root=root;this.background=background;
        // Some ROMs create the decor lazily; initialize it before requesting its controller.
        window.getDecorView();
        window.setStatusBarColor(Color.TRANSPARENT);window.setNavigationBarColor(Color.TRANSPARENT);
        if(Build.VERSION.SDK_INT>=29){window.setStatusBarContrastEnforced(false);window.setNavigationBarContrastEnforced(false);}
        if(Build.VERSION.SDK_INT>=30)window.setDecorFitsSystemWindows(false);
        if(Build.VERSION.SDK_INT>=28){WindowManager.LayoutParams attrs=window.getAttributes();attrs.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;window.setAttributes(attrs);}
        root.setBackground(background);
        root.setOnApplyWindowInsetsListener((view,insets)->{
            int left,top,right,bottom;
            if(Build.VERSION.SDK_INT>=30){
                // Visibility changes during keyboard/window transitions must not move the header.
                Insets safe=insets.getInsetsIgnoringVisibility(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());
                Insets ime=insets.getInsets(WindowInsets.Type.ime());
                left=safe.left;top=safe.top;right=safe.right;bottom=Math.max(safe.bottom,ime.bottom);
            }else{
                left=Math.max(insets.getSystemWindowInsetLeft(),insets.getStableInsetLeft());
                top=Math.max(insets.getSystemWindowInsetTop(),insets.getStableInsetTop());
                right=Math.max(insets.getSystemWindowInsetRight(),insets.getStableInsetRight());
                bottom=Math.max(insets.getSystemWindowInsetBottom(),insets.getStableInsetBottom());
                if(Build.VERSION.SDK_INT>=28&&insets.getDisplayCutout()!=null){
                    left=Math.max(left,insets.getDisplayCutout().getSafeInsetLeft());
                    top=Math.max(top,insets.getDisplayCutout().getSafeInsetTop());
                    right=Math.max(right,insets.getDisplayCutout().getSafeInsetRight());
                    bottom=Math.max(bottom,insets.getDisplayCutout().getSafeInsetBottom());
                }
            }
            if(root.getPaddingLeft()!=left||root.getPaddingTop()!=top||root.getPaddingRight()!=right||root.getPaddingBottom()!=bottom)root.setPadding(left,top,right,bottom);
            background.setInsets(top,bottom);
            return Build.VERSION.SDK_INT>=30?WindowInsets.CONSUMED:insets.consumeSystemWindowInsets();
        });
        setAppearance(dark,0);root.requestApplyInsets();
    }
    public void setAppearance(boolean dark,int mode){
        this.dark=dark;this.mode=mode;
        background.setAppearance(dark,mode);
        int next=dark?Color.rgb(23,33,30):Color.rgb(245,246,242);
        if(windowColor!=next){windowColor=next;window.setBackgroundDrawable(new ColorDrawable(next));}
        refresh();
    }
    public void refresh(){
        boolean lightIcons=dark||mode==2;
        if(Build.VERSION.SDK_INT>=30){
            WindowInsetsController controller=window.getInsetsController();
            int mask=WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
            int wanted=lightIcons?0:mask;
            if(controller!=null&&(controller.getSystemBarsAppearance()&mask)!=wanted)controller.setSystemBarsAppearance(wanted,mask);
        }else{
            int layout=View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
            int wanted=layout|(lightIcons?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
            if(window.getDecorView().getSystemUiVisibility()!=wanted)window.getDecorView().setSystemUiVisibility(wanted);
        }
    }
}
