---
title: "Ich versuchte, Bitcoin anhand von Sonnenflecken vorherzusagen – und baute ein Startup aus den Überresten"
date: 2026-11-14
description: "Wie ich eine schlechte Handelsidee mit richtiger Statistik tötete, dann aber dieselbe Sorgfalt beim GPS-Geschäft, das ich aus ihren Daten aufbaute, vernachlässigte."
images: ["/images/i-proved-the-sun-doesnt-move-bitcoin-og.png"]
author: "Christian Pojoni"
tags: ["ai", "architecture"]
agentQuestions:
  - "Warum ist die Sun2BTC-Hypothese gescheitert?"
  - "Was war falsch am Pivot der GPS Reliability API?"
  - "Welche Abbruchkriterien sollte ein Nebenprojekt vor dem ersten Commit haben?"
series: ["Field Notes"]
translationHash: "c31ee5c75d53c7f0e39700daa76c2101"
chunkHashes: "62e2a79f51d1202f,17752a5d895e3fcd,b94c9831b71f85e3,6423c38441c57452,21c5050f9461f530,6beb0944e566af0f,461d8218536fa367,51b40360db4921ce,a74d7511c4a98c63"
---

Vor einem Jahr verbrachte ich ein paar Wochen damit, den Bitcoin-Preis aus dem Weltraumwetter vorherzusagen. Ich nannte das Projekt Sun2BTC, was ziemlich genau verrät, wie ernst ich es hätte nehmen sollen.

Der Plan war simpel. Die NOAA veröffentlicht seit Jahren tägliche Messungen über die Sonne: Sonnenflecken, Protonen- und Elektronenfluss, wie stark das Erdmagnetfeld gestört ist. Ich zog fünf Jahre davon, wandelte es in einen Haufen Features um und fragte ein Modell, ob irgendetwas davon half, vorherzusagen, was Bitcoin am nächsten Tag tun würde. Die ersten Backtests kamen mit „leicht besser als zufällig“ zurück, und ich bekam diesen kleinen Schub, den man bekommt, wenn eine dumme Idee vielleicht gar nicht so dumm ist.
## Es richtig zu Ende bringen

Etwas besser als Zufall ist der Ort, wo die meisten Handelsideen hingehen, um ihre Besitzer zu täuschen, also baute ich die gesamte Pipeline so um, wie Marcos López de Prado es in *Advances in Financial Machine Learning* beschreibt. Das bedeutet: Trainingsstichproben entfernen, die das Testfenster überlappen, einen Abstand dazwischen lassen, Stichproben nach ihrer Einzigartigkeit gewichten und am Ende fragen, wie wahrscheinlich es ist, dass man nur das Beste unter vielen glücklichen Versuchen gefunden hat.

Die Antwort war eindeutig. Ein Modell, das nur Bitcoins eigene Geschichte sah, und ein Modell, das auch alle Solardaten sah, waren gleich gut – was heißt: beide waren Münzwürfe. Der p-Wert lag bei 1, das stärkste „das ist Rauschen“, das ein Test sagen kann.[^1]

Der Teil, den ich immer noch amüsant finde: meine naive erste Pipeline hatte fast die gleichen Werte produziert. Die sorgfältige Version fand dasselbe und nahm mir lediglich die Ausrede, daran zu glauben. Zuvor hatte ich ein vielversprechendes Signal. Danach hatte ich einen Münzwurf mit vielen Nachkommastellen.

Ich hätte auch mit der Frage beginnen sollen, die ich erst am Ende stellte: Wie kommt ein Sonnensturm in ein Bitcoin-Orderbuch? Es gibt keinen Weg. Dennoch habe ich die Idee mit einem echten Test und einem vorab festgelegten Schwellenwert zu Grabe getragen, und mit diesem Teil bin ich zufrieden.
## Die Wende

Während ich auf die Solardaten starrte, bemerkte ich einen Zusammenhang, der tatsächlich auf Physik beruht. Geomagnetische Stürme stören die Ionosphäre, und die Ionosphäre verlangsamt GPS-Signale auf ihrem Weg zum Boden. Der Empfänger interpretiert diese Verzögerung als zusätzliche Distanz, sodass die Position abdriftet. Stürme können das Signal auch so stark flackern lassen (Scintillation), dass Empfänger den Lock ganz verlieren. Das alles ist real und gut verstanden.

So wurde das Repository Ende November 2025 zur GPS Reliability API. Meine Notizen von jenem Tag versprachen ein Modell mit einem AUC von etwa 0,85, einen „10-Mrd.-$+-Markt für autonome Fahrzeuge“ und „0 direkte Wettbewerber“. Ich hatte keines der drei gemessen.

Rückblickend verrät die Reihenfolge der Ereignisse das Spiel. Ich begann nicht mit einem Landwirt, dessen RTK-Traktor während eines Sturms von der Linie abkam. Ich begann mit einem sauberen Datensatz und einem Backtesting-Framework, das ich nicht wegwerfen wollte, und suchte dann nach jemandem, der dafür bezahlen würde.
## Was das Modell tatsächlich vorhersagte

Hier ist das Trainingsziel des Modells, das in das Produkt einging:

```python
# Target: Next 24h Max Kp Index
def create_target(df, horizon=1):
    target = df["kp_max"].shift(-horizon)
    return target.dropna()
```

Dieses Ziel ist der morgige [Kp-Index](https://de.wikipedia.org/wiki/K-Index), eine einzelne Zahl für die Stürmigkeit des Erdmagnetfelds. Es hat überhaupt nichts mit GPS-Fehlern zu tun. Und das NOAA Space Weather Prediction Center veröffentlicht bereits eine kostenlose [3-Tage-Kp-Vorhersage](https://www.swpc.noaa.gov/products/3-day-forecast), die menschliche Vorhersager auf Basis von Sonnenwind-Modellen erstellen. Ich verglich mein Modell mit „morgen wird wie heute sein“. Ich verglich es nie mit der kostenlosen Vorhersage.

Am 10. Dezember enthält das Commit-Log eine Zeile, die `feat: Add NOAA SWPC official forecast integration` lautet. Das Produkt zeigte am Ende genau die Vorhersage, die es eigentlich schlagen sollte.
## Derselbe Warnhinweis, ein zweites Mal

Anfang Dezember führte ich die gleichen Diagnosen für das GPS-Modell durch, das Sun2BTC getötet hatte. Es schlug „morgen gleich heute“ um etwa fünf Prozent, was in Ordnung klingt, bis man den Rest des Berichts liest. Der p-Wert lag wieder im Wesentlichen bei 1. Das Mischen eines einzelnen Features veränderte den Modell-Score überhaupt nicht, was bedeutet, dass das Modell sie nicht wirklich nutzte. Meine eigene Zusammenfassung am Ende besagte, die Gewinne seien „wahrscheinlich Artefakte des Testsets, keine echte Vorhersagekraft.“

Das war der Satz, der die Bitcoin-Idee beendet hatte. Diesmal schrieb ich zwei Optionen auf und wählte die, die ich „Pfad A: Deploy mit Unsicherheitsquantifizierung“ nannte. Im Code sah das so aus:

```python
# López de Prado: p < 0.05 indicates statistical significance
if is_significant and p_value < 0.05:
    model_reliability = "high"
else:
    model_reliability = "low"
```

So kam jede Antwort von meiner Reliability-API mit einem Feld, das besagte, das dahinterstehende Modell habe `"low"` Reliability. Damals nannte ich das Transparenz. Heute würde ich es anders nennen.
## Bauen wurde billig

Das Repository umfasst 143 Commits über vier Wochen, und die meisten davon wurden von Claude mitverfasst. In den letzten zwei Tagen allein habe ich ein LSTM, ein Sonnenwindmodell, das vollständige Modell des Erdmagnetfelds, ein Szintillationsmodell, ein Luftfahrtstrahlungsmodell, ein maritimes Dashboard, einen Routenoptimierer mit Risikokarte, E-Mail-Benachrichtigungen, Circuit Breaker und verteiltes Rate Limiting hinzugefügt. Darin finden sich eine 250 Zeilen lange `SCALING.md`, ein Prometheus- und Grafana-Setup, Lasttests und zwei von LLMs verfasste Forschungsberichte, die große Leistungsgewinne versprechen. Die Zahl der Nutzer, die dieses Rate Limit hätten erreichen können, betrug null. Der letzte Commit datiert vom 11. Dezember 2025.

Nichts davon war schwierig, und genau darin lag das Problem. Ein Agent macht das Bauen quasi kostenlos, weshalb er die Richtung, in die man ihn lenkt, vervielfacht. Ich fragte immer wieder, wie sich das Modell verbessern ließe, und erhielt sehr ausführliche Antworten darauf. Niemand fragte, wer dafür zahlen würde, weil ich diese Frage nie in einen Prompt aufgenommen hatte. Wenn Bauen nichts kostet, besteht der teure Fehler darin, eine gut gebaute Antwort auf eine Frage zu liefern, die niemand gestellt hat.
## Warum es keine Wettbewerber gab

Die Menschen mit einem echten GPS-Genauigkeitsproblem haben es schon vor langer Zeit gelöst. Korrekturdienste wie Trimble RTX, Hexagon TerraStar, u-blox PointPerfect und John Deere StarFire korrigieren die ionosphärische Verzögerung an der exakten Position des Empfängers kontinuierlich. Empfänger überprüfen ihre eigene Positionsbestimmung an Bord mit [empfängereigener Integritätsüberwachung](https://de.wikipedia.org/wiki/Receiver_Autonomous_Integrity_Monitoring). Selbstfahrende Autos fusionieren GPS mit Trägheitssensoren, Raddometrie, Lidar und Kameras, sodass ein schlechter Satellitenfix einfach weniger Gewicht in einer Entscheidung erhält, die innerhalb von Millisekunden getroffen wird. Keiner von ihnen möchte eine REST-API für einen täglichen planetaren Index aufrufen.

Und der Index war ohnehin zu grob. Kp ist eine einzige Zahl für den gesamten Planeten alle drei Stunden. GPS-Fehler durch die Ionosphäre hängen stark davon ab, wo man sich befindet und wie spät es ist. In Äquatornähe erreicht die Szintillation regelmäßig ihren Höhepunkt nach Sonnenuntergang, selbst an ruhigen Tagen. Eine globale Tagesvorhersage war zu ungenau für jeden mit einem echten Problem und zu technisch für jeden mit einem gelegentlichen Interesse. „Null Wettbewerber“ stimmte. Es bedeutete nur, dass es keinen Markt gab.
## Was ich zuerst aufschreiben würde

Für das Modell hatte ich eine Abbruchregel, bevor ich begann: Wenn der p-Wert nicht unter 0,05 liegt, ist es tot. Für das Business hatte ich gar nichts. Beim nächsten Mal schreibe ich die Business-Version vor dem ersten Commit auf, genauso wie ich eine Hypothese aufschreiben würde.

Es würde mit der kostenlosen Alternative beginnen. Was nutzen die Leute heute, das nichts kostet, und wie viel besser muss ich sein? Hier war das die NOAA-Vorhersage, und sie zu prüfen hätte einen Nachmittag gedauert. Dann würde ich mit fünf Leuten sprechen, die vielleicht zahlen würden, und fragen, was sie heute tun, wenn GPS schlecht wird. Ich bin ziemlich sicher, ich hätte gehört: „Der Empfänger regelt das“ oder „Ich schaue auf die NOAA-Seite.“ Und ich würde ein Datum festlegen. Wenn bis dahin niemand zahlt, wird das Projekt gestoppt, egal wie hübsch die Dashboards aussehen.

López de Prados entleertes Sharpe Ratio existiert, weil Leute viele Versuche durchführen und nur den besten berichten. Gründer machen dasselbe mit Ideen, und niemand entleert Nebenprojekte.
## Was übrig bleibt

Die Physik war nie falsch. Die Umwandlung von ionosphärischem Elektronengehalt in Reichweitenfehler im Code stimmt, und die Module für Szintillation und Magnetfeld sind getreue Implementierungen veröffentlichter Modelle. Eine kostenlose Seite, die die NOAA-Vorhersage neben eine Szintillationskarte stellt, für Drohnenpiloten und Vermesser in Äquatornähe, könnte durchaus Leute finden, die sie mögen. Das wäre eine nette Funktion. Ich glaube nicht, dass es je ein Unternehmen war.

Ich besitze auch immer noch gps-reliability.com. Es kostet ungefähr so viel wie eine Pizza pro Jahr, was es zur billigsten Entscheidung des ganzen Projekts und zur einzigen macht, die nicht überangepasst war. Der Projektordner auf meinem Laptop heißt `gps-realibility`, und ich habe beschlossen, das als frühe Warnung zu lesen, die ich verpasst habe.

Wenn Sie Drohnen fliegen, Land vermessen oder GPS-Geräte betreiben und Weltraumwetter Ihnen tatsächlich Geld gekostet hat, schreiben Sie mir. Sie wären mein erstes Kundeninterview, etwa ein Jahr zu spät.

[^1]: Für Neugierige: der Bitcoin-only-Baseline erreichte einen AUC von 52,1 % (±1,6), die Version mit allen 96 Weltraumwetter-Features 52,2 % (±1,8), wo 50 % Raten entspricht. Beide hatten einen p-Wert von 1,000. Der Baseline der naiven Pipeline hatte 51,7 % erreicht. Bei etwa 2.000 täglichen Samples machten die 96 zusätzlichen Features den Regressionsfehler 14-mal schlechter.

---

*Christian Pojoni baut Infrastruktur und beweist gelegentlich seine eigenen Ideen falsch. Mehr unter [vasudev.xyz](https://vasudev.xyz).*