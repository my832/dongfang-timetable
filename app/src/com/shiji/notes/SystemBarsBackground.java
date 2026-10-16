package cn.zufedfc.timetable;
import android.graphics.*;
import android.animation.ValueAnimator;
import android.view.animation.PathInterpolator;
import android.graphics.drawable.Drawable;

/** One window-sized surface behind the WebView and transparent system bars. */
public final class SystemBarsBackground extends Drawable {
    private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
    private int topInset,bottomInset;
    private final boolean continuous;
    private int base,bottom;
    private boolean initialized,appearanceDark;
    private int appearanceMode;
    private Shader[] glows;
    private float darkProgress;
    private ValueAnimator themeAnimator;
    private boolean motionEnabled=true;
    public void setMotionEnabled(boolean enabled){motionEnabled=enabled;}
    private int blend(int light,int dark){
        float t=darkProgress;
        return Color.argb(Math.round(Color.alpha(light)+(Color.alpha(dark)-Color.alpha(light))*t),Math.round(Color.red(light)+(Color.red(dark)-Color.red(light))*t),Math.round(Color.green(light)+(Color.green(dark)-Color.green(light))*t),Math.round(Color.blue(light)+(Color.blue(dark)-Color.blue(light))*t));
    }
    private void updatePalette(){
        base=blend(0xfff5f6f2,0xff17211e);bottom=base;
        if(appearanceMode==1)bottom=blend(0xfff7faf4,0xff203028);
        else if(appearanceMode==2)base=bottom=0xff0c1518;
        glows=null;invalidateSelf();
    }
    public SystemBarsBackground(){this(false);}
    public SystemBarsBackground(boolean continuous){this.continuous=continuous;setAppearance(false,0);}
    public void setInsets(int top,int bottom){int nextTop=Math.max(0,top),nextBottom=Math.max(0,bottom);if(topInset==nextTop&&bottomInset==nextBottom)return;topInset=nextTop;bottomInset=nextBottom;invalidateSelf();}
    public void setAppearance(boolean dark,int mode){
        if(initialized&&appearanceDark==dark&&appearanceMode==mode)return;
        boolean animate=initialized&&appearanceDark!=dark&&continuous&&motionEnabled&&ValueAnimator.areAnimatorsEnabled();
        if(themeAnimator!=null){themeAnimator.cancel();themeAnimator=null;}
        initialized=true;appearanceDark=dark;appearanceMode=mode;
        if(animate){
            themeAnimator=ValueAnimator.ofFloat(darkProgress,dark?1f:0f);
            themeAnimator.setDuration(360);
            themeAnimator.setInterpolator(new PathInterpolator(.22f,.68f,0f,1f));
            themeAnimator.addUpdateListener(animation->{darkProgress=(float)animation.getAnimatedValue();updatePalette();});
            themeAnimator.start();
        }else{darkProgress=dark?1f:0f;updatePalette();}
    }

    private Shader glow(float x,float y,float rx,float ry,int color){
        RadialGradient shader=new RadialGradient(0,0,1,new int[]{color,color&0x00ffffff},null,Shader.TileMode.CLAMP);
        Matrix transform=new Matrix();transform.setScale(Math.max(1,rx),Math.max(1,ry));transform.postTranslate(x,y);shader.setLocalMatrix(transform);return shader;
    }
    @Override public void draw(Canvas canvas){
        Rect b=getBounds();paint.setShader(null);paint.setColor(base);canvas.drawRect(b,paint);
        if(continuous&&appearanceMode!=2&&b.width()>0&&b.height()>0){
            if(glows==null){float w=b.width(),h=b.height();glows=new Shader[]{
                glow(b.left+w*.08f,b.top+h*.05f,w*.76f,h*.57f,blend(0x54a4d8c4,0x423a9171)),
                glow(b.left+w*.98f,b.top+h*.43f,w*.75f,h*.54f,blend(0x47accae8,0x2c4070a1)),
                glow(b.left+w*.25f,b.top+h*.95f,w*.78f,h*.54f,blend(0x42ecd7af,0x1fbd895a))};}
            paint.setColor(Color.WHITE);for(Shader glow:glows){paint.setShader(glow);canvas.drawRect(b,paint);}paint.setShader(null);
        }
        if(appearanceMode==1&&bottomInset>0){paint.setColor(bottom);canvas.drawRect(b.left,Math.max(b.top,b.bottom-bottomInset),b.right,b.bottom,paint);}
        // Match the WebView's glass modal scrim in the otherwise uncovered status area.
        if(appearanceMode==1&&topInset>0){paint.setColor(0x4711231d);canvas.drawRect(b.left,b.top,b.right,Math.min(b.bottom,b.top+topInset),paint);}
    }
    @Override public void setAlpha(int alpha){}
    @Override protected void onBoundsChange(Rect bounds){glows=null;}
    @Override public void setColorFilter(ColorFilter filter){}
    @Override public int getOpacity(){return PixelFormat.OPAQUE;}
}
