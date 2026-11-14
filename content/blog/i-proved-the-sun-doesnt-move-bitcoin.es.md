---
title: "Intenté predecir Bitcoin a partir de las manchas solares y luego construí una startup con lo que sobró"
date: 2026-11-14
description: "Cómo maté una mala idea de trading con estadísticas adecuadas, y luego omití el mismo rigor para el negocio de GPS que construí a partir de sus datos"
images: ["/images/i-proved-the-sun-doesnt-move-bitcoin-og.png"]
author: "Christian Pojoni"
tags: ["ai", "architecture"]
agentQuestions:
  - "¿Por qué falló la hipótesis Sun2BTC?"
  - "¿Qué falló con el pivote de la API de fiabilidad del GPS?"
  - "¿Qué criterios de abandono debería tener un proyecto paralelo antes del primer commit?"
series: ["Field Notes"]
translationHash: "c31ee5c75d53c7f0e39700daa76c2101"
chunkHashes: "62e2a79f51d1202f,17752a5d895e3fcd,b94c9831b71f85e3,6423c38441c57452,21c5050f9461f530,6beb0944e566af0f,461d8218536fa367,51b40360db4921ce,a74d7511c4a98c63"
---

Hace un año pasé unas semanas intentando predecir el precio de Bitcoin a partir del clima espacial. Llamé al proyecto Sun2BTC, lo que te dice más o menos lo en serio que debería haberlo tomado.

El plan era simple. NOAA publica años de mediciones diarias sobre el Sol: manchas solares, flujo de protones y electrones, lo alterado que está el campo magnético de la Tierra. Obtuve cinco años de esos datos, los convertí en un montón de características y le pregunté a un modelo si alguno de eso ayudaba a predecir lo que haría Bitcoin al día siguiente. Los primeros backtests devolvieron "ligeramente mejor que el azar", y sentí ese pequeño subidón que tienes cuando una idea tonta puede que no lo sea tanto.
## Descartarlo como es debido

Ligeramente mejor que el azar es donde la mayoría de las ideas de trading van a engañar a sus dueños, así que reconstruí todo el pipeline como describe Marcos López de Prado en *Advances in Financial Machine Learning*. Eso significa purgar las muestras de entrenamiento que se solapan con la ventana de prueba, dejar un espacio entre ellas, ponderar las muestras según su unicidad y, al final, preguntar qué tan probable es que solo hayas encontrado la mejor de muchas suertes.

La respuesta fue clara. Un modelo que solo veía el historial de Bitcoin y otro que también veía todos los datos solares eran igualmente buenos, lo cual quiere decir que ambos eran una moneda al aire. El p-value dio 1, lo máximo de «esto es ruido» que puede decir una prueba.[^1]

La parte que aún me hace gracia es que mi primer pipeline ingenuo había producido puntuaciones casi iguales. La versión cuidadosa halló lo mismo y simplemente me quitó la excusa para creerlo. Antes, tenía una señal prometedora. Después, tenía una moneda al aire con muchos decimales.

También debería haber empezado con la pregunta que solo hice al final: ¿cómo entraría una llamarada solar en el order book de Bitcoin? No hay camino. Aun así, maté la idea con una prueba real y un umbral que había escrito por adelantado, y estoy contento con esa parte.
## El pivote

Mientras miraba los datos solares, noté una conexión que sí tiene física detrás. Las tormentas geomagnéticas perturban la ionosfera, y la ionosfera ralentiza las señales GPS en su camino hacia el suelo. El receptor lee ese retraso como distancia extra, así que tu posición deriva. Las tormentas también pueden hacer que la señal parpadee tan mal (centelleo o *scintillation*) que los receptores pierden el bloqueo por completo. Todo eso es real y está bien entendido.

Así que a finales de noviembre de 2025 el repositorio se convirtió en la API de Fiabilidad GPS. Mis notas de ese día prometían un modelo con un AUC alrededor de 0.85, un "mercado de vehículos autónomos de $10B+" y "$0 Competidores Directos". No había medido ninguno de los tres.

Mirando hacia atrás, el orden de los eventos delata el juego. No empecé con un agricultor cuyo tractor RTK se salió de su línea durante una tormenta. Empecé con un conjunto de datos limpio y un marco de *backtesting* que no quería tirar, y luego busqué a alguien que pudiera pagar por ellos.
## Lo que el modelo realmente predecía

Aquí está el objetivo de entrenamiento del modelo que entró en el producto:

```python
# Target: Next 24h Max Kp Index
def create_target(df, horizon=1):
    target = df["kp_max"].shift(-horizon)
    return target.dropna()
```

Ese objetivo es el [índice Kp](https://es.wikipedia.org/wiki/Índice_Kp) máximo de las próximas 24 horas, un único número que indica lo tormentoso que está el campo magnético terrestre. No es error de GPS en absoluto. Y el Centro de Predicción del Clima Espacial de la NOAA ya publica una [previsión gratuita de Kp a 3 días](https://www.swpc.noaa.gov/products/3-day-forecast), que los pronosticadores humanos construyen sobre modelos de viento solar. Comparé mi modelo contra "mañana será como hoy". Nunca lo comparé contra la previsión gratuita.

El 10 de diciembre, el registro de commits tiene una línea que dice `feat: Add NOAA SWPC official forecast integration`. El producto terminó mostrando la previsión que se suponía debía superar.
## La misma advertencia, por segunda vez

A principios de diciembre ejecuté los mismos diagnósticos en el modelo GPS que había acabado con Sun2BTC. Superaba a «mañana igual a hoy» en aproximadamente un cinco por ciento, lo cual suena bien hasta que lees el resto del informe. El valor p era, de nuevo, esencialmente 1. Permutar cualquiera de las características no cambiaba en absoluto la puntuación del modelo, lo que significa que no las estaba usando realmente. Mi propio resumen al final decía que las ganancias eran «probablemente artefactos del conjunto de prueba, no verdadera habilidad predictiva».

Esa es la frase que había terminado con la idea del Bitcoin. Esta vez redacté dos opciones y elegí la que había llamado «Ruta A: Despliegue con cuantificación de incertidumbre». En el código se veía así:

```python
# López de Prado: p < 0.05 indica significancia estadística
if is_significant and p_value < 0.05:
    model_reliability = "high"
else:
    model_reliability = "low"
```

Así que cada respuesta de mi API de fiabilidad venía con un campo que decía que el modelo detrás era de fiabilidad `"low"`. En ese momento lo llamé transparencia. Ahora le llamaría de otra manera.
## Construir se volvió barato

El repositorio tiene 143 commits en cuatro semanas, y la mayoría son coautorados por Claude. Solo en los últimos dos días agregué un LSTM, un modelo de viento solar, el modelo completo del campo magnético de la Tierra, un modelo de centelleo, un modelo de radiación aeronáutica, un panel marítimo, un optimizador de rutas con mapa de riesgo, alertas por correo, interruptores de circuito y limitación de tasa distribuida. Hay un `SCALING.md` de 250 líneas, una configuración de Prometheus y Grafana, pruebas de carga y dos informes de investigación escritos por LLM que prometen grandes mejoras de rendimiento. El número de usuarios que podrían haber alcanzado ese límite de tasa era cero. El último commit es del 11 de diciembre de 2025.

Nada de eso fue difícil, y ese era el problema. Un agente hace que construir sea casi gratis, así que multiplica cualquier dirección en la que lo apuntes. Seguí preguntando cómo mejorar el modelo, y obtuve respuestas muy exhaustivas a esa pregunta. Nadie preguntó quién pagaría por ello, porque nunca incluí esa pregunta en un prompt. Cuando construir no cuesta nada, el error costoso es una respuesta bien construida a una pregunta que nadie hizo.
## Por qué no había competidores

Las personas con un problema real de precisión GPS lo resolvieron hace tiempo. Servicios de corrección como Trimble RTX, Hexagon TerraStar, u-blox PointPerfect y John Deere StarFire corrigen el retraso ionosférico en la posición exacta del receptor, de forma continua. Los receptores verifican su propia solución a bordo con [monitorización autónoma de la integridad del receptor](https://es.wikipedia.org/wiki/Monitorizaci%C3%B3n_aut%C3%B3noma_de_la_integridad_del_receptor). Los coches autónomos fusionan GPS con sensores inerciales, odometría de ruedas, lidar y cámaras, así que una mala fijación del satélite solo recibe menos peso en una decisión tomada en milisegundos. Ninguno de ellos quiere llamar a una API REST para un índice planetario diario.

Y el índice era demasiado grueso de todos modos. Kp es un solo número para todo el planeta cada tres horas. Los errores de GPS por la ionosfera dependen mucho de dónde estés y de la hora que sea. Cerca del ecuador, la scintillation alcanza picos regulares tras la puesta de sol incluso en días tranquilos. Una previsión diaria global era demasiado burda para quien tiene un problema real y demasiado técnica para quien tiene uno casual. «Cero competidores» era cierto. Solo significaba que no había mercado.
## Lo que escribiría primero

Para el modelo, tenía una regla de parada antes de empezar: si el valor p no está por debajo de 0.05, está muerto. Para el negocio no tenía nada. La próxima vez escribiré la versión del negocio antes del primer commit, de la misma forma que escribiría una hipótesis.

Empezaría con la alternativa gratuita. ¿Qué usan hoy las personas que no cuesta nada, y cuánto mejor tengo que ser? Aquí era el pronóstico de la NOAA, y comprobarlo habría tomado una tarde. Luego hablaría con cinco personas que podrían pagar y les preguntaría qué hacen hoy cuando el GPS falla. Estoy bastante seguro de que habría escuchado "el receptor lo maneja" o "veo la página de la NOAA". Y pondría una fecha. Si nadie paga para entonces, el proyecto se detiene, por muy bonitos que se vean los paneles.

El ratio de Sharpe desinflado de López de Prado existe porque la gente ejecuta muchos ensayos y reporta solo el mejor. Los fundadores hacen lo mismo con las ideas, y nadie desinfla los proyectos paralelos.
## Lo que queda

La física nunca fue errónea. La conversión del contenido de electrones ionosféricos a error de alcance en el código es correcta, y los módulos de scintilación y campo magnético son implementaciones fieles de modelos publicados. Una página gratuita que ponga el pronóstico de la NOAA junto a un mapa de scintilación, para pilotos de drones y topógrafos cerca del ecuador, bien podría encontrar a quienes la aprecien. Eso sería una buena funcionalidad. No creo que haya sido nunca una empresa.

También sigo siendo dueño de gps-reliability.com. Cuesta aproximadamente lo que una pizza al año, lo que lo convierte en la decisión más barata de todo el proyecto y la única que no incurrió en sobreajuste. La carpeta del proyecto en mi portátil se llama `gps-realibility`, y he decidido leer eso como una alerta temprana que pasé por alto.

Si vuelas drones, levantas terrenos o manejas equipos GPS y el clima espacial te ha costado dinero de verdad, escríbeme. Serías mi primera entrevista con un cliente, aproximadamente un año tarde.

[^1]: Para los curiosos: el modelo base solo con Bitcoin obtuvo un AUC de 52,1 % (±1,6), la versión con las 96 características de clima espacial, 52,2 % (±1,8), donde el 50 % es adivinar al azar. Ambos tuvieron un valor p de 1,000. El modelo base del pipeline ingenuo había obtenido 51,7 %. En aproximadamente 2.000 muestras diarias, las 96 características extra empeoraron el error de regresión 14 veces.

---

*Christian Pojoni construye infraestructura y ocasionalmente demuestra que sus propias ideas están equivocadas. Más en [vasudev.xyz](https://vasudev.xyz).*