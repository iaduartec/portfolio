1. Base para que la IA “mire” un gráfico como un humano
   1.1 Velas y temporalidades

Cada vela/barra aporta Apertura, Máximo, Mínimo, Cierre (OHLC). En velas bajistas el cuerpo suele mostrarse rojo/negro; la parte superior del cuerpo es apertura y la inferior cierre (según el ejemplo que ponen).

Temporalidades típicas (según la guía):

Intradía: 1M, 5M, 15M, 30M, 1H, 4H

Medio/largo: D1 (muy usada), 1W, MN1

Idea operativa que se repite: la lectura es fractal (un patrón puede verse en varios marcos), pero en acciones suelen “comportarse mejor” en diario (porque históricamente se ideó ahí y por el “cierre” claro).

1.2 Tendencia y fases (para filtrar patrones)

No detectes patrones “en el vacío”: primero clasifica el contexto.

La guía separa 3 fases de tendencia primaria (largo plazo):

Acumulación: malas noticias descontadas, entran inversores informados/manos fuertes; difícil de ver “a priori”.

Participación pública: tendencia “limpia”; momento “ideal” para el inversor retail.

Especulativa: optimismo desmedido/codicia; más peligrosa.

Requisito IA (contexto mínimo):

Input: serie OHLCV + timeframe.

Salida previa: trend_state ∈ {alcista, bajista, lateral} + phase_hint ∈ {acumulación, participación, especulativa, unknown}.

2. Soportes y resistencias (S/R): el “esqueleto” de todo
   Definiciones y dibujo

Soporte: zona por debajo del precio donde demanda > oferta y el precio tiende a frenar o girar.

Para dibujar líneas:

Une mínimos (soporte) o máximos (resistencia).

Necesitas al menos 2 mínimos o 2 máximos relativos para trazarla.

Fortaleza de una zona

La robustez depende, entre otras cosas, del volumen negociado en esa zona:

Más volumen en la zona ⇒ más fortaleza.

Rotura con “fuerza” y mucho volumen ⇒ confirma rotura.

Errores comunes (útil para reglas anti-falsos-positivos)

Sobreanalizar: dibujar demasiadas zonas; mejor quedarse con las más relevantes y bajar temporalidad solo si hace falta.

No esperar confirmación de rotura con precio + volumen (alerta de “trampas”).

Requisitos IA para S/R:

Detectar pivots (máximos/mínimos relativos).

Agrupar pivots por clúster de precio (tolerancia).

Score de fortaleza:

touch_count (nº de apoyos),

volume_near_level,

rejection_wicks / velocidad de rechazo,

breakout_volume y breakout_body_size.

3. Figuras de continuación
   3.1 Triángulos

Qué son

Consolidación: oscilaciones se van estrechando hasta confluir.

Cómo identificarlos (reglas geométricas de la guía)

Zigzag con:

≥2 máximos descendentes → línea de resistencia

≥2 mínimos ascendentes → línea de soporte

Óptimo: 3 puntos arriba y 3 abajo.

Detalle curioso: si el último apoyo “no llega a tocar” la línea, lo interpretan como pista de rotura próxima.

Validez

Es continuación: solo es “válido” si rompe a favor de la tendencia vigente.

Tendencia alcista → compra si rompe resistencia.

Tendencia bajista → cortos si rompe soporte.

Si rompe contra tendencia: lo consideran figura fallida/no terminada.

Objetivo

Proyección: altura del triángulo (medida vertical desde el primer apoyo entre las dos líneas) proyectada desde el punto de rotura.

Triángulo descendente (rectángulo descendente)

Continuación en mercados bajistas:

mínimos al mismo nivel + máximos descendentes.

Requisitos IA Triángulos

Precondición: trend_state != lateral (o al menos “tendencia vigente” definida).

Swing points: extraer secuencia alternante.

Fit de dos líneas (soporte/resistencia) y comprobar convergencia.

Confirmación: cierre fuera de la línea + (opcional) volumen.

Target: triangle_height proyectado desde breakout.

3.2 Banderín (alcista y bajista)

Definición (tal como lo describen)

Fuerte impulso (“mástil”), seguido de consolidación triangular rápida (“banderín”), y rotura con fuerza/verticalidad en la dirección esperada.

Peculiaridades (reglas prácticas de la guía)

Se forma con rapidez, volatilidad y volumen → exige buena gestión de riesgo.

Se parece a triángulos, pero:

se forma más rápido,

tendencia previa y rotura son más verticales,

y dicen que la proyección del objetivo no es la misma (ojo para no copiar la del triángulo “por inercia”).

No recomiendan esperar pullback por la velocidad.

Durante la banderita: el volumen tiende a bajar mientras se estrecha.

Requisitos IA Banderín

Detectar “mástil”:

tramo con pendiente alta + rango medio por vela alto + volumen alto.

Detectar consolidación:

triángulo pequeño, corto en barras, con compresión y volumen decreciente.

Confirmación:

rotura con rango y/o volumen.

Stops: estrictos (figura “especulativa”).

3.3 Huecos / Gaps

Diferencia clave que meten

Hay huecos “sin relevancia técnica” (por ejemplo, split/dividendos/ampliaciones) vs huecos que reflejan sentimiento sin motivo “contable” evidente.

Hueco al alza → fortaleza; hueco bajista → debilidad.

Tipos (los que pude capturar en el artículo)

Hueco de continuación:

aparece después de un hueco de ruptura/escape,

el precio sigue fuerte dejando huecos sucesivos,

con menos volumen que el de ruptura,

pueden actuar como soportes/resistencias,

si un hueco termina cubriéndose, atentos a posible cambio de tendencia.

Hueco de agotamiento:

al final de un movimiento,

se cubre en pocos días y cambia la dirección,

sugiere posible cambio de tendencia.

Requisitos IA Gaps

Detectar gap: today_low > yesterday_high (gap up) o today_high < yesterday_low (gap down) en velas de sesión.

Clasificar:

“corporativo/no técnico” si coincide con evento (si tienes feed corporativo) o si el ajuste está en la serie (split/dividendo).

Continuación vs agotamiento: por posición en tendencia + velocidad + si se “rellena” rápido + volumen relativo.

4. Figuras de cambio de tendencia (reversión)
   Reglas generales (la guía insiste mucho)

Para cambio de tendencia:

debe existir una tendencia previa identificable,

y luego una ruptura fuerte y “fiable” de línea tendencial,

con especial atención al volumen como confirmación.

Recomendación: esperar confirmación por precio y, si es posible, volumen; pullback opcional (no siempre aparece).

4.1 Hombro-Cabeza-Hombro (HCH)

Objetivo

Objetivo bajista: medir distancia cabeza ↔ clavicular, proyectarla hacia abajo desde el punto de ruptura bajista de la clavicular.

Requisitos IA HCH

Precondición: tendencia alcista previa (según enfoque Dow que repiten en el artículo).

Geometría:

Hombro izq: máximo, retroceso

Cabeza: máximo mayor, retroceso

Hombro dcho: máximo menor (aprox similar al izq)

Clavicular: línea por los mínimos intermedios (puede ser inclinada)

Confirmación:

rotura de clavicular (ideal con volumen).

Target:

target = neckline_break_price - (head_peak - neckline_at_head_time).

4.2 HCH invertido

Solo se considera válido tras tendencia bajista; no operarlo en lateralidad.

El artículo remarca el papel del volumen como confirmación también aquí.

Requisitos IA HCHi

Igual que HCH pero invertido:

3 valles, el central más profundo.

Clavicular por los máximos intermedios.

Confirmación: ruptura alcista de clavicular.

Target típico: altura proyectada (misma idea que HCH, pero hacia arriba).

4.3 Doble suelo

Cómo se forma y cómo se opera (pasos tal cual lo listan)

Venimos de tendencia bajista y se forma un primer mínimo relativo.

Rebote a un máximo relativo; ahí se dibuja la “línea clavicular” (resistencia).

Segundo mínimo relativo a altura parecida (no suele ser igual; lo conectan con buscar divergencias).

Requisitos IA Doble Suelo

Precondición: tendencia bajista.

Geometría:

valle1, pico intermedio (neckline), valle2 ~ similar (tolerancia).

Confirmación:

ruptura y cierre por encima de neckline (y mejor con volumen).

Nota de uso:

lo plantean como figura útil para optimizar entradas incluso de largo plazo/cartera (no solo trading).

4.4 Doble techo / Triple suelo / Triple techo / Suelo redondeado / Vuelta en V / Vuelta 1 día / Vuelta 2 días

La guía los incluye como “principales” figuras de cambio.
De estas, una que deja reglas claras en el fragmento que capturé:

Vuelta en V

Muy rápida, con mucha volatilidad y volumen → alto riesgo.

Dicen explícitamente: no hay precio objetivo fiable; sugiere dejar correr o usar stop dinámico.

Mencionan señales que pueden ayudar: martillo alcista, hueco al alza, RSI en sobreventa, rotura de tendencia de muy corto plazo (mejor confluencia).

Requisitos IA (familia de reversión “rápida”)

Detectar aceleración (ATR↑, rango vela↑, volumen↑).

No forzar target fijo (especialmente V).

Exigir confluencias (patrón + S/R + indicador).

5. Indicadores de la guía (para “confluencia”, no para adivinar)
   5.1 RSI

Lo presentan como indicador que mide la fuerza relativa respecto a la tendencia; lo atribuyen a J. Welles Wilder y lo usan para sobrecompra/sobreventa (como señales).

Requisitos IA RSI

Calcular RSI estándar.

Flags:

overbought, oversold (según tus umbrales).

Usarlo como:

filtro de contexto,

detector de divergencias,

confirmación secundaria (no gatillo único).

5.2 Estocástico

Lo comparan con RSI y remarcan que marca sobrecompra/sobreventa como señal o filtro, pero nunca como entrada “garantizada”.

5.3 TRIX (reglas operativas muy concretas en su artículo)

Señal de compra: TRIX al alza y cruce de su señal; “mejor” si ocurre por debajo de 0.

Señal de venta: TRIX a la baja y cruce; “mejor” por encima de 0.

También lo conectan con divergencias.

5.4 MACD (reglas operativas concretas)

Compra: MACD cruza la señal “de abajo a arriba”.

Venta: cruza “de arriba a abajo”.

Cerrar posición cuando el cruce se invierte.

5.5 Divergencias

La guía separa divergencias alcistas y bajistas (útil para etiquetado).

Implementación estándar:

Alcista: precio marca mínimo más bajo, indicador mínimo más alto.

Bajista: precio máximo más alto, indicador máximo más bajo.
(En tu implementación, usa pivots tanto en precio como en indicador para evitar “ver divergencias donde no las hay”).

6. Gestión del riesgo y operativa (lo que tu IA debería “obligar”)

En banderines: recalcan que son especulativos y exigen stops/take profit bien medidos.

En reversión: insisten en confirmación por precio y volumen real, y en que no hay garantías (solo probabilidades).

En Vuelta en V: stop dinámico por falta de objetivo.

7. “Checklist” para que tu IA detecte patrones en un gráfico

Esto es lo que yo guardaría como estructura fija para cada patrón:

Estructura por patrón

context_requirements

tendencia previa requerida (alcista/bajista)

volatilidad/volumen esperables

temporalidades recomendadas

geometry_requirements

número mínimo de pivots

relaciones de alturas (tolerancias)

líneas clave (clavicular / soporte / resistencia)

confirmation_rules

qué significa ruptura (cierre fuera, %/ATR, nº velas)

volumen relativo mínimo en ruptura (si disponible)

targets

fórmula (triángulo: altura; HCH: cabeza↔clavicular; etc.)

o “sin target” (Vuelta en V)

invalidations_and_stops

dónde deja de ser válido el patrón

stop “lógico” (por debajo del último pivot, etc.)

confidence_score_features

touches count, simetría, pendiente, compresión, breakout strength, volumen, confluencias con RSI/MACD/TRIX, etc.

TRADINGVIEW PANE EDITOR

//@version=5
indicator("AI-ish Pattern Detector (Rule-Based) v0.1", overlay=true, max_labels_count=500, max_lines_count=200)

//──────────────────────────────────────────────────────────────────────────────
// Inputs
//──────────────────────────────────────────────────────────────────────────────
pivotLen = input.int(5, "Pivot length (swing)", minval=2, maxval=20)
lookbackBars = input.int(220,"Pattern lookback bars", minval=50, maxval=2000)
atrLen = input.int(14, "ATR length", minval=5, maxval=100)
tolAtrMult = input.float(0.6, "Tolerance (ATR mult)", minval=0.1, maxval=3.0, step=0.1)
minPivotGapBars = input.int(5, "Min bars between pivots", minval=1, maxval=50)

useVolConfirm = input.bool(true, "Volume confirmation")
volSmaLen = input.int(20, "Volume SMA len", minval=5, maxval=200)
volMult = input.float(1.3, "Vol confirm multiplier", minval=1.0, maxval=5.0, step=0.1)

showSR = input.bool(true, "Show S/R from pivots")
srClusterTolAtr = input.float(0.8, "S/R clustering tolerance (ATR mult)", minval=0.2, maxval=3.0, step=0.1)

showTrend = input.bool(true, "Show trend EMAs")
emaFastLen = input.int(20, "EMA fast", minval=5, maxval=200)
emaSlowLen = input.int(50, "EMA slow", minval=10, maxval=400)

//──────────────────────────────────────────────────────────────────────────────
// Core measures
//──────────────────────────────────────────────────────────────────────────────
atr = ta.atr(atrLen)
tol = atr _ tolAtrMult
vSMA = ta.sma(volume, volSmaLen)
volOk = not useVolConfirm or (volume > vSMA _ volMult)

emaFast = ta.ema(close, emaFastLen)
emaSlow = ta.ema(close, emaSlowLen)

trendUp = emaFast > emaSlow
trendDown = emaFast < emaSlow
trendSide = not trendUp and not trendDown

if showTrend
plot(emaFast, linewidth=1)
plot(emaSlow, linewidth=1)

//──────────────────────────────────────────────────────────────────────────────
// Pivot storage (arrays)
// We store last N swing highs and lows: price + bar_index
//──────────────────────────────────────────────────────────────────────────────
var int MAXP = 30
var float[] phP = array.new_float()
var int[] phB = array.new_int()
var float[] plP = array.new_float()
var int[] plB = array.new_int()

// Pivot detection
pH = ta.pivothigh(high, pivotLen, pivotLen)
pL = ta.pivotlow(low, pivotLen, pivotLen)

f_pushPivot(\_prices, \_bars, float price, int b) =>
// enforce min gap (avoid noisy duplicates)
int sz = array.size(\_bars)
bool ok = true
if sz > 0
int lastB = array.get(\_bars, sz - 1)
ok := (b - lastB) >= minPivotGapBars
if ok
array.push(\_prices, price)
array.push(\_bars, b)
if array.size(\_prices) > MAXP
array.shift(\_prices)
array.shift(\_bars)

if not na(pH)
f_pushPivot(phP, phB, pH, bar_index - pivotLen)

if not na(pL)
f_pushPivot(plP, plB, pL, bar_index - pivotLen)

// Helpers
f_getLastN(\_prices, \_bars, int n) =>
int sz = array.size(\_prices)
if sz < n
[na, na]
else
float[] outP = array.new_float()
int[] outB = array.new_int()
for i = sz - n to sz - 1
array.push(outP, array.get(\_prices, i))
array.push(outB, array.get(\_bars, i))
[outP, outB]

// Line function: y = m*x + c from 2 points
f_lineMC(int x1, float y1, int x2, float y2) =>
float m = (y2 - y1) / math.max(1, (x2 - x1))
float c = y1 - m * x1
[m, c]

f_lineY(float m, float c, int x) =>
m \* x + c

f_inLookback(int b) =>
b >= bar_index - lookbackBars

//──────────────────────────────────────────────────────────────────────────────
// Optional: basic S/R from pivot clustering (simple, not perfect)
// Draws last few clustered levels using lines
//──────────────────────────────────────────────────────────────────────────────
var line[] srLines = array.new_line()
f_clearLines(\_lines) =>
for i = 0 to array.size(\_lines) - 1
line.delete(array.get(\_lines, i))
array.clear(\_lines)

f_clusterAndDrawSR() =>
if not showSR
return
f_clearLines(srLines)

    float tolSR = atr * srClusterTolAtr
    // collect recent pivot prices
    float[] all = array.new_float()
    int[]   allB = array.new_int()

    // last 12 highs/lows if available
    int take = 12
    int szH = array.size(phP)
    int szL = array.size(plP)

    for i = math.max(0, szH - take) to szH - 1
        float p = array.get(phP, i)
        int   b = array.get(phB, i)
        if f_inLookback(b)
            array.push(all, p), array.push(allB, b)

    for i = math.max(0, szL - take) to szL - 1
        float p = array.get(plP, i)
        int   b = array.get(plB, i)
        if f_inLookback(b)
            array.push(all, p), array.push(allB, b)

    // cluster by proximity (greedy)
    float[] levels = array.new_float()
    int[]   hits   = array.new_int()

    for i = 0 to array.size(all) - 1
        float p = array.get(all, i)
        bool placed = false
        for j = 0 to array.size(levels) - 1
            float lv = array.get(levels, j)
            if math.abs(p - lv) <= tolSR
                // update average level
                int h = array.get(hits, j)
                float newLv = (lv * h + p) / (h + 1)
                array.set(levels, j, newLv)
                array.set(hits, j, h + 1)
                placed := true
                break
        if not placed
            array.push(levels, p)
            array.push(hits, 1)

    // draw strongest 6
    // simple selection by hits (O(n^2) but small)
    int kMax = math.min(6, array.size(levels))
    for k = 0 to kMax - 1
        int best = -1
        int bestHits = -1
        for j = 0 to array.size(levels) - 1
            int h = array.get(hits, j)
            if h > bestHits
                bestHits := h
                best := j
        if best >= 0
            float lv = array.get(levels, best)
            // draw horizontal line
            line ln = line.new(bar_index - lookbackBars, lv, bar_index, lv, extend=extend.right)
            array.push(srLines, ln)
            // mark used by setting hits to -999
            array.set(hits, best, -999)

if barstate.islast
f_clusterAndDrawSR()

//──────────────────────────────────────────────────────────────────────────────
// Pattern detectors
// Each returns: [bool found, string name, float score, float target, float stop, line necklineLine]
// necklineLine used for HCH; others can ignore
//──────────────────────────────────────────────────────────────────────────────

// TRIANGLE: need last 3 pivot highs descending & last 3 pivot lows ascending, both in lookback
f_detectTriangle() =>
bool found = false
string name = "Triangle"
float score = 0.0
float target = na
float stop = na

    [hP, hB] = f_getLastN(phP, phB, 3)
    [lP, lB] = f_getLastN(plP, plB, 3)

    if not na(hP) and not na(lP)
        float h1 = array.get(hP, 0), h2 = array.get(hP, 1), h3 = array.get(hP, 2)
        int   hb1 = array.get(hB, 0), hb2 = array.get(hB, 1), hb3 = array.get(hB, 2)
        float l1 = array.get(lP, 0), l2 = array.get(lP, 1), l3 = array.get(lP, 2)
        int   lb1 = array.get(lB, 0), lb2 = array.get(lB, 1), lb3 = array.get(lB, 2)

        bool inLb = f_inLookback(hb1) and f_inLookback(hb2) and f_inLookback(hb3) and f_inLookback(lb1) and f_inLookback(lb2) and f_inLookback(lb3)
        if inLb
            bool highsDown = (h1 > h2 + tol) and (h2 > h3 + tol)
            bool lowsUp   = (l1 + tol < l2) and (l2 + tol < l3)

            if highsDown and lowsUp
                // Fit lines using first and last pivots
                [mU, cU] = f_lineMC(hb1, h1, hb3, h3)
                [mL, cL] = f_lineMC(lb1, l1, lb3, l3)

                float upNow = f_lineY(mU, cU, bar_index)
                float loNow = f_lineY(mL, cL, bar_index)

                // Convergence: upper above lower, and distance shrinking (roughly)
                float widthNow = upNow - loNow
                float widthPast = f_lineY(mU, cU, hb1) - f_lineY(mL, cL, hb1)
                bool compress = widthNow < widthPast * 0.75

                // Breakout condition
                bool breakUp = close > upNow + tol and volOk
                bool breakDn = close < loNow - tol and volOk

                if compress and (breakUp or breakDn)
                    found := true
                    name  := breakUp ? "Triangle BreakUp" : "Triangle BreakDown"

                    // Score components
                    score := 0
                    score += 2  // geometry ok
                    score += compress ? 1 : 0
                    score += (trendUp and breakUp) or (trendDown and breakDn) ? 2 : 0
                    score += volOk ? 1 : 0

                    // Target = triangle height projected from breakout
                    float triHeight = math.abs(h1 - l1)
                    float brk = breakUp ? close : close
                    target := breakUp ? (brk + triHeight) : (brk - triHeight)

                    // Stop = opposite side line
                    stop := breakUp ? loNow : upNow

    [found, name, score, target, stop]

// HCH: sequence High1 Low1 High2 Low2 High3 (pivot highs/lows interleaved)
f_detectHCH() =>
bool found = false
string name = "HCH"
float score = 0.0
float target = na
float stop = na
line neckLine = na

    // Need last 3 pivot highs and last 2 pivot lows
    [hP, hB] = f_getLastN(phP, phB, 3)
    [lP, lB] = f_getLastN(plP, plB, 2)

    if not na(hP) and not na(lP)
        float H1 = array.get(hP, 0), H2 = array.get(hP, 1), H3 = array.get(hP, 2)
        int   bH1 = array.get(hB, 0), bH2 = array.get(hB, 1), bH3 = array.get(hB, 2)

        float L1 = array.get(lP, 0), L2 = array.get(lP, 1)
        int   bL1 = array.get(lB, 0), bL2 = array.get(lB, 1)

        bool inOrder = (bH1 < bL1) and (bL1 < bH2) and (bH2 < bL2) and (bL2 < bH3)
        bool inLb = f_inLookback(bH1) and f_inLookback(bH2) and f_inLookback(bH3) and f_inLookback(bL1) and f_inLookback(bL2)

        if inOrder and inLb
            bool headHigher = (H2 > H1 + tol) and (H2 > H3 + tol)
            bool shouldersSimilar = math.abs(H1 - H3) <= tol * 2.0

            // neckline
            [mN, cN] = f_lineMC(bL1, L1, bL2, L2)
            float neckNow = f_lineY(mN, cN, bar_index)

            bool breakDown = close < neckNow - tol and volOk

            if headHigher and shouldersSimilar and breakDown and trendUp
                found := true
                name := "HCH Breakdown"

                score := 0
                score += 3
                score += shouldersSimilar ? 1 : 0
                score += volOk ? 1 : 0
                score += trendUp ? 1 : 0

                // target = (head - neckline_at_head) projected down from break
                float neckAtHead = f_lineY(mN, cN, bH2)
                float height = H2 - neckAtHead
                target := close - height

                // stop = above right shoulder
                stop := H3 + tol

                // draw neckline (only when found)
                neckLine := line.new(bL1, L1, bar_index, neckNow, extend=extend.right)

    [found, name, score, target, stop, neckLine]

// Double Bottom / Top
f_detectDoubleBottomTop() =>
bool found = false
string name = "Double"
float score = 0.0
float target = na
float stop = na

    // Double bottom: L1, Peak, L2 (last 2 lows + last high between them)
    // We'll use last 2 lows and last 1 high, and ensure ordering L1 < H < L2 in time
    [lP, lB] = f_getLastN(plP, plB, 2)
    [hP, hB] = f_getLastN(phP, phB, 1)

    if not na(lP) and not na(hP)
        float L1 = array.get(lP, 0), L2 = array.get(lP, 1)
        int   bL1 = array.get(lB, 0), bL2 = array.get(lB, 1)

        float HP = array.get(hP, 0)
        int   bHP = array.get(hB, 0)

        bool inLb = f_inLookback(bL1) and f_inLookback(bL2) and f_inLookback(bHP)

        // Try double bottom first
        bool bottomOrder = (bL1 < bHP) and (bHP < bL2)
        bool bottomsSimilar = math.abs(L1 - L2) <= tol * 2.0
        bool breakoutUp = close > HP + tol and volOk

        if inLb and bottomOrder and bottomsSimilar and breakoutUp and trendDown
            found := true
            name := "Double Bottom BreakUp"
            score := 0
            score += 3
            score += volOk ? 1 : 0
            score += bottomsSimilar ? 1 : 0

            float height = HP - math.min(L1, L2)
            target := close + height
            stop := math.min(L1, L2) - tol

        // If not, try double top (mirror)
        if not found
            // use last 2 highs and last low between them
            [hP2, hB2] = f_getLastN(phP, phB, 2)
            [lP1, lB1] = f_getLastN(plP, plB, 1)
            if not na(hP2) and not na(lP1)
                float H1 = array.get(hP2, 0), H2 = array.get(hP2, 1)
                int   bH1 = array.get(hB2, 0), bH2 = array.get(hB2, 1)
                float LP = array.get(lP1, 0)
                int   bLP = array.get(lB1, 0)

                bool topOrder = (bH1 < bLP) and (bLP < bH2)
                bool topsSimilar = math.abs(H1 - H2) <= tol * 2.0
                bool breakoutDn = close < LP - tol and volOk
                bool inLb2 = f_inLookback(bH1) and f_inLookback(bH2) and f_inLookback(bLP)

                if inLb2 and topOrder and topsSimilar and breakoutDn and trendUp
                    found := true
                    name := "Double Top BreakDown"
                    score := 0
                    score += 3
                    score += volOk ? 1 : 0
                    score += topsSimilar ? 1 : 0

                    float height = math.max(H1, H2) - LP
                    target := close - height
                    stop := math.max(H1, H2) + tol

    [found, name, score, target, stop]

// Gaps (simple)
f_detectGap() =>
bool found = false
string name = "Gap"
float score = 0.0
float target = na
float stop = na

    bool gapUp = low > high[1]
    bool gapDn = high < low[1]

    if gapUp or gapDn
        found := true
        name := gapUp ? "Gap Up" : "Gap Down"
        score := 1 + (volOk ? 1 : 0)
        // target/stop left as na (context dependent)

    [found, name, score, target, stop]

//──────────────────────────────────────────────────────────────────────────────
// Run detectors (priority: reversal > continuation > others)
//──────────────────────────────────────────────────────────────────────────────
[triOk, triName, triScore, triTarget, triStop] = f_detectTriangle()
[hchOk, hchName, hchScore, hchTarget, hchStop, hchNeck] = f_detectHCH()
[dblOk, dblName, dblScore, dblTarget, dblStop] = f_detectDoubleBottomTop()
[gapOk, gapName, gapScore, gapTarget, gapStop] = f_detectGap()

// Choose best signal of the bar (simple priority + score)
string bestName = ""
float bestScore = 0
float bestTarget = na
float bestStop = na
bool bestOk = false

f_pick(bool ok, string nm, float sc, float tgt, float stp) =>
if ok and sc > bestScore
bestOk := true
bestName := nm
bestScore := sc
bestTarget := tgt
bestStop := stp

// priority: HCH, Double, Triangle, Gap
f_pick(hchOk, hchName, hchScore, hchTarget, hchStop)
f_pick(dblOk, dblName, dblScore, dblTarget, dblStop)
f_pick(triOk, triName, triScore, triTarget, triStop)
f_pick(gapOk, gapName, gapScore, gapTarget, gapStop)

//──────────────────────────────────────────────────────────────────────────────
// Output: labels + alerts
//──────────────────────────────────────────────────────────────────────────────
f_label(string txt, bool isBull) =>
label.new(bar_index, isBull ? low : high, txt,
style = isBull ? label.style_label_up : label.style_label_down,
textcolor = color.white)

if bestOk
bool bull = str.contains(bestName, "BreakUp") or str.contains(bestName, "Gap Up") or str.contains(bestName, "Bottom")
string txt = bestName + "\nscore=" + str.tostring(bestScore, "#.0") +
(na(bestTarget) ? "" : "\nT=" + str.tostring(bestTarget, format.mintick)) +
(na(bestStop) ? "" : "\nSL=" + str.tostring(bestStop, format.mintick))
f_label(txt, bull)

// Alerts
alertcondition(triOk, title="Triangle breakout", message="Triangle breakout detected")
alertcondition(hchOk, title="HCH breakdown", message="HCH breakdown detected")
alertcondition(dblOk, title="Double top/bottom breakout", message="Double pattern breakout detected")
alertcondition(gapOk, title="Gap detected", message="Gap detected")
