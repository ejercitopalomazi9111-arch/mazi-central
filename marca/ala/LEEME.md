# La paloma del ala · el logo de Grupo Mazi

Carlos, 28 de octubre de 2026: *«del logo mantenlo como estaba y de hecho usa el que te di del ala
como referencia, vectoriza hasta que esté idéntico»*. La referencia es la n.º 6 de la hoja que mandó
(`ref.png`, recortada de su captura): la paloma de plumas con tres líneas de circuito, y debajo
«GRUPO MAZI».

## Lo que hay

| Archivo | Qué es |
|---|---|
| `ala.svg` | el símbolo solo, en `currentColor` |
| `logo.svg` · `logo-blanco.svg` | el logo completo, en las mismas proporciones que la referencia |
| `ref.png`, `ref-grupo.png`, `ref-mazi.png` | la referencia, para medir contra ella |

`salida/` (no se sube) trae los PNG grandes y las copias para mandar.

## Cómo se hizo, y cómo se repite

```
python3.13 ajustar.py 1.0 0.9 150 4   # el símbolo: ala.svg, y cuánto coincide con la referencia
python3.13 armar.py                   # el logo con las letras: logo.svg y logo-blanco.svg
node letra.mjs mazi|grupo             # qué letra es (sale Montserrat Bold y SemiBold)
```

- **Calcarla tal cual coincide al 99.4 %, pero con el serrucho de la captura** (`trazar.py`): círculos
  chuecos y rectas que tiemblan. Por eso `ajustar.py` separa lo geométrico de lo orgánico:
  - los tres círculos se miden (centro, radio por dentro y por fuera) y se dibujan perfectos;
  - las líneas del circuito se enderezan a 45° y en horizontal;
  - las plumas y el cuello se alisan sin mover sus puntas.
  
  Queda en **96.4 % de coincidencia**: lo que falta es el borde borroso de la captura, no la forma.
- **Las letras no se calcan: se midieron.** `letra.mjs` escribe «MAZI» y «GRUPO» con 25 letras y las
  compara pixel a pixel. Gana **Montserrat**, Bold para MAZI (85 %) y SemiBold para GRUPO (82 %).
  `armar.py` las convierte en trazos y pone cada letra centrada donde está en la referencia.
- **Colores medidos:**
  - símbolo y MAZI en `#16181C`;
  - GRUPO en gris `#5A5A5C`.
- **Montserrat** tiene licencia SIL Open Font License, así que convertirla en trazos para un logo está permitido.
