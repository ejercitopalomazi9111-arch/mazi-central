/* Formato. Va aparte porque lo usan la página y el generador de la versión
   sin JavaScript, y si se duplica, un día dejan de decir lo mismo. */
export const MES = ['enero','febrero','marzo','abril','mayo','junio','julio',
                    'agosto','septiembre','octubre','noviembre','diciembre'];

/* minutos locales → «06:21». Se admite pasar de 24 h o quedarse por debajo de
   cero: en los husos que no cuadran con su meridiano, la puesta puede caer
   después de medianoche. */
export function hhmm(min){
  if(min === null || min === undefined) return '—';
  let m = Math.round(min) % 1440; if(m < 0) m += 1440;
  return String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0');
}

/* horas decimales → «13 h 18 m» */
export function duracion(h){
  const t = Math.round(h * 60);
  return Math.floor(t/60) + ' h ' + String(t%60).padStart(2,'0') + ' m';
}

/* diferencia en minutos, con signo y palabra */
export function cambio(min){
  const s = Math.round(min);
  if(s === 0) return 'igual que ayer';
  const m = Math.abs(s);
  return (s > 0 ? '+' : '−') + m + ' min ' + (s > 0 ? 'más' : 'menos') + ' que ayer';
}
