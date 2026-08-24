# Kit de colaborador

Para que el Claude de alguien de Grupo Mazi trabaje como el de la casa **sin
perder lo suyo y sin llevarse nada de Carlos**.

## Cómo se instala

```bash
git clone --depth 1 https://github.com/ejercitopalomazi9111-arch/mazi-central
cd mazi-central

# Windows
powershell -ExecutionPolicy Bypass -File kit-colaborador\instalar.ps1

# Mac o Linux
bash kit-colaborador/instalar.sh
```

Al final te dice qué entró, qué ya tenías y qué chocó. Nada más.

## Las tres promesas

**1 · No pierdes lo que ya tienes.** Si ya tienes una skill con el mismo
nombre, **la tuya no se toca**: la de Mazi entra al lado con el sufijo
`-mazi`, y al final se te dice cuáles fueron para que las compares y te quedes
con lo que sirva. Nunca se sobrescribe.

**2 · No se toca tu memoria.** Ni un archivo. Lo que tu Claude aprendió
contigo es tuyo.

**3 · No te llevas nada de Carlos.** Aquí no viajan sus proyectos, sus
clientes, sus precios ni su memoria personal. Sólo el método.

Además, antes de tocar nada se hace **respaldo** de tus skills en
`~/.claude/respaldos/skills-<fecha>`. Si algo sale mal, borras la carpeta de
skills y copias esa de vuelta.

## Por qué esto y no el `setup.ps1` del repo `palomazi`

Aquel script hacía exactamente lo contrario de lo que hace falta:

| Lo que hacía | Por qué no sirve aquí |
|---|---|
| `Copy-Item -Recurse -Force` sobre las skills | **Pisa** cualquier skill del mismo nombre. El compañero pierde la suya |
| `Copy-Item -Force` sobre `memoria/` | **Pisa la memoria del compañero** con la de Carlos. Es justo «perder sus aprendizajes» |
| Se instala desde el repo `palomazi` | Ese repo trae **395 MB de proyectos de Carlos** y su memoria personal. Clonarlo ya es darle acceso a todo |
| Instala Node, Python, gh y git con `winget` | Eso sigue estando bien, pero es otra cosa: es preparar la máquina, no compartir la forma de trabajar |

Y un detalle que importa: la memoria que copiaba incluye
`user_carlos_palomazi.md` y `feedback_tono_carlos.md`. En la máquina de un
compañero, eso hace que su Claude crea que trabaja para Carlos y le hable con
las reglas de Carlos. No es lo que nadie quiere.

**El `setup.ps1` sigue sirviendo para lo suyo:** montar la máquina de Carlos
desde cero. Lo que no sirve es para un tercero.

## Sobre el acceso a los repos

Este kit **no pide ninguna llave** ni acceso a nada de Carlos. Se clona un
repo público, se copian archivos locales y se acabó.

Si algún día un colaborador necesita trabajar en un proyecto concreto, se le
da **ese repositorio** — no una llave que abra todos. Es la diferencia entre
prestar una herramienta y prestar el taller.

## Las pruebas

```bash
bash kit-colaborador/pruebas.sh
```

Levantan un Claude de mentiras que **ya tiene skills propias**, incluida una
que choca de nombre, y comprueban las tres promesas midiendo los archivos
—huella byte por byte de la memoria y del `CLAUDE.md`—, no leyendo el código.

La última vuelve a meter el defecto a propósito: pisa la skill a mano y
comprueba que la prueba lo detecta. Una prueba que no puede fallar no es una
prueba.

## Qué se instala

- Las **14 skills** de la casa, de `.claude/skills/`.
- `CLAUDE-mazi.md` con la forma de trabajar: la regla de construir lo propio,
  las reglas técnicas, y cómo se prueba —que es donde se gana o se pierde—.

Va en archivo aparte a propósito. Para engancharlo, se le pega una línea al
`CLAUDE.md` propio:

```
@~/.claude/CLAUDE-mazi.md
```

Así el colaborador decide cuándo lo quiere puesto y cuándo no, y su archivo
sigue siendo suyo.
