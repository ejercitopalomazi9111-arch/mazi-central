package mx.grupomazi.carymo;

import android.content.Context;
import android.util.Base64;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;

/**
 * Lo que la app (carymo/widget.js) le deja a los widgets: los datos en SharedPreferences y la foto
 * del cuarto en un PNG dentro de la app. Después se les pide a los widgets que se vuelvan a pintar.
 */
@CapacitorPlugin(name = "CarymoWidget")
public class CarymoWidgetPlugin extends Plugin {

    @PluginMethod
    public void guardar(PluginCall call) {
        Context ctx = getContext();
        String datos = call.getString("datos", "");
        String imagen = call.getString("imagen", "");
        try {
            if (datos != null && !datos.isEmpty()) {
                ctx.getSharedPreferences(WidgetDatos.PREFS, Context.MODE_PRIVATE).edit().putString(WidgetDatos.LLAVE, datos).apply();
            }
            if (imagen != null && !imagen.isEmpty()) {
                byte[] png = Base64.decode(imagen, Base64.DEFAULT);
                File f = new File(ctx.getFilesDir(), WidgetDatos.FOTO);
                File tmp = new File(ctx.getFilesDir(), WidgetDatos.FOTO + ".tmp");
                try (FileOutputStream o = new FileOutputStream(tmp)) { o.write(png); }
                if (!tmp.renameTo(f)) { f.delete(); tmp.renameTo(f); }
            }
            WidgetDatos.refrescarTodos(ctx);
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo guardar el widget: " + e.getMessage());
        }
    }
}
