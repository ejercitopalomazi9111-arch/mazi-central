package mx.grupomazi.carymo;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import java.io.File;
import org.json.JSONObject;

/** Lo que comparten los dos widgets: leer lo que dejó la app, la foto achicada y el toque que abre CARYMO. */
final class WidgetDatos {
    static final String PREFS = "carymo_widget";
    static final String LLAVE = "datos";
    static final String FOTO = "widget-cuarto.png";

    private WidgetDatos() {}

    static JSONObject leer(Context ctx) {
        try {
            String s = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(LLAVE, null);
            return s == null ? null : new JSONObject(s);
        } catch (Exception e) {
            return null;
        }
    }

    /** La foto del cuarto, achicada: un widget no puede recibir más de ~1 MB por actualización. */
    static Bitmap foto(Context ctx, int anchoMax) {
        File f = new File(ctx.getFilesDir(), FOTO);
        if (!f.exists()) return null;
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(f.getAbsolutePath(), o);
        int escala = 1;
        while (o.outWidth / (escala * 2) >= anchoMax) escala *= 2;
        o.inJustDecodeBounds = false;
        o.inSampleSize = escala;
        return BitmapFactory.decodeFile(f.getAbsolutePath(), o);
    }

    static PendingIntent abrirApp(Context ctx) {
        Intent i = new Intent(ctx, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(ctx, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static String racha(JSONObject d) {
        int n = d == null ? 0 : d.optInt("racha", 0);
        return String.valueOf(n);
    }

    /** El texto de abajo de la racha, como en Duolingo: si hoy todavía no estudias, se avisa. */
    static String avisoRacha(JSONObject d) {
        if (d == null) return "Abre CARYMO para empezar";
        int n = d.optInt("racha", 0);
        if (d.optBoolean("rachaViva", false)) return n == 1 ? "día de racha" : "días de racha";
        return n > 0 ? "¡Estudia hoy para no perderla!" : "Estudia hoy y empieza tu racha";
    }

    static void refrescarTodos(Context ctx) {
        AppWidgetManager m = AppWidgetManager.getInstance(ctx);
        for (Class<?> c : new Class<?>[] { WidgetMascota.class, WidgetRacha.class }) {
            int[] ids = m.getAppWidgetIds(new ComponentName(ctx, c));
            if (ids.length == 0) continue;
            Intent i = new Intent(ctx, c);
            i.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            i.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            ctx.sendBroadcast(i);
        }
    }
}
