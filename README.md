# 📈 Next Portfolio AI – Analizador inteligente de inversiones con Next.js + Gemini 3 Pro

Aplicación web en **Next.js** pensada para **analizar tus inversiones a partir de un CSV de transacciones**, construir automáticamente tu **cartera actual** y generar un **análisis avanzado con IA**:  
tendencias, ratios, gráficos potentes y **proyecciones comentadas** que te ayuden a decidir qué hacer con tus acciones.

> ⚠️ Importante: esta herramienta es de **análisis educativo**. **No es asesoramiento financiero profesional.**

---

## ✨ Características principales

- 📂 **Importación de CSV de transacciones**
  - Compras, ventas, dividendos, comisiones, etc.
  - Soporte para varios brokers siempre que respeten el formato esperado.

- 💼 **Reconstrucción automática de cartera**
  - Cálculo de posición actual por ticker.
  - Precio medio de compra, plusvalías latentes, comisiones totales.
  - Historial de operación por valor.

- 📊 **Panel visual “espectacular”**
  - Gráficos de:
    - Evolución del valor de la cartera.
    - Distribución por sector, país y activo.
    - Rendimiento por ticker y por período.
  - Comparativa contra índices de referencia (ej. S&P 500, MSCI World, etc., si se integra).

- 🤖 **Análisis avanzado con IA (Gemini 3 Pro)**
  - Resumen en lenguaje natural de tu cartera.
  - Detección de:
    - Concentración excesiva en ciertos valores o sectores.
    - Volatilidad, drawdowns, y riesgos básicos.
  - Comentarios tipo:
    - “Tus 3 posiciones más dominantes son…”
    - “Tu cartera está muy expuesta a…”
    - “Este valor ha tenido un comportamiento atípico respecto al índice de referencia…”

- 🔮 **Proyecciones y escenarios**
  - Escenarios simulados (optimista, neutro, pesimista) basados en:
    - Histórico de precios (si se integra un proveedor de datos).
    - Volatilidad y tendencia reciente.
  - Explicación textual generada por IA:
    - qué podría pasar con tu cartera,
    - qué valores dominan el riesgo,
    - qué tipo de perfil “pareces tener” según tus posiciones.

- 🎨 **Interfaz bonita y usable**
  - UI moderna con **Tailwind CSS / shadcn/ui**.
  - Modo oscuro, tarjetas con KPIs clave y navegación simple:
    - **Dashboard**
    - **Cartera**
    - **Transacciones**
    - **Análisis IA**

---

## 🧱 Stack tecnológico

- **Frontend / Fullstack**: [Next.js](https://nextjs.org/) (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS + componentes tipo shadcn/ui
- **Gráficos**: Recharts / ECharts (a definir)
- **IA**: Gemini 3 Pro (para análisis en lenguaje natural y proyecciones)
- **Estado**: Zustand / React Query (opcional)
- **Deploy**: Vercel o similar

---

## 🚀 Empezando

### 1. Clonar el repositorio

```bash
git clone https://github.com/iaduartec/portfolio.git
cd portfolio
2. Instalar dependencias

pnpm install

3. Variables de entorno
Crea un archivo .env.local en la raíz del proyecto:

bash

cp .env.example .env.local
Rellena al menos:

env

GEMINI_API_KEY=tu_clave_de_gemini_3_pro
# Proveedor de datos de mercado, si lo usas:
MARKET_DATA_API_KEY=tu_clave_de_datos_de_mercado
Nota: la clave de Gemini 3 Pro se usará para generar los análisis y proyecciones personalizados a partir de tus datos.

4. Ejecutar en desarrollo
bash

pnpm dev

Abre en el navegador:
👉 http://localhost:3000

📥 Formato del CSV de transacciones
La aplicación esperará un CSV con, como mínimo, las siguientes columnas:

Columna	Tipo	Descripción
date	YYYY-MM-DD	Fecha de la operación
ticker	string	Símbolo del valor (ej. AAPL, MSFT, SAN.MC)
type	string	BUY, SELL, DIVIDEND, FEE, etc.
quantity	número	Número de acciones (+ para compra, – para venta)
price	número	Precio por acción en la divisa del broker
currency	string	Divisa (ej. EUR, USD)
fee	número	Comisión asociada (opcional, por defecto 0)
notes	string	Comentarios opcionales

Se pueden añadir más columnas; la app solo usará las necesarias y el resto las ignorará o las mostrará como información extra.

🧭 Flujo de uso
Subir CSV

Desde la página principal (/upload) seleccionas el archivo CSV con tus transacciones.

La app valida formato y muestra un resumen previo.

Reconstrucción de cartera

El backend procesa las transacciones y calcula:

Cartera actual por ticker.

Precio medio, plusvalía latente y capital invertido.

Rentabilidad histórica aproximada.

Dashboard visual

Se muestran:

Gráfico de evolución de cartera.

Top 5 posiciones.

Distribuciones por sector, país, divisa, etc. (si hay datos).

Análisis IA (Gemini 3 Pro)

Se genera un análisis textual del tipo:

Resumen del estado actual de la cartera.

Riesgos y puntos fuertes.

Comentario sobre concentración, diversificación y volatilidad.

Se generan proyecciones y escenarios con explicaciones sencillas.

Iterar

Puedes subir nuevos CSV (por ejemplo, de distintos brokers), actualizar transacciones y volver a lanzar el análisis.

🧠 IA: qué hace exactamente
Usando Gemini 3 Pro, la aplicación:

Resume carteras complejas en mensajes comprensibles.

Detecta patrones:

Exceso de exposición a un solo sector.

Valores que dominan el riesgo/rendimiento.

Propone escenarios a futuro (no deterministas, sino probabilísticos / cualitativos).

Te guía con comentarios del tipo:

“Si el mercado corrige un X%, tu cartera caería principalmente por estos tres valores…”

“Tu perfil de riesgo parece similar a un inversor agresivo/conservador por…”

La IA no decide por ti: te da contexto y lectura para que seas tú quien tome la decisión.

🧩 Estructura del proyecto (propuesta)
bash

src/
  app/
    page.tsx             # Dashboard principal
    upload/
      page.tsx           # Página para subir CSV
    portfolio/
      page.tsx           # Detalle de cartera
    analysis/
      page.tsx           # Análisis IA
  components/
    charts/
      PortfolioChart.tsx
      AllocationChart.tsx
    ui/
      Card.tsx
      Button.tsx
  lib/
    csv/
      parseTransactions.ts
    portfolio/
      buildPortfolio.ts
      metrics.ts
    ai/
      geminiClient.ts
      buildPrompt.ts
  types/
    transactions.ts
    portfolio.ts
    
🛣️ Roadmap (ideas futuras)
🔁 Soporte para sincronización automática con ciertos brokers (APIs).

🌍 Conversión automática de divisas y cálculo en moneda base (ej. EUR).

🧪 Backtesting de estrategias simples usando tu histórico.

📱 Versión responsive mejorada pensada para móvil.

🔔 Alertas configurables (ej. valor que supera cierta plusvalía o drawdown).

⚖️ Aviso legal
Este proyecto:

No es asesoramiento financiero.

No garantiza resultados ni rentabilidades.

Está pensado para que entiendas mejor tus inversiones y tomes decisiones con más información, pero la decisión final siempre es tu responsabilidad.

🤝 Contribuciones
Se aceptan PRs para:

Nuevos gráficos y visualizaciones.

Mejores prompts para Gemini 3 Pro.

Soporte para otros formatos de CSV / brokers.

Traducciones e internacionalización.

📜 Licencia
Licencia a elegir (ejemplo):

text
Copiar código
MIT License
Si quieres, en el siguiente paso puedo:

diseñarte el prompt exacto que usará Gemini 3 Pro para analizar la cartera,

o esbozarte las primeras APIs / endpoints de Next.js para procesar el CSV y generar el análisis.

makefile
Copiar código
::contentReference[oaicite:0]{index=0}