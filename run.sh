#!/bin/bash

# Script de inicio rápido para el simulador de portfolio

echo "🚀 Simulador de Portfolio Revolut + Yahoo Finance"
echo "================================================="
echo "✨ Sin necesidad de API keys ni KYC"
echo ""

# Verificar si existe el entorno virtual
if [ ! -d "venv" ]; then
    echo "❌ Entorno virtual no encontrado. Creando..."
    python3 -m venv venv
    echo "✅ Entorno virtual creado"
fi

# Activar entorno virtual
source venv/bin/activate

# Verificar si están instaladas las dependencias
if ! python -c "import pandas" 2>/dev/null; then
    echo "📦 Instalando dependencias..."
    pip install -r requirements.txt
    echo "✅ Dependencias instaladas"
fi

# Verificar si existe yfinance
if ! python -c "import yfinance" 2>/dev/null; then
    echo "📦 Instalando yfinance..."
    pip install yfinance
    echo "✅ yfinance instalado"
fi

# Verificar si existen archivos CSV de Revolut
if ! ls revolut*.csv 1> /dev/null 2>&1; then
    echo ""
    echo "⚠️  No se encontraron archivos CSV de Revolut"
    echo "   Coloca tus archivos CSV exportados de Revolut en esta carpeta"
    echo "   Los nombres deben empezar por 'revolut' (ej: revolut_acciones.csv)"
    echo ""

    # Preguntar si quiere crear un archivo de ejemplo
    read -p "¿Quieres crear un archivo CSV de ejemplo para probar? (s/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        if [ -f "revolut_ejemplo.csv.template" ]; then
            cp revolut_ejemplo.csv.template revolut_ejemplo.csv
            echo "✅ Archivo de ejemplo creado: revolut_ejemplo.csv"
            echo "   Podrás probarlo ahora"
        else
            echo "❌ No se encontró la plantilla de ejemplo"
            exit 1
        fi
    else
        exit 1
    fi
fi

echo ""
echo "✅ Todo listo. Ejecutando simulación..."
echo ""

# Ejecutar el script
python simular_posiciones.py

# Verificar si se generó el archivo de salida
if [ -f "simulacion_portfolio.csv" ]; then
    echo ""
    echo "================================================="
    echo "✅ ¡Simulación completada con éxito!"
    echo "================================================="
    echo "📊 Resultado guardado en: simulacion_portfolio.csv"
    echo ""
    echo "Para ver el resultado:"
    echo "  • En terminal: cat simulacion_portfolio.csv"
    echo "  • Con Excel: Abre el archivo con tu aplicación favorita"
    echo "  • Con pandas: python -c 'import pandas as pd; print(pd.read_csv(\"simulacion_portfolio.csv\"))'"
fi
