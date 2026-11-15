#!/usr/bin/env bash
# PEGA LA FIRMA DE GRUPO MAZI al final de un video (Carlos, 15 nov: «que se den nota que está hecho por nosotros»).
#   herramientas/video/firmar.sh entrada.mp4 salida.mp4 [firma.mp4]
# La firma sale de marca/anuncios/firma-mazi/ (node herramientas/video/armar.mjs marca/anuncios/firma-mazi/index.html
# marca/anuncios/salida/firma-mazi.mp4). Se funde 0.4 s con el final del video; el audio del video se apaga en ese
# mismo tramo y entra el de la firma. Sale a −14 LUFS, como lo demás.
set -euo pipefail
ent="$1"; sal="$2"; firma="${3:-marca/anuncios/salida/firma-mazi.mp4}"
X=0.4
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$ent")
read -r W H < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=' ':p=0 "$ent")
off=$(python3 -c "print(max(0, $dur - $X))" 2>/dev/null)
tiene_audio=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$ent" | head -1)
if [ -n "$tiene_audio" ]; then A0="[0:a]aresample=48000,aformat=channel_layouts=stereo[a0]"; else A0="anullsrc=r=48000:cl=stereo,atrim=0:$dur[a0]"; fi
ffmpeg -v error -y -i "$ent" -i "$firma" -filter_complex "
 [0:v]fps=30,scale=$W:$H,setsar=1,format=yuv420p[v0];
 [1:v]fps=30,scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,setsar=1,format=yuv420p[v1];
 [v0][v1]xfade=transition=fade:duration=$X:offset=$off[v];
 $A0; [1:a]aresample=48000,aformat=channel_layouts=stereo[a1];
 [a0][a1]acrossfade=d=$X[am]; [am]loudnorm=I=-14:TP=-1:LRA=11[a]" \
 -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$sal"
echo "✓ $sal ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$sal") s)"
