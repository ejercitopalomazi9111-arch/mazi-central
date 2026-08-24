# ============================================================================
#  KIT DE COLABORADOR - GRUPO MAZI
#  Instala la FORMA DE TRABAJAR de la casa en el Claude de un colaborador.
#
#  Uso:  powershell -ExecutionPolicy Bypass -File kit-colaborador\instalar.ps1
# ----------------------------------------------------------------------------
#  LAS TRES PROMESAS, que son la razon de que este archivo exista:
#
#   1. NO PIERDES LO QUE YA TIENES. Si ya tienes una skill con el mismo
#      nombre, la tuya NO se toca: la de Mazi entra al lado con el sufijo
#      "-mazi" y al final se te dice cuales fueron. Nunca se sobrescribe.
#
#   2. NO SE TOCA TU MEMORIA. Ni un archivo.
#
#   3. NO TE LLEVAS NADA DE CARLOS. Ni proyectos, ni clientes, ni precios,
#      ni su memoria personal. Solo el metodo.
#
#  Esto REEMPLAZA al viejo setup.ps1 del repo `palomazi`, que hacia
#  Copy-Item -Force sobre las skills Y sobre la memoria: o sea que borraba
#  exactamente lo que aqui se promete conservar.
# ============================================================================
$ErrorActionPreference = "Continue"

$aqui    = $PSScriptRoot
$repo    = Split-Path $aqui -Parent
$origen  = Join-Path $repo ".claude\skills"
$casa    = if ($env:CLAUDE_HOME) { $env:CLAUDE_HOME } else { Join-Path $env:USERPROFILE ".claude" }
$destino = Join-Path $casa "skills"
$sello   = Get-Date -Format "yyyyMMdd-HHmmss"
$respaldo= Join-Path $casa "respaldos\skills-$sello"

function Paso($t){ Write-Host "`n>> $t" -ForegroundColor Yellow }
function Ok($t)  { Write-Host "   OK  $t" -ForegroundColor Green }
function Mal($t) { Write-Host "   !!  $t" -ForegroundColor Red }
function Gris($t){ Write-Host "   ..  $t" -ForegroundColor DarkGray }

Write-Host @"

  GRUPO MAZI - kit de colaborador
  Si no existe la herramienta, se construye la herramienta.

"@ -ForegroundColor DarkYellow

if (-not (Test-Path $origen)) {
  Mal "No encuentro $origen. Corre esto desde el repo clonado."
  exit 1
}

# ---------- 1. Respaldo, ANTES de tocar nada ----------
Paso "Respaldando lo que ya tienes"
if (Test-Path $destino) {
  New-Item -ItemType Directory -Force -Path $respaldo | Out-Null
  Copy-Item "$destino\*" -Destination $respaldo -Recurse -Force -ErrorAction SilentlyContinue
  Ok "copia de tus skills en $respaldo"
  Gris "si algo sale mal: borra $destino y copia esa carpeta de vuelta"
} else {
  New-Item -ItemType Directory -Force -Path $destino | Out-Null
  Gris "no tenias skills todavia; se crea $destino"
}

# ---------- 2. Las skills, SIN pisar las tuyas ----------
Paso "Instalando las skills de la casa"
$nuevas = 0; $alado = 0; $iguales = 0
$chocaron = @()

Get-ChildItem $origen -Directory | ForEach-Object {
  $nombre  = $_.Name
  $destSk  = Join-Path $destino $nombre

  if (-not (Test-Path $destSk)) {
    Copy-Item $_.FullName -Destination $destSk -Recurse -Force
    Ok $nombre
    $script:nuevas++
    return
  }

  # Ya existe. Si es identica, no hay nada que hacer.
  $mias  = Get-ChildItem $destSk -Recurse -File | Sort-Object FullName
  $suyas = Get-ChildItem $_.FullName -Recurse -File | Sort-Object FullName
  $igual = $false
  if ($mias.Count -eq $suyas.Count) {
    $igual = $true
    for ($i = 0; $i -lt $mias.Count; $i++) {
      if ((Get-FileHash $mias[$i].FullName).Hash -ne (Get-FileHash $suyas[$i].FullName).Hash) {
        $igual = $false; break
      }
    }
  }
  if ($igual) { Gris "$nombre - ya la tenias igual, no se toca"; $script:iguales++; return }

  # Es distinta: LA TUYA MANDA. La de Mazi entra al lado.
  Copy-Item $_.FullName -Destination (Join-Path $destino "$nombre-mazi") -Recurse -Force
  Mal "$nombre - ya tenias una TUYA y es distinta"
  Gris "la de Mazi quedo como $nombre-mazi - compáralas y quedate con lo que sirva"
  $script:chocaron += $nombre
  $script:alado++
}

# ---------- 3. El CLAUDE.md, que se AGREGA y no reemplaza ----------
Paso "Poniendo la forma de trabajar"
$archivoCasa = Join-Path $casa "CLAUDE-mazi.md"
Copy-Item (Join-Path $aqui "CLAUDE-colaborador.md") -Destination $archivoCasa -Force
Ok "metodo de la casa en $archivoCasa"
Gris "va en archivo APARTE: tu CLAUDE.md no se toca."
Gris "Para engancharlo, pegale esta linea a tu CLAUDE.md:"
Write-Host "`n      @$archivoCasa`n" -ForegroundColor Cyan

# ---------- 4. Lo que NO se hizo, dicho en voz alta ----------
Paso "Lo que NO se toco, a proposito"
Gris "tu memoria - ni un archivo. Lo que tu Claude aprendio contigo es tuyo."
Gris "tu CLAUDE.md - sigue igual."
Gris "no se instalo nada de los proyectos de Carlos ni se pidio acceso a sus repos."

Write-Host "`n  ============================================================"
Write-Host "   $nuevas skills nuevas - $iguales ya las tenias - $alado quedaron al lado"
if ($chocaron.Count -gt 0) {
  Write-Host "`n   Chocaron y NO se sobrescribieron:"
  foreach ($c in $chocaron) { Write-Host "     - $c   (la de Mazi esta en $c-mazi)" }
}
Write-Host "  ============================================================`n"
