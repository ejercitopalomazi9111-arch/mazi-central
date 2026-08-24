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

param(
  # Sin -Repo  -> se instala en la MAQUINA (~/.claude). Para el Claude que
  #               corre en su computadora.
  # Con -Repo  -> se instala DENTRO DE UN REPOSITORIO. Eso es lo que hace
  #               falta para un Claude que corre EN GITHUB: ahi no existe la
  #               carpeta del usuario, cada sesion clona el repo y lee lo que
  #               traiga adentro. Si las skills no estan commiteadas en el
  #               repo, para esa sesion no existen.
  [string]$Repo = ""
)

$aqui    = $PSScriptRoot
$repoKit = Split-Path $aqui -Parent
$origen  = Join-Path $repoKit ".claude\skills"
$sello   = Get-Date -Format "yyyyMMdd-HHmmss"

if ($Repo -ne "") {
  if (-not (Test-Path $Repo)) { Write-Host "   !!  No existe esa carpeta: $Repo" -ForegroundColor Red; exit 1 }
  $modo    = "repo"
  $destRepo= (Resolve-Path $Repo).Path
  $casa    = Join-Path $destRepo ".claude"
  # El respaldo NUNCA va dentro del repo: acabaria commiteado y metiendole
  # basura al historial de alguien mas. Se guarda al lado, fuera de el.
  $respaldo= Join-Path (Split-Path $destRepo -Parent) ((Split-Path $destRepo -Leaf) + "-respaldo-skills-$sello")
} else {
  $modo    = "maquina"
  $destRepo= ""
  $casa    = if ($env:CLAUDE_HOME) { $env:CLAUDE_HOME } else { Join-Path $env:USERPROFILE ".claude" }
  $respaldo= Join-Path $casa "respaldos\skills-$sello"
}
$destino = Join-Path $casa "skills"

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

if ($modo -eq "repo") {
  Gris "instalando DENTRO del repositorio: $destRepo"
  Gris "asi lo ve un Claude que corre en GitHub, que no tiene carpeta de usuario"
} else {
  Gris "instalando en la maquina: $casa"
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
if ($modo -eq "repo") {
  # En un repo va a la RAIZ, junto al CLAUDE.md del proyecto, porque es lo que
  # la sesion de GitHub lee al clonar.
  $archivoCasa = Join-Path $destRepo "CLAUDE-mazi.md"
  $enganche    = "@CLAUDE-mazi.md"
} else {
  $archivoCasa = Join-Path $casa "CLAUDE-mazi.md"
  $enganche    = "@$archivoCasa"
}
New-Item -ItemType Directory -Force -Path (Split-Path $archivoCasa -Parent) | Out-Null
Copy-Item (Join-Path $aqui "CLAUDE-colaborador.md") -Destination $archivoCasa -Force
Ok "metodo de la casa en $archivoCasa"
Gris "va en archivo APARTE: tu CLAUDE.md no se toca."
Gris "Para engancharlo, pegale esta linea a tu CLAUDE.md:"
Write-Host "`n      $enganche`n" -ForegroundColor Cyan

# ---------- 4. Lo que NO se hizo, dicho en voz alta ----------
Paso "Lo que NO se toco, a proposito"
Gris "tu memoria - ni un archivo. Lo que tu Claude aprendio contigo es tuyo."
Gris "tu CLAUDE.md - sigue igual."
Gris "no se instalo nada de los proyectos de Carlos ni se pidio acceso a sus repos."

if ($modo -eq "repo") {
  Paso "Falta UN paso, y sin el no sirve"
  Gris "un Claude de GitHub lee lo que esta COMMITEADO. Desde tu repo:"
  Write-Host "`n      git add .claude CLAUDE-mazi.md && git commit -m `"La forma de trabajar de Mazi`"" -ForegroundColor Cyan
  Write-Host "      git push`n" -ForegroundColor Cyan
  Gris "hasta que eso este empujado, tu Claude de GitHub no ve nada de esto."
}

Write-Host "`n  ============================================================"
Write-Host "   $nuevas skills nuevas - $iguales ya las tenias - $alado quedaron al lado"
if ($chocaron.Count -gt 0) {
  Write-Host "`n   Chocaron y NO se sobrescribieron:"
  foreach ($c in $chocaron) { Write-Host "     - $c   (la de Mazi esta en $c-mazi)" }
}
Write-Host "  ============================================================`n"
