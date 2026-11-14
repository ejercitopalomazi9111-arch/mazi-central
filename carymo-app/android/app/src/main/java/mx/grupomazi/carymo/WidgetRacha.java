package mx.grupomazi.carymo;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.graphics.Bitmap;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONObject;

/** Widget mediano (4×2): la mascota a la izquierda y, a la derecha, la racha, cómo está (sus tres barras), XP y cubitos. */
public class WidgetRacha extends AppWidgetProvider {
    @Override
    public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) {
        JSONObject d = WidgetDatos.leer(ctx);
        Bitmap foto = WidgetDatos.foto(ctx, 300);
        for (int id : ids) {
            RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_racha);
            if (foto != null) { v.setImageViewBitmap(R.id.foto, foto); v.setViewVisibility(R.id.foto, View.VISIBLE); }
            v.setTextViewText(R.id.racha, WidgetDatos.racha(d));
            v.setTextViewText(R.id.avisoRacha, WidgetDatos.avisoRacha(d));
            if (d != null && !d.optString("mascota", "").isEmpty()) {
                String nivel = d.optInt("nivel", 1) + "";
                v.setTextViewText(R.id.mascota, d.optString("mascota") + " · nivel " + nivel);
                v.setTextViewText(R.id.frase, d.optString("frase", ""));
                v.setProgressBar(R.id.barraHambre, 100, d.optInt("hambre", 80), false);
                v.setProgressBar(R.id.barraLimpieza, 100, d.optInt("limpieza", 80), false);
                v.setProgressBar(R.id.barraAnimo, 100, d.optInt("animo", 80), false);
                v.setViewVisibility(R.id.barras, View.VISIBLE);
            } else {
                v.setTextViewText(R.id.mascota, "Sin compañero");
                v.setTextViewText(R.id.frase, d == null ? "Abre CARYMO" : "Adopta a tu compañero");
                v.setViewVisibility(R.id.barras, View.GONE);
            }
            int cubos = d == null ? 0 : d.optInt("cubos", 0);
            v.setTextViewText(R.id.xp, (d == null ? 0 : d.optInt("xp", 0)) + " XP");
            v.setTextViewText(R.id.cubos, cubos < 0 ? "∞" : String.valueOf(cubos));
            v.setOnClickPendingIntent(R.id.raiz, WidgetDatos.abrirApp(ctx));
            m.updateAppWidget(id, v);
        }
    }
}
