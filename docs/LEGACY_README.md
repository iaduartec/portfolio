# 📊 Simulador de Portfolio Revolut con Yahoo Finance

Script Python que analiza tus operaciones de trading desde archivos CSV exportados de Revolut y simula tu portfolio actual usando precios en tiempo real de **Yahoo Finance**.

## 🚀 Características

- ✅ Lee múltiples archivos CSV de Revolut automáticamente
- ✅ Procesa operaciones BUY/SELL (market, limit, stop)
- ✅ Calcula posiciones finales por ticker
- ✅ **Obtiene precios en tiempo real desde Yahoo Finance (GRATIS, sin API keys)**
- ✅ Calcula métricas clave: PnL no realizado, rentabilidad porcentual
- ✅ Genera reporte CSV con todas las posiciones
- ✅ **No requiere KYC ni verificación de identidad**

## 📋 Requisitos Previos

1. **Python 3.8+** instalado
2. **Archivos CSV de Revolut** con tus operaciones
3. ✨ **¡Eso es todo! No necesitas ninguna cuenta ni API keys**

## 🔧 Instalación

### 1. Crear entorno virtual (recomendado)

```bash
python3 -m venv venv
source venv/bin/activate  # En Linux/Mac
# o en Windows: venv\Scripts\activate
```

### 1b. Crear entorno conda (alternativa completa)

Si usas Anaconda/Miniconda puedes recrear el entorno con `environment.yml` y mantener todas las dependencias replicadas:

```bash
conda env create -f environment.yml
conda activate revolut-portfolio
```

Cuando actualices las dependencias, vuelve a aplicar el archivo:

```bash
conda env update -f environment.yml --prune
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

O si prefieres instalación directa:

```bash
./venv/bin/pip install -r requirements.txt
```

### 3. Preparar archivos CSV de Revolut

Exporta tus operaciones desde Revolut y guárdalas en esta carpeta con nombres que empiecen por `revolut`:

- `revolut_acciones.csv`
- `revolut_robo.csv`
- `revolut_etfs.csv`
- etc.

El script leerá **todos** los archivos `revolut*.csv` automáticamente.

## 🎯 Uso

Asegúrate de activar el entorno virtual primero:

```bash
source venv/bin/activate
```

Luego ejecuta el script:

```bash
python simular_posiciones.py
```

O directamente:

```bash
./venv/bin/python simular_posiciones.py
```

### 🚀 Inicio Rápido (Recomendado)

Usa el script automatizado que valida todo por ti:

```bash
./run.sh
```

Este script:

- ✅ Crea el entorno virtual si no existe
- ✅ Instala dependencias automáticamente
- ✅ Verifica que existan archivos CSV de Revolut
- ✅ Ejecuta la simulación

### Salida del script

El script mostrará en consola:

1. Archivos CSV encontrados y leídos
2. Posiciones calculadas por ticker
3. Precios obtenidos desde Yahoo Finance
4. Resumen detallado con PnL por activo

Y generará un archivo **`simulacion_portfolio.csv`** con columnas:

| Columna | Descripción |
|---------|-------------|
| `symbol` | Ticker del activo (AAPL, GOOGL, etc.) |
| `Currency` | Divisa del activo (USD, EUR) |
| `qty_total` | Cantidad total de acciones/participaciones |
| `cost_net` | Coste neto total (suma de compras - ventas) |
| `avg_cost` | Precio medio de compra |
| `last_price` | Último precio de mercado (desde Yahoo Finance) |
| `market_value` | Valor de mercado actual |
| `unrealized_pnl` | Ganancia/pérdida no realizada |
| `unrealized_return_pct` | Rentabilidad porcentual |

## ⚠️ Consideraciones Importantes

### Acciones US

Las acciones estadounidenses (GOOGL, MU, AAPL, NVDA, AIZ, RL, etc.) **funcionarán perfectamente** y obtendrás precios en tiempo real.

### ETFs

- **ETFs US**: Funcionan bien (SPY, QQQ, VOO, etc.)
- **ETFs Europeos**: Algunos pueden no estar disponibles en Yahoo Finance
  - Si un ETF no está disponible, el precio aparecerá como vacío
  - Prueba añadir extensiones como `.L` (Londres), `.DE` (Frankfurt), etc.
  - Ejemplo: `VWCE.DE` en lugar de solo `VWCE`

### Divisas

Todos los cálculos se mantienen en la **divisa original del activo**:

- Acciones US → USD
- ETFs europeos → EUR

Si necesitas convertir todo a una sola divisa, habría que añadir conversión FX (puede ser una mejora futura).

## 🔮 Mejoras Futuras (Opcionales)

### 1. Conversión automática EUR ↔ USD

Agregar un paso de conversión de divisas para ver el portfolio completo en una sola moneda.

### 2. Jupyter Notebook con gráficos

Crear visualizaciones interactivas con:

- Distribución del portfolio por activo
- Evolución temporal de las posiciones
- Gráficos de rentabilidad por ticker

### 3. Dashboard web

Crear una interfaz web para visualizar el portfolio en tiempo real.

### 4. Alertas de precios

Notificaciones cuando un activo alcanza cierto precio.

## 📝 Ejemplo de Uso

```bash
$ python simular_posiciones.py

📊 Simulador de Portfolio Revolut
Usando Yahoo Finance para precios (sin necesidad de API keys)
============================================================

📄 Leyendo: revolut_acciones.csv
📄 Leyendo: revolut_robo.csv
✅ 25 operaciones encontradas

📈 Posiciones calculadas:
  symbol Currency  qty_total  cost_net
0   AAPL      USD       10.0   1500.50
1  GOOGL      USD        5.0    750.25

💰 Obteniendo precios desde Yahoo Finance...
  ✅ AAPL: $189.50
  ✅ GOOGL: $142.30

============================================================
📊 RESUMEN DEL PORTFOLIO
============================================================

🔹 AAPL
   Cantidad: 10.00
   Precio medio compra: $150.05
   Precio actual: $189.50
   Valor mercado: $1895.00
   PnL: $394.50 (26.29%)

🔹 GOOGL
   Cantidad: 5.00
   Precio medio compra: $150.05
   Precio actual: $142.30
   Valor mercado: $711.50
   PnL: $-38.75 (-5.17%)

============================================================
✅ Simulación completada. Guardado en: simulacion_portfolio.csv
============================================================
```

## 🤝 Soporte

Si tienes problemas:

1. Verifica que los CSV de Revolut tengan el formato correcto
2. Revisa que las dependencias estén instaladas: `pip list`
3. Prueba con diferentes extensiones para ETFs (.L, .DE, .PA, etc.)

## ✨ Ventajas de usar Yahoo Finance

- ✅ **Gratis y sin límites** de API calls
- ✅ **Sin registro ni KYC** requerido
- ✅ **Buena cobertura** de acciones US y globales
- ✅ **Datos en tiempo real** (con 15-20 min de delay)
- ✅ **Muy fácil de usar**

## 📄 Licencia

Proyecto personal para análisis de portfolio. Úsalo libremente.
