/* LOS DATOS DEL NEGOCIO · lo único que se toca para hacer un sitio nuevo.
   Todo lo que sale en la página sale de aquí. Si un campo se deja vacío, su
   sección NO se dibuja — no se inventa un dato de un negocio ajeno, que es la
   misma regla que rige el contenido del sitio del Rembrandt y por el mismo
   motivo: publicar algo falso sobre alguien es peor que dejar un hueco. */
window.NEGOCIO = {
  nombre:   'Taller Ejemplo',
  giro:     'Mecánica general y afinación',
  lema:     'Le decimos qué tiene antes de tocarlo.',

  /* Sin el teléfono no hay botón de llamar. Sin whatsapp no hay botón de
     WhatsApp. Se ponen en crudo, como los da el negocio. */
  telefono: '4421234567',
  whatsapp: '524421234567',

  direccion: 'Av. Ejemplo 123, Col. Centro, Santiago de Querétaro',
  /* El enlace del mapa se arma con la dirección; si el negocio tiene su punto
     exacto de Google, se pega aquí y manda éste. */
  mapa: '',

  horarios: [
    ['Lunes a viernes', '9:00 – 19:00'],
    ['Sábado',          '9:00 – 14:00'],
    ['Domingo',         'Cerrado'],
  ],

  servicios: [
    { que: 'Diagnóstico', detalle: 'Se revisa y se le dice qué tiene, con presupuesto antes de empezar.' },
    { que: 'Afinación',   detalle: 'Bujías, filtros y aceite. Mismo día si llega antes de mediodía.' },
    { que: 'Frenos',      detalle: 'Balatas, discos y purgado.' },
    { que: 'Suspensión',  detalle: 'Amortiguadores, bujes y alineación.' },
  ],

  /* Lo que hace que alguien elija a éste y no al de enfrente. Tres, no diez. */
  porque: [
    'Presupuesto por escrito antes de tocar el coche.',
    'Le enseñamos la pieza que se cambió.',
    'Treinta años en la misma esquina.',
  ],

  /* Fotos que el negocio YA tenga, con su texto alterno. Vacío = sin fotos, y
     la página se ve bien igual. */
  fotos: [],

  color: '#1f4e79',    /* el color del negocio, no el nuestro */
  hecho: 'Grupo Mazi',
};
