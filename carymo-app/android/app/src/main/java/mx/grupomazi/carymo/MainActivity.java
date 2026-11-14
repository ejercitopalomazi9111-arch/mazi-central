package mx.grupomazi.carymo;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // el puente con los widgets de la pantalla de inicio (carymo/widget.js lo llama "CarymoWidget")
        registerPlugin(CarymoWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
