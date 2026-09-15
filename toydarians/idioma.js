/* Conmutador de idioma · sin dependencias, sin red, sin servidor. */
(function(){
  var TOY = window.TOY = window.TOY || {}; TOY.g = TOY.g || {};
  var DIC = {"La vitrina":"The showcase","Categorías":"Categories","El cartón":"The card","Contacto":"Contact","Carrito":"Cart","Menú":"Menu","Marcas y líneas":"Brands & lines","La tienda":"The shop","Ver todas las piezas":"See every piece","Tu carrito":"Your cart","¿Buscas algo? Escríbenos":"Looking for something? Write us","Inicio · Vintage Collection":"Home · Vintage Collection","Figuras":"Figures","Ver la categoría":"See the category","Próximamente":"Coming soon","Saltar":"Skip","The Vintage Collection · Escala 3.75″":"The Vintage Collection · 3.75″ scale","Para verdaderos":"For serious","coleccionistas":"collectors","Funko Pop! · Vinilo de 10 cm":"Funko Pop! · 4 inch vinyl","La cabeza":"Big head,","grande,":"and","en serio":"dead serious","Impresión 3D · Hecho por encargo":"3D printing · Made to order","El escenario":"The set piece","que":"they","no venden":"don't sell","Ver la vitrina":"See the showcase","Hablemos":"Let's talk","Descubre la Vintage Collection":"Discover the Vintage Collection","Funko Pop! en Toydarians":"Funko Pop! at Toydarians","Impresión 3D en Toydarians":"3D printing at Toydarians","una por una":"one by one","Ocho cajas,":"Eight boxes,","una repisa":"one shelf","Siete piezas":"Seven pieces","para montar escena":"to build the scene","Orden":"Sort","Todas":"All","Nombre A → Z":"Name A → Z","Nº VC ascendente":"VC number, low to high","Nº VC descendente":"VC number, high to low","Como en la tienda":"As in the shop","Al revés":"Reversed","Precio de menor a mayor":"Price, low to high","Precio de mayor a menor":"Price, high to low","Ver a detalle":"See in detail","Precio a consultar":"Price on request","Ninguna pieza coincide.":"No piece matches.","Buscar por nombre o número VC…":"Search by name or VC number…","Buscar por nombre o película…":"Search by name or film…","Buscar por nombre o serie…":"Search by name or series…","Buscar":"Search","Borrar la búsqueda":"Clear the search","Filtrar por serie":"Filter by series","Expediente":"File","Línea":"Line","Nº de pieza":"Piece no.","Escala":"Scale","Estado":"Condition","Formato":"Format","Entrega":"Delivery","En su cartón original, sin abrir":"On its original card, unopened","Vinilo · caja con ventana":"Vinyl · window box","Caja nueva, sin abrir":"New box, unopened","Impresión 3D por encargo":"3D printed to order","En existencia, o 4–5 días si se imprime":"In stock, or 4–5 days if printed","Agregar al carrito":"Add to cart","Disponible":"Available","Agotado":"Sold out","Agregado ✓":"Added ✓","Toydarians cotiza esta pieza":"Toydarians quotes this piece","Pedir precio por WhatsApp":"Ask the price on WhatsApp","Más de la colección":"More from the collection","Cerrar":"Close","Ver mi carrito":"See my cart","El envío se calcula al pagar, con la dirección que pongas.":"Shipping is worked out at checkout, with the address you enter.","Se paga aquí,":"Pay here,","se envía a tu casa":"delivered to your door","Falta conectar el cobro":"Payment is not connected yet","¿Buscas algo?":"Looking for something?","Si no está aquí,":"If it isn't here,","pregúntalo":"just ask","Se contesta en horario de tienda.":"Answered during shop hours.","Correo":"Email","Teléfono":"Phone","Lo más rápido. El mensaje ya va escrito.":"Fastest. The message is already written.","Para listas largas o fotos.":"For long lists or photos.","Si prefieres hablarlo.":"If you would rather talk.","Precios en pesos mexicanos. Las existencias son las del catálogo y":"Prices in Mexican pesos. Stock is the catalogue’s and","Toydarians confirma cada pedido":"Toydarians confirms every order","ahora mismo":"right now","verla a detalle":"see it in detail","sin abrir":"unopened","al revés":"the other way","en caja":"boxed","precio lo cotiza Toydarians":"price is quoted by Toydarians","Se compra":"Bought","cerrado":"sealed","Eliges tus figuras, pagas con tarjeta o con PayPal, y pones tu dirección en el mismo paso. Sin salir de esta página.":"Pick your figures, pay by card or with PayPal, and enter your address in the same step. Without leaving this page.","Star Wars, The Vintage Collection y las demás marcas son de sus titulares. Este sitio no está afiliado a ellos.":"Star Wars, The Vintage Collection and the other brands belong to their owners. This site is not affiliated with them.","antes de enviarlo; si algo se agotó, se avisa y se devuelve el importe.":"before shipping it; if something sold out, you are told and refunded.","Cada una con sus fotos de la tienda. Toca cualquiera para":"Each with its photos from the shop. Tap any of them to","Fotos de la caja y de la figura suelta. Toca cualquiera para":"Photos of the box and of the loose figure. Tap any of them to","Fotos de las impresiones reales del taller. Toca cualquiera para":"Photos of the workshop’s actual prints. Tap any of them to","Las marcas y líneas del catálogo, con el número de piezas que se pueden comprar aquí":"The brands and lines of the catalogue, with how many pieces can be bought here","Todo lo que":"Everything","hay en la tienda":"the shop carries","Quien colecciona no compra la figura: compra el cartón":"A collector does not buy the figure: they buy the card","Aquí el brillo se mueve":"Here the shine moves","Tronos, bóvedas y bases para montar la escena que la figura no trae. Se imprimen por encargo, así que el":"Thrones, vaults and bases to build the scene the figure does not come with. Printed to order, so the","pieza por pieza.":"piece by piece.","Aquí el número":"Here the","es la pieza, y el cartón se compra cerrado. Toydarians tiene":"number is the piece, and the card is bought sealed. Toydarians has","de The Vintage Collection y":"from The Vintage Collection and","de Hasbro en total.":"from Hasbro in total.",". La curva del blíster, el troquel del colgadero, el brillo que se corre al girarlo.":". The curve of the blister, the die-cut hook, the shine that runs as you turn it.","que la tarjeta — es lo que convence de que hay plástico y no un dibujo de plástico. Arrástrala.":"than the card — that is what convinces you there is plastic and not a drawing of plastic. Drag it.","En esta vitrina hay":"This showcase holds",", y son una selección. Si buscas una figura que no ves —o quieres el precio de una impresión 3D— escríbenos y te decimos si la tenemos.":", and they are a selection. If you are after a figure you cannot see —or want the price of a 3D print— write to us and we will tell you whether we have it.","No incluye la figura.":"The figure is not included.","Si no hay existencia se reserva: unos 4 días sin pintar, 5 pintado.":"If not in stock it can be reserved: about 4 days unpainted, 5 painted.","No incluye la figura. Si no hay existencia se reserva: unos 4 días sin pintar, 5 pintado.":"The figure is not included. If not in stock it can be reserved: about 4 days unpainted, 5 painted.","Back to the Future casi entera y el Mandalorian con el Niño. Ocho figuras":"Nearly all of Back to the Future, plus the Mandalorian with the Child. Eight figures",", con su ventana y su número de serie, listas para el estante.":", with their window and serial number, ready for the shelf."};
  var REGLAS = [["^(\\d+) piezas$","$1 pieces"],["^(\\d+) piezas en esta vitrina$","$1 pieces in this showcase"],["^(\\d+) piezas · (\\d+) en esta vitrina$","$1 pieces · $2 in this showcase"],["^(\\d+) piezas,$","$1 pieces,"],["^Ver las (\\d+) piezas$","See all $1 pieces"],["^Agregar (.+) al carrito$","Add $1 to the cart"]];
  /* El espacio interno se normaliza ANTES de buscar. El HTML viene con saltos
     de línea y sangría del generador, así que un párrafo escrito en tres
     renglones llega al DOM con «
      » en medio y no coincide con ninguna
     clave del diccionario. Se veía como si faltara la traducción de esas dos
     frases; lo que faltaba era colapsar el espacio. */
  function traducir(s){
    s = s.replace(/\s+/g, ' ');
    if (DIC[s]) return DIC[s];
    for (var i = 0; i < REGLAS.length; i++) {
      var re = new RegExp(REGLAS[i][0]);
      if (re.test(s)) return s.replace(re, REGLAS[i][1]);
    }
    return null;
  }
  var ATRIBS = ['placeholder', 'aria-label', 'title'];
  var en = false, dentro = false, ojo = null;

  /* Escribir sólo si cambia. No es micro-optimización: `textContent = x`
     REEMPLAZA los hijos del nodo aunque el texto sea idéntico, y eso es una
     mutación de tipo childList — justo la que escucha el observador de abajo.
     Escribirlo siempre convertía esto en un bucle infinito que colgaba la
     pestaña ANTES de pintar nada; el síntoma era una página que nunca
     terminaba de cargar, sin un solo error en consola. */
  function poner(nodo, prop, valor){
    if (nodo && nodo[prop] !== valor) nodo[prop] = valor;
  }
  try { en = localStorage.getItem('toy.idioma') === 'en'; } catch (_) {}

  function pasar(raiz){
    // Los nodos de texto: se guarda el original en el nodo la primera vez.
    var and = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, null);
    var n, tocar = [];
    while ((n = and.nextNode())) tocar.push(n);
    tocar.forEach(function(t){
      if (t.__es === undefined) t.__es = t.nodeValue;
      var clave = t.__es.trim();
      if (!clave) return;
      if (!en) { if (t.nodeValue !== t.__es) t.nodeValue = t.__es; return; }
      var tr = traducir(clave);
      if (!tr) return;
      // se respeta el espacio de alrededor: quitarlo pega palabras vecinas
      t.nodeValue = t.__es.replace(clave, tr);
    });
    // Y los atributos que también se leen: el marcador de posición del
    // buscador y las etiquetas que sólo oye quien usa lector de pantalla.
    var todos = raiz.querySelectorAll ? raiz.querySelectorAll('*') : [];
    [].forEach.call(todos, function(el){
      ATRIBS.forEach(function(a){
        var v = el.getAttribute(a); if (v === null) return;
        var g = '__' + a.replace('-', '');
        if (el[g] === undefined) el[g] = v;
        var tr = en ? traducir(el[g].trim()) : null;
        el.setAttribute(a, tr || el[g]);
      });
    });
  }

  function aplicar(){
    dentro = true;
    document.documentElement.lang = en ? 'en' : 'es';
    pasar(document.body);
    var b = document.getElementById('g-idioma');
    if (b) {
      b.setAttribute('aria-pressed', en ? 'true' : 'false');
      poner(b.firstChild, 'textContent', en ? 'ES' : 'EN');
      b.setAttribute('aria-label', en ? 'Ver este sitio en español'
                                      : 'Read this site in English');
    }
    // Se vacía la cola del observador ANTES de bajar la bandera: las
    // mutaciones se entregan en microtarea, o sea después de este `return`, y
    // sin esto llegarían con `dentro` ya en false y volverían a disparar todo.
    if (ojo) ojo.takeRecords();
    dentro = false;
  }
  TOY.g.idioma = function(){ return en ? 'en' : 'es'; };
  TOY.g.reidioma = aplicar;

  function arrancar(){
    var b = document.getElementById('g-idioma');
    if (b) b.addEventListener('click', function(){
      en = !en;
      try { localStorage.setItem('toy.idioma', en ? 'en' : 'es'); } catch (_) {}
      aplicar();
    });
    aplicar();
    /* La ficha y el carrito se arman al vuelo DESPUES de esto, asi que sin
       observador se quedaban en español: el visitante ponia EN, abria una
       figura y el expediente salia en el otro idioma. `dentro` corta la
       realimentacion —traducir cambia texto, y ese cambio vuelve a disparar
       al observador—. */
    if (window.MutationObserver) {
      ojo = new MutationObserver(function(ms){
        if (dentro) return;
        var hay = ms.some(function(m){ return m.addedNodes.length > 0; });
        if (hay) aplicar();
      });
      ojo.observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
