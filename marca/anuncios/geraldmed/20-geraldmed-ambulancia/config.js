/* 20 · Ambulancia en tu evento. Música: «Heroic Age», Kevin MacLeod (CC BY 4.0). */
export default { musica: 'Heroic_Age',
  tomas: [
    { foto: '../marca/ambulancia.jpg', tipo: 'banda', desde: 0, antes: 0 },
    { foto: '../web/cabina.jpg', desde: '02', de: [.5, .55, 1.02], hacia: [.55, .5, 1.14] },
    { foto: 'flores', desde: '03', de: [.52, .6, 1.02], hacia: [.52, .52, 1.14] },
    { foto: '../web/multitud-3.jpg', desde: '04', de: [.5, .6, 1.02], hacia: [.55, .55, 1.12] },
    { foto: '../web/carrera-2.jpg', desde: '04', antes: 1.3, de: [.42, .5, 1.02], hacia: [.5, .5, 1.12] },
    { foto: 'espaldas-cancha', desde: '04', antes: 2.5, de: [.55, .55, 1.1], hacia: [.55, .5, 1.24] },
    { foto: 'pulgares', desde: '05', de: [.53, .42, 1.0], hacia: [.53, .38, 1.06] },
  ],
  titulos: [
    { desde: '01', html: '<span>La ambulancia</span><span class="v">ya está ahí</span>' },
    { desde: '02', html: '<span class="v">Urgencias</span><span class="v">básicas</span><span>todo tu evento</span>' },
    { desde: '03', html: '<span>Paramédicos</span><span class="v">a bordo</span>' },
    { desde: '04', html: '<span>Conciertos</span><span>Carreras</span><span class="v">Torneos</span>' },
    { desde: '05', abajo: true, html: '<span>Nosotros,</span><span class="v">la tranquilidad</span>' },
  ] };
