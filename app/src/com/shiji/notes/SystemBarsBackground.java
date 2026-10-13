package cn.zufedfc.timetable;
import android.graphics.*;
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
    public SystemBarsBackground(){this(false);}
    public SystemBarsBackground(boolean continuous){this.continuous=continuous;setAppearance(false,0);}
    public void setInsets(int top,int bottom){int nextTop=Math.max(0,top),nextBottom=Math.max(0,bottom);if(topInset==nextTop&&bottomInset==nextBottom)return;topInset=nextTop;bottomInset=nextBottom;invalidateSelf();}
    public void setAppearance(boolean dark,int mode){
        if(initialized&&appearanceDark==dark&&appearanceMode==mode)return;
        initialized=true;appearanceDark=dark;appearanceMode=mode;glows=null;
        base=dark?Color.rgb(23,33,30):Color.rgb(245,246,242);
        bottom=base;
        if(mode==1){bottom=dark?Color.rgb(32,48,40):Color.rgb(247,250,244);}
        else if(mode==2){base=bottom=Color.rgb(12,21,24);}
        invalidateSelf();
    }
    private Shader glow(float x,float y,float rx,float ry,int color){
        RadialGradient shader=new RadialGradient(0,0,1,new int[]{color,color&0x00ffffff},null,Shader.TileMode.CLAMP);
        Matrix transform=new Matrix();transform.setScale(Math.max(1,rx),Math.max(1,ry));transform.postTranslate(x,y);shader.setLocalMatrix(transform);return shader;
    }
    @Override public void draw(Canvas canvas){
        Rect b=getBounds();paint.setShader(null);paint.setColor(base);canvas.drawRect(b,paint);
        if(continuous&&appearanceMode!=2&&b.width()>0&&b.height()>0){
            if(glows==null){float w=b.width(),h=b.height();glows=new Shader[]{
                glow(b.left+w*.08f,b.top+h*.05f,w*.76f,h*.57f,appearanceDark?0x423a9171:0x54a4d8c4),
                glow(b.left+w*.98f,b.top+h*.43f,w*.75f,h*.54f,appearanceDark?0x2c4070a1:0x47accae8),
                glow(b.left+w*.25f,b.top+h*.95f,w*.78f,h*.54f,appearanceDark?0x1fbd895a:0x42ecd7af)};}
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
