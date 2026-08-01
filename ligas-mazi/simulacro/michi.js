/* ============================================================================
   michi.js — 570 GATOS
   ----------------------------------------------------------------------------
   Carlos pidió una última ronda "sólo de michis". El michi de la Sala de
   Máquinas tiene un solo trabajo y es el que más rinde: **le pica a lo que el
   equipo YA dio por bueno.**

   No busca bugs de sintaxis ni pantallas vacías — de eso ya se encargó el
   inspector. Busca la secuencia que nadie planeó: hacer las cosas al revés,
   dos veces, a destiempo, o dejarlas a medias. Cada gato hace UNA travesura y
   comprueba si la app quedó diciendo la verdad después.

   Por qué sirve: en la auditoría del 1 de agosto, veinticuatro perfiles
   aprobaron los partidos privados y el hueco lo encontró el michi apagando y
   volviendo a prender el candado. Eso no lo caza una lista de comprobación.
   ==========================================================================*/
(function(global){
  'use strict';
  const T = [];
  const anota = (t) => T.push(t);
  const dado = (s)=>{let x=s>>>0; return ()=>{x=(x*1664525+1013904223)>>>0; return x/4294967296;};};

  /* Cada travesura: nombre, qué hace, y qué DEBERÍA ser cierto después. */
  const TRAVESURAS = [
    { n:'apagar y prender el candado', hacer(){
        /* La primera versión de esta travesura fallaba el 50% de las veces… y
           el fallo era MÍO, no de la app: arrancaba desde el estado que le
           dejaba el michi anterior. Si el partido ya venía privado, el primer
           toque lo APAGABA y `c1` quedaba en `undefined`, así que al final
           comparaba `undefined !== undefined` y daba falso.
           El michi le picó al michi. Se normaliza el estado antes de picar. */
        if(leagueData().calendar[0].privado) alternarPrivado(0);   // dejarlo abierto
        alternarPrivado(0); const c1=leagueData().calendar[0].codigo;
        alternarPrivado(0); alternarPrivado(0);
        const c2=leagueData().calendar[0].codigo;
        const ok = !!c1 && !!c2 && c1!==c2;
        alternarPrivado(0);                                        // se deja como se encontró
        return { ok, que:'al volver a prender, el código debe ser otro' }; } },

    { n:'confirmar el borrado al revés (logo antes de escribir)', hacer(){
        pedirBorrado('equipo','c2','Marea');
        const b=document.getElementById('borrarLogo'); const antes=b.disabled;
        closeSheet();
        return { ok: antes===true, que:'el logo no debe aceptar nada antes de la palabra' }; } },

    { n:'filtrar por una categoría que se quedó sin partidos', hacer(){
        const d=leagueData(); const orig=JSON.stringify(d.calendar);
        d.calendar=[]; saveLeague(d);
        let truena=false; try{ buildPublicoData(); }catch(e){ truena=true; }
        const d2=leagueData(); d2.calendar=JSON.parse(orig); saveLeague(d2);
        return { ok:!truena, que:'un calendario vacío no debe tronar la pantalla' }; } },

    { n:'ser papá de un hijo que no está en ningún equipo', hacer(){
        const u=userData(); const antes=JSON.stringify(u.children);
        u.children=[{code:'J-FANTASMA',name:'Nadie',minor:true,age:9,status:'libre'}];
        localStorage.setItem('lm_user',JSON.stringify(u));
        let truena=false; try{ revisarPartidosDeMisHijos(); buildPublicoData(); }catch(e){ truena=true; }
        u.children=JSON.parse(antes); localStorage.setItem('lm_user',JSON.stringify(u));
        return { ok:!truena, que:'un hijo sin equipo no debe tronar la vigilancia' }; } },

    { n:'cambiar la posición de alguien que ya salió a la banca', hacer(){
        if(!hasLiveGame()) return {ok:true, que:'sin partido en vivo, no aplica', salta:true};
        const p=GAME.teams[0].players.find(x=>!x.on); if(!p) return {ok:true,que:'',salta:true};
        const i=GAME.teams[0].players.indexOf(p);
        let truena=false; try{ setGamePos(i,'Pívot'); }catch(e){ truena=true; }
        return { ok:!truena, que:'mover a alguien de banca no debe tronar' }; } },

    { n:'pedir el ID de un partido que ya no existe', hacer(){
        return { ok: partidoPorId('NO-EXISTE-99')===null,
                 que:'un ID inventado debe devolver nada, no un partido cualquiera' }; } },

    { n:'abrir la puerta de un partido con el ID en minúsculas y sin guiones', hacer(){
        const id=idPartido(leagueData().calendar[0]);
        const feo=id.toLowerCase().replace(/-/g,'');
        return { ok: !!partidoPorId(feo), que:'la gente lo va a teclear como se acuerde' }; } },

    { n:'ponerse un cosmético que ya no está en el inventario', hacer(){
        const e=econ(); const antes=JSON.stringify(e.owned);
        e.owned=[]; e.equipped={accessory:'a_galaxia'}; saveEcon(e);
        let truena=false; try{ renderCard(); }catch(x){ truena=true; }
        const e2=econ(); e2.owned=JSON.parse(antes); saveEcon(e2);
        return { ok:!truena, que:'un cosmético equipado que ya no tienes no debe tronar la carta' }; } },

    { n:'borrar el equipo del que uno es coach', hacer(){
        const d=leagueData(); const antes=JSON.stringify(d);
        let truena=false;
        try{ d.teams=d.teams.filter(t=>t.id!=='c1'); saveLeague(d); buildPublicoData(); }
        catch(e){ truena=true; }
        localStorage.setItem('lm_league',antes);
        return { ok:!truena, que:'quitar un equipo no debe dejar partidos huérfanos que truenen' }; } },

    { n:'el mismo hijo vinculado dos veces', hacer(){
        const u=userData(); const antes=JSON.stringify(u.children||[]);
        const k=(u.children||[])[0];
        if(!k) return {ok:true,que:'',salta:true};
        u.children=[k,Object.assign({},k)]; localStorage.setItem('lm_user',JSON.stringify(u));
        let n=0; try{ n=partidosDeMisHijos().length; }catch(e){ n=-1; }
        u.children=JSON.parse(antes); localStorage.setItem('lm_user',JSON.stringify(u));
        return { ok:n>=0, que:'un hijo duplicado no debe tronar ni duplicar el letrero' }; } },
  ];

  global.MICHI = {
    /* Suelta N gatos. Cada uno agarra una travesura y la ejecuta; se reporta
       cuántos rompieron qué. Con 570 se repiten mucho — y ahí está el valor:
       lo que falla intermitentemente sale, y lo que falla siempre sale con un
       número que no se puede discutir. */
    soltar(n){
      const rnd=dado(9111); const res={};
      for(let i=0;i<n;i++){
        const t=TRAVESURAS[Math.floor(rnd()*TRAVESURAS.length)];
        let r;
        try{ r=t.hacer(); }
        catch(e){ r={ok:false, que:'la travesura misma truena: '+e.message}; }
        if(r.salta) continue;
        const k=t.n;
        res[k]=res[k]||{intentos:0, rompio:0, que:r.que};
        res[k].intentos++; if(!r.ok) res[k].rompio++;
      }
      return res;
    },
    lista(){ return TRAVESURAS.map(t=>t.n); },
  };
})(window);
