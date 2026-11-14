package mx.grupomazi.carymo;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.graphics.Bitmap;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONObject;

/** Widget chico (2×2): la mascota en su cuarto, con la racha encima y cómo se siente abajo. */
public class WidgetMascota extends AppWidgetProvider {
    @Override
    public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) {
        JSONObject d = WidgetDatos.leer(ctx);
        Bitmap foto = WidgetDatos.foto(ctx, 360);
        for (int id : ids) {
            RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_mascota);
            if (foto != null) { v.setImageViewBitmap(R.id.foto, foto); v.setViewVisibility(R.id.foto, View.VISIBLE); }
            v.setTextViewText(R.id.racha, WidgetDatos.racha(d));
            boolean viva = d != null && d.optBoolean("rachaViva", false);
            v.setInt(R.id.pastillaRacha, "setBackgroundResource", viva ? R.drawable.widget_pastilla_viva : R.drawable.widget_pastilla);
            v.setTextViewText(R.id.frase, d == null ? "Abre CARYMO" : d.optString("frase", ""));
            v.setOnClickPendingIntent(R.id.raiz, WidgetDatos.abrirApp(ctx));
            m.updateAppWidget(id, v);
        }
    }
}
