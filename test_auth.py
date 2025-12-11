import requests
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# ==========================
# OPCIÓN 1: Usar API Keys (RECOMENDADO para uso personal)
# ==========================

# Configura estas credenciales en tu archivo .env:
# ALPACA_API_KEY=PKxxxxxxxxxx
# ALPACA_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

API_KEY = os.getenv("ALPACA_API_KEY", "TU_API_KEY")
API_SECRET = os.getenv("ALPACA_API_SECRET", "TU_API_SECRET")

# Endpoint de prueba: obtener información de la cuenta
ACCOUNT_URL = "https://paper-api.alpaca.markets/v2/account"

headers = {
    "APCA-API-KEY-ID": API_KEY,
    "APCA-API-SECRET-KEY": API_SECRET,
}

print("🧪 Probando conexión con Alpaca Markets (Paper Trading)...")
print(f"API Key: {API_KEY[:20]}..." if len(API_KEY) > 20 else f"API Key: {API_KEY}")
print()

try:
    response = requests.get(ACCOUNT_URL, headers=headers)

    print(f"Status Code: {response.status_code}")
    print()

    if response.status_code == 200:
        print("✅ ¡Conexión exitosa!")
        print()
        account = response.json()
        print("📊 Información de tu cuenta Paper Trading:")
        print(f"  - ID: {account.get('id', 'N/A')}")
        print(f"  - Status: {account.get('status', 'N/A')}")
        print(f"  - Equity: ${account.get('equity', 'N/A')}")
        print(f"  - Cash: ${account.get('cash', 'N/A')}")
        print(f"  - Buying Power: ${account.get('buying_power', 'N/A')}")
        print()
        print("✅ Tus credenciales funcionan correctamente!")

    elif response.status_code == 401:
        print("❌ Error de autenticación (401)")
        print()
        print("Las credenciales no son válidas. Verifica:")
        print("  1. Que hayas copiado correctamente API_KEY y API_SECRET")
        print("  2. Que las claves sean de Paper Trading (no de OAuth2)")
        print("  3. Que las claves estén activas en tu dashboard de Alpaca")
        print()
        print(f"Respuesta del servidor: {response.text}")

    else:
        print(f"❌ Error {response.status_code}")
        print()
        print(f"Respuesta: {response.text}")

except Exception as e:
    print(f"❌ Error al conectar: {e}")

print()
print("=" * 60)
print()
print("📖 Cómo obtener tus API Keys correctas:")
print()
print("1. Ve a: https://app.alpaca.markets/paper/dashboard/overview")
print("2. En el menú lateral, busca 'API Keys' o 'Your API Keys'")
print("3. Genera nuevas claves si no tienes")
print("4. Copia:")
print("   - API Key ID (empieza con PK para Paper, AK para Live)")
print("   - Secret Key (string largo)")
print("5. Pégalas en tu archivo .env:")
print("   ALPACA_API_KEY=PKxxxxxxxxxx")
print("   ALPACA_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
print()
print("⚠️  IMPORTANTE: Usa Paper Trading para pruebas (claves PK)")
