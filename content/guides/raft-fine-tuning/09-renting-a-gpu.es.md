---
title: "09 — Alquilar una GPU para el modelo grande"
description: "Qué subir, cómo estimar el coste y las trampas operativas del entrenamiento desatendido en la nube: mirrors lentos, watchers silenciosos y volúmenes atados a un host."
weight: 9
type: "guide"
build:
  list: local
  render: always
translationHash: "01534b867288dfd114c54338964ab88e"
---

# 09 — Alquilar una GPU para el modelo grande

## Idea central

Cuando el modelo más grande no cabe en tu tarjeta, alquila una solo para el entrenamiento. Mantén locales la generación de datos, la exportación y la evaluación, y sube lo mínimo posible.

## Subir lo mínimo

El ejemplo subió un paquete de 15 MB: script de entrenamiento, archivo de requisitos con versiones fijadas, script de ejecución y JSONL de entrenamiento y validación. Sin base de datos, audio ni claves. El pod descargó por sí mismo el modelo base. Antes de subirlo, un script independiente confirmó que ningún pasaje procedía de un documento holdout o excluido.

Si los datos contienen material que no publicarías, elige centros de datos propios del proveedor (por ejemplo, RunPod Secure Cloud) en lugar de hosts comunitarios.

## Estimar el coste

Extrapola a partir de una ejecución local. El modelo 4B tardó 2 h 49 min localmente. El 9B necesita aproximadamente el doble de cómputo, y una tarjeta de estación de trabajo de 48 GB es algo más rápida que una de consumo de 16 GB, así que entre 3 y 4 horas era una estimación razonable. La ejecución real duró 3 h 35 min a alrededor de un dólar por hora. Presupuesta el doble del tiempo esperado por si falla el primer intento.

## Un script de ejecución aburrido

```bash
set -euo pipefail
export HF_HOME=${HF_HOME:-$PWD/.hf}          # model cache on the persistent volume
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-train.txt
python train.py check
python train.py train --min-free-gb 30
python train.py export --stage merge
```

Fija cada versión usada localmente. Coloca la caché de Hugging Face en el volumen persistente, no en el disco del contenedor. Inícialo con `nohup` para que sobreviva a una desconexión SSH.

## Trampas

**Mirrors lentos.** El primer pod del ejemplo descargaba PyTorch a 140 KB/s. Si la instalación no termina en unos minutos, elimina el pod y prueba otra región o tipo de GPU.

**Watchers silenciosos.** Un watcher que comprueba el pod mediante SSH no debe depender del código de salida de su último comando:

```bash
st=$(ssh "$POD" 'pgrep -f "^bash run.sh" && echo RUNNING; grep -q Error run.log && echo ERROR; true')
```

Sin el `true` final, un log sano hace que `grep` termine con 1, cada comprobación parece un fallo de conexión y el pod terminado queda inactivo. Eso costó tres horas de GPU ociosa en el ejemplo. Prueba el watcher contra un estado «terminado» falso antes de irte a dormir.

**Volúmenes atados a un host.** Un pod detenido conserva su volumen en la máquina física, y reiniciarlo necesita una GPU libre en esa misma máquina. Haz que el trabajo envíe los resultados a otro lugar (almacenamiento de objetos, volumen de red o tu propio servidor) como último paso, en vez de esperar a descargarlos.

**Una fecha límite.** Programa un apagado a una hora fija como red de seguridad independiente del watcher.

## Terminar limpiamente

Descarga, verifica las sumas de comprobación con las del pod y después termina el pod y su volumen. Detenerlo no basta, porque un volumen detenido sigue facturándose.

## Errores habituales

- Subir todo el proyecto en vez de un paquete.
- Dependencias sin versiones fijadas en el pod.
- Recuperar los resultados solo tirando de un pod que puede detenerse.
