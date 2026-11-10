"""
Frant Print Agent - Micro-Servicio Local de Impresión Térmica
Autor: Frant Cloud / DiazLab
Versión: 1.0.0

Permite al ERP Web (app.diazlab.online) comunicarse de forma directa,
silenciosa y precisa con impresoras térmicas (TSPL / ESC-POS) en Windows
mediante la API nativa winspool.drv en modo RAW.
"""

import sys
import json
import logging
import ctypes
from ctypes import wintypes
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

PORT = 19890
VERSION = "1.0.0"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("FrantPrintAgent")

# ----------------- WIN32 PRINTING PRIMITIVES -----------------
winspool = ctypes.WinDLL("winspool.drv")

class PRINTER_INFO_2(ctypes.Structure):
    _fields_ = [
        ("pServerName", wintypes.LPWSTR),
        ("pPrinterName", wintypes.LPWSTR),
        ("pShareName", wintypes.LPWSTR),
        ("pPortName", wintypes.LPWSTR),
        ("pDriverName", wintypes.LPWSTR),
        ("pComment", wintypes.LPWSTR),
        ("pLocation", wintypes.LPWSTR),
        ("pDevMode", ctypes.c_void_p),
        ("pSepFile", wintypes.LPWSTR),
        ("pPrintProcessor", wintypes.LPWSTR),
        ("pDatatype", wintypes.LPWSTR),
        ("pParameters", wintypes.LPWSTR),
        ("pSecurityDescriptor", ctypes.c_void_p),
        ("Attributes", wintypes.DWORD),
        ("Priority", wintypes.DWORD),
        ("DefaultPriority", wintypes.DWORD),
        ("StartTime", wintypes.DWORD),
        ("UntilTime", wintypes.DWORD),
        ("Status", wintypes.DWORD),
        ("cJobs", wintypes.DWORD),
        ("AveragePPM", wintypes.DWORD)
    ]

class DOC_INFO_1(ctypes.Structure):
    _fields_ = [
        ("pDocName", wintypes.LPWSTR),
        ("pOutputFile", wintypes.LPWSTR),
        ("pDatatype", wintypes.LPWSTR)
    ]

def get_installed_printers():
    """Enumera las impresoras instaladas en Windows"""
    PRINTER_ENUM_LOCAL = 2
    PRINTER_ENUM_CONNECTIONS = 4
    flags = PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS

    needed = wintypes.DWORD(0)
    returned = wintypes.DWORD(0)

    winspool.EnumPrintersW(flags, None, 2, None, 0, ctypes.byref(needed), ctypes.byref(returned))
    if needed.value == 0:
        return []

    buffer = (ctypes.c_byte * needed.value)()
    ok = winspool.EnumPrintersW(flags, None, 2, buffer, needed.value, ctypes.byref(needed), ctypes.byref(returned))
    if not ok:
        return []

    printers = ctypes.cast(buffer, ctypes.POINTER(PRINTER_INFO_2))
    result = []
    for i in range(returned.value):
        p = printers[i]
        result.append({
            "name": p.pPrinterName or "",
            "driver": p.pDriverName or "",
            "port": p.pPortName or "",
            "status": int(p.Status)
        })
    return result

def send_raw_bytes_to_printer(printer_name: str, raw_data: bytes, doc_name: str = "Frant Print Job"):
    """Envía bytes crudos (RAW) directamente al spooler de la impresora en Windows"""
    hPrinter = wintypes.HANDLE()
    if not winspool.OpenPrinterW(printer_name, ctypes.byref(hPrinter), None):
        raise RuntimeError(f"No se pudo abrir la impresora '{printer_name}'. ¿Está conectada y encendida?")

    try:
        docInfo = DOC_INFO_1(doc_name, None, "RAW")
        jobId = winspool.StartDocPrinterW(hPrinter, 1, ctypes.byref(docInfo))
        if jobId <= 0:
            err = ctypes.GetLastError()
            raise RuntimeError(f"Error al iniciar trabajo de impresión en '{printer_name}' (Código error Windows: {err})")

        try:
            winspool.StartPagePrinter(hPrinter)
            written = wintypes.DWORD(0)
            ok = winspool.WritePrinter(hPrinter, raw_data, len(raw_data), ctypes.byref(written))
            if not ok or written.value != len(raw_data):
                err = ctypes.GetLastError()
                raise RuntimeError(f"Error al escribir datos en la impresora (Código: {err})")
            winspool.EndPagePrinter(hPrinter)
        finally:
            winspool.EndDocPrinter(hPrinter)
    finally:
        winspool.ClosePrinter(hPrinter)

    return True

# ----------------- GENERADOR DE COMANDOS TSPL -----------------
def generate_tspl_labels_two_column(items: list, density: int = 8, speed: int = 3) -> bytes:
    """
    Genera comandos TSPL nativos para rollo troquelado de 2 columnas:
    - Ancho etiqueta: 65.5mm (2x 31.5mm + gap central 2.5mm)
    - Alto etiqueta: 15.0mm
    - Gap vertical: 2.5mm
    - Margen izquierdo de liner: 3.0mm (24 dots @ 203 DPI)
    - 203 DPI = 8 dots por mm
    """
    # Expandir items por cantidad
    flat_items = []
    for it in items:
        qty = max(1, int(it.get("quantity", 1)))
        for _ in range(qty):
            flat_items.append({
                "name": str(it.get("name", "Producto")).strip(),
                "sku": str(it.get("sku", "")).upper().strip(),
                "price": it.get("price", 0)
            })

    # Agrupar en filas de 2 stickers
    commands = []
    
    # Encabezado TSPL de configuración física del material
    commands.append("SIZE 65.5 mm, 15 mm")
    commands.append("GAP 2.5 mm, 0 mm")
    commands.append(f"SPEED {speed}")
    commands.append(f"DENSITY {density}")
    commands.append("DIRECTION 1")
    commands.append("REFERENCE 0,0")

    # Coordenadas exactas en dots (8 dots / mm)
    # Columna 1 (Izquierda): X = 24 dots (3.0mm liner)
    # Columna 2 (Derecha): X = 296 dots (3.0mm liner + 31.5mm sticker + 2.5mm gap = 37.0mm = 296 dots)
    col_x = [24, 296]

    for i in range(0, len(flat_items), 2):
        row_items = flat_items[i:i+2]
        commands.append("CLS") # Limpia buffer de la fila

        for col_idx, item in enumerate(row_items):
            base_x = col_x[col_idx]
            sku = item["sku"]
            name = item["name"][:20] # Truncar a 20 chars para no salirse
            price_val = item["price"]
            try:
                price_str = f"$ {int(float(price_val)):,}".replace(",", ".")
            except Exception:
                price_str = f"$ {price_val}"

            # 1. Título (Arriba): Y=14 dots (~1.7mm)
            # TEXT x, y, "font", rotation, x_mult, y_mult, "content"
            # Font "1" es 8x12 dots, Font "2" es 12x20 dots
            commands.append(f'TEXT {base_x + 10},12,"1",0,1,1,"{name}"')

            # 2. Código de Barras Code 128 (Centro): Y=32 dots (~4.0mm), Alto=50 dots (~6.2mm)
            # BARCODE x, y, "code_type", height, human_readable, rotation, narrow, wide, "content"
            if sku:
                commands.append(f'BARCODE {base_x + 15},32,"128",48,0,0,2,2,"{sku}"')

            # 3. SKU y Precio (Abajo): Y=88 dots (~11.0mm)
            footer_text = f"{sku}  {price_str}"
            commands.append(f'TEXT {base_x + 10},88,"1",0,1,1,"{footer_text}"')

        # Imprimir la fila (1 copia)
        commands.append("PRINT 1,1")

    full_script = "\r\n".join(commands) + "\r\n"
    return full_script.encode("ascii", errors="replace")

# ----------------- SERVIDOR HTTP CON CORS -----------------
class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class PrintRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def _respond_json(self, status_code: int, data: dict):
        self.send_response(status_code)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def do_GET(self):
        path = self.path.split("?")[0]
        if path in ["/", "/health", "/status"]:
            printers = get_installed_printers()
            self._respond_json(200, {
                "success": True,
                "service": "FrantPrintAgent",
                "version": VERSION,
                "printers_count": len(printers),
                "printers": printers
            })
        elif path == "/printers":
            printers = get_installed_printers()
            self._respond_json(200, {
                "success": True,
                "printers": printers
            })
        else:
            self._respond_json(404, {"success": False, "error": "Ruta no encontrada."})

    def do_POST(self):
        path = self.path.split("?")[0]
        content_length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(content_length)

        try:
            body = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except Exception as e:
            self._respond_json(400, {"success": False, "error": f"JSON inválido: {str(e)}"})
            return

        printer_name = body.get("printer")
        if not printer_name:
            # Buscar impresora térmica predeterminada
            printers = get_installed_printers()
            target = next((p["name"] for p in printers if "etiqueta" in p["name"].lower() or "barcode" in p["name"].lower() or "3b-365" in p["name"].lower()), None)
            if not target and printers:
                target = printers[0]["name"]
            printer_name = target

        if not printer_name:
            self._respond_json(400, {"success": False, "error": "No se encontró ninguna impresora instalada."})
            return

        if path == "/print/raw":
            raw_text = body.get("commands", "")
            if not raw_text:
                self._respond_json(400, {"success": False, "error": "Faltan 'commands' en el cuerpo."})
                return
            try:
                raw_bytes = raw_text.encode("latin-1", errors="replace")
                send_raw_bytes_to_printer(printer_name, raw_bytes, "Frant Raw Print")
                logger.info(f"Trabajo RAW enviado a '{printer_name}' ({len(raw_bytes)} bytes)")
                self._respond_json(200, {"success": True, "message": f"Datos enviados a {printer_name}"})
            except Exception as e:
                logger.error(f"Error en /print/raw: {e}")
                self._respond_json(500, {"success": False, "error": str(e)})

        elif path == "/print/labels":
            items = body.get("items", [])
            if not items:
                self._respond_json(400, {"success": False, "error": "La lista de 'items' está vacía."})
                return
            try:
                density = int(body.get("density", 8))
                speed = int(body.get("speed", 3))
                tspl_bytes = generate_tspl_labels_two_column(items, density=density, speed=speed)
                send_raw_bytes_to_printer(printer_name, tspl_bytes, "Frant Barcodes TSPL")
                logger.info(f"Impresión de {len(items)} items enviada a '{printer_name}' en TSPL nativo")
                self._respond_json(200, {
                    "success": True,
                    "printer": printer_name,
                    "message": f"{len(items)} etiquetas enviadas a {printer_name} correctamente."
                })
            except Exception as e:
                logger.error(f"Error en /print/labels: {e}")
                self._respond_json(500, {"success": False, "error": str(e)})

        elif path == "/test-label":
            test_item = [{
                "name": "TEST CALIBRACION",
                "sku": "10000429",
                "price": 90000,
                "quantity": 2
            }]
            try:
                tspl_bytes = generate_tspl_labels_two_column(test_item, density=8, speed=3)
                send_raw_bytes_to_printer(printer_name, tspl_bytes, "Frant Test Label")
                logger.info(f"Etiqueta de prueba enviada a '{printer_name}'")
                self._respond_json(200, {
                    "success": True,
                    "printer": printer_name,
                    "message": f"Etiqueta de prueba enviada a {printer_name}"
                })
            except Exception as e:
                logger.error(f"Error en /test-label: {e}")
                self._respond_json(500, {"success": False, "error": str(e)})

        else:
            self._respond_json(404, {"success": False, "error": "Endpoint POST no encontrado."})

def main():
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    print("=" * 65)
    print(f"       FRANT PRINT AGENT v{VERSION} - SERVICIO LOCAL")
    print("       Impresion Termica Nativa Directa (TSPL / ESC-POS)")
    print("=" * 65)
    
    printers = get_installed_printers()
    print(f"\n[+] Impresoras detectadas en Windows ({len(printers)}):")
    for p in printers:
        print(f"    * {p['name']} (Driver: {p['driver']}, Puerto: {p['port']})")

    server_address = ("127.0.0.1", PORT)
    try:
        httpd = ThreadedHTTPServer(server_address, PrintRequestHandler)
        print(f"\n[OK] Servidor activo escuchando en http://127.0.0.1:{PORT}")
        print("[OK] Listo para recibir ordenes de impresion desde el ERP.")
        print("\n(Presiona Ctrl + C para detener el servicio)\n")
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[!] Deteniendo Frant Print Agent...")
    except Exception as e:
        print(f"\n[X] Error fatal al iniciar el servidor: {e}")

if __name__ == "__main__":
    main()
