"""
Frant Print Agent - Micro-Servicio Local de Impresión Térmica
Autor: Frant Cloud / DiazLab
Versión: 1.0.0

Servicio residente en la bandeja del sistema (System Tray) para Windows.
Se auto-instala en el arranque de Windows (HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run).
Permite al ERP Web (https://app.diazlab.online) comunicarse de forma directa,
silenciosa y precisa con impresoras térmicas (TSPL / ESC-POS) en Windows
mediante la API nativa winspool.drv en modo RAW.
"""

import sys
import os
import json
import logging
import ctypes
from ctypes import wintypes
import winreg
import shutil
import threading
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from PIL import Image
import pystray
from pystray import MenuItem as item

PORT = 19890
VERSION = "1.0.0"

# Configurar logging seguro
log_dir = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~\\AppData\\Local")), "FrantPrintAgent")
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, "agent.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("FrantPrintAgent")

# ----------------- CONTROL DE INSTANCIA ÚNICA -----------------
mutex_handle = None
def is_already_running() -> bool:
    global mutex_handle
    kernel32 = ctypes.windll.kernel32
    mutex_handle = kernel32.CreateMutexW(None, False, "FrantPrintAgent_SingleInstance_Mutex")
    last_error = kernel32.GetLastError()
    ERROR_ALREADY_EXISTS = 183
    return last_error == ERROR_ALREADY_EXISTS

# ----------------- AUTO-ARRANQUE CON WINDOWS -----------------
def setup_windows_startup():
    """Registra la aplicación para que arranque automáticamente con Windows"""
    try:
        current_exe = os.path.abspath(sys.executable if getattr(sys, 'frozen', False) else __file__)
        if not getattr(sys, 'frozen', False):
            logger.info("Modo desarrollo detectado; omitiendo registro de Windows.")
            return

        local_app_data = os.environ.get("LOCALAPPDATA", os.path.expanduser("~\\AppData\\Local"))
        install_dir = os.path.join(local_app_data, "FrantPrintAgent")
        os.makedirs(install_dir, exist_ok=True)
        target_exe = os.path.join(install_dir, "FrantPrintAgent.exe")

        # Si se ejecuta desde Descargas, copiarse a AppData\Local\FrantPrintAgent
        if os.path.normcase(current_exe) != os.path.normcase(target_exe):
            try:
                shutil.copy2(current_exe, target_exe)
                current_exe = target_exe
                logger.info(f"Binario respaldado en: {target_exe}")
            except Exception as e:
                logger.warning(f"No se pudo copiar a AppData: {e}")

        # Escribir en el Registro de Windows (HKCU no pide permisos de administrador)
        key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE) as reg_key:
            winreg.SetValueEx(reg_key, "FrantPrintAgent", 0, winreg.REG_SZ, f'"{current_exe}"')

        logger.info(f"[OK] Auto-arranque registrado en Windows: {current_exe}")
    except Exception as e:
        logger.error(f"[X] Error configurando auto-arranque en Windows: {e}")

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
        doc_info = DOC_INFO_1(
            pDocName=doc_name,
            pOutputFile=None,
            pDatatype="RAW"
        )

        job_id = winspool.StartDocPrinterW(hPrinter, 1, ctypes.byref(doc_info))
        if job_id <= 0:
            err = ctypes.GetLastError()
            raise RuntimeError(f"Error al iniciar trabajo de impresión. Código de error Win32: {err}")

        try:
            if not winspool.StartPagePrinter(hPrinter):
                raise RuntimeError("No se pudo iniciar la página en la impresora.")

            bytes_written = wintypes.DWORD(0)
            ok = winspool.WritePrinter(
                hPrinter,
                raw_data,
                len(raw_data),
                ctypes.byref(bytes_written)
            )

            if not ok or bytes_written.value != len(raw_data):
                raise RuntimeError("No se pudieron escribir todos los bytes en el búfer de la impresora.")

            winspool.EndPagePrinter(hPrinter)
        finally:
            winspool.EndDocPrinter(hPrinter)
    finally:
        winspool.ClosePrinter(hPrinter)

# ----------------- GENERADOR TSPL / TSPL2 -----------------
def sanitize_text(text: str) -> str:
    """Limpia caracteres problemáticos para el motor de fuentes de la impresora"""
    if not text:
        return ""
    replacements = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
        'ñ': 'n', 'Ñ': 'N', '"': "'", '\\': '/', '\r': '', '\n': ' '
    }
    for orig, rep in replacements.items():
        text = text.replace(orig, rep)
    return text.strip()

def format_cop_currency(amount) -> str:
    try:
        val = int(amount)
        return f"$ {val:,}".replace(",", ".")
    except Exception:
        return f"$ {amount}"

def generate_tspl_labels_two_column(items: list, density: int = 8, speed: int = 3) -> bytes:
    """
    Genera comandos TSPL2 de ultra-precisión para el rollo térmico dual de Frant:
    Ancho total: 65.5 mm (524 dots a 203 DPI)
    Alto sticker: 15.0 mm (120 dots a 203 DPI)
    Separación (GAP): 2 mm (16 dots)
    """
    labels = []
    for it in items:
        qty = max(1, int(it.get("quantity", 1)))
        for _ in range(qty):
            labels.append({
                "name": sanitize_text(it.get("name", "")),
                "sku": sanitize_text(it.get("sku", "")),
                "price": format_cop_currency(it.get("price", 0))
            })

    commands = [
        "SIZE 65.5 mm, 15 mm",
        "GAP 2 mm, 0",
        f"DENSITY {density}",
        f"SPEED {speed}",
        "DIRECTION 1",
        "REFERENCE 0,0",
        "OFFSET 0 mm"
    ]

    total_labels = len(labels)
    for i in range(0, total_labels, 2):
        left_label = labels[i]
        right_label = labels[i + 1] if (i + 1 < total_labels) else None

        commands.append("CLS")

        # COLUMNA IZQUIERDA (X: 10 a 240 dots)
        name_l = left_label["name"][:22]
        commands.append(f'TEXT 16,10,"1",0,1,1,"{name_l}"')
        commands.append(f'BARCODE 16,36,"128",48,1,0,2,2,"{left_label["sku"]}"')
        commands.append(f'TEXT 16,94,"1",0,1,1,"{left_label["price"]}"')

        # COLUMNA DERECHA (X: 280 a 510 dots)
        if right_label:
            name_r = right_label["name"][:22]
            commands.append(f'TEXT 286,10,"1",0,1,1,"{name_r}"')
            commands.append(f'BARCODE 286,36,"128",48,1,0,2,2,"{right_label["sku"]}"')
            commands.append(f'TEXT 286,94,"1",0,1,1,"{right_label["price"]}"')

        commands.append("PRINT 1,1")

    full_script = "\r\n".join(commands) + "\r\n"
    return full_script.encode("ascii", errors="replace")

# ----------------- SERVIDOR HTTP CON CORS Y PNA -----------------
ALLOWED_ORIGINS = {
    "https://app.diazlab.online",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000"
}

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class PrintRequestHandler(BaseHTTPRequestHandler):
    def _get_validated_origin(self) -> str:
        origin = self.headers.get("Origin", "")
        if not origin:
            return "https://app.diazlab.online"
        if origin in ALLOWED_ORIGINS or origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:"):
            return origin
        return "https://app.diazlab.online"

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", self._get_validated_origin())
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Access-Control-Request-Private-Network")
        # Header esencial para Chrome / Edge Private Network Access (PNA):
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "86400")

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

        if content_length > 2 * 1024 * 1024:
            self._respond_json(413, {"success": False, "error": "Carga útil excesiva (máx. 2MB)."})
            return

        body_bytes = self.rfile.read(content_length)

        try:
            body = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except Exception as e:
            self._respond_json(400, {"success": False, "error": f"JSON inválido: {str(e)}"})
            return

        printer_name = body.get("printer")
        if not printer_name:
            printers = get_installed_printers()
            target = next((p["name"] for p in printers if "etiqueta" in p["name"].lower() or "barcode" in p["name"].lower() or "3b-365" in p["name"].lower()), None)
            if not target and printers:
                target = printers[0]["name"]
            printer_name = target

        if not printer_name:
            self._respond_json(400, {"success": False, "error": "No hay impresoras térmicas disponibles en Windows."})
            return

        if path == "/print/labels":
            items = body.get("items", [])
            if not items or not isinstance(items, list):
                self._respond_json(400, {"success": False, "error": "La lista de items para imprimir está vacía."})
                return

            try:
                density = int(body.get("density", 8))
                speed = int(body.get("speed", 3))
                tspl_bytes = generate_tspl_labels_two_column(items, density=density, speed=speed)
                send_raw_bytes_to_printer(printer_name, tspl_bytes, "Frant Barcode Batch")
                logger.info(f"Lote de {len(items)} items impreso exitosamente en '{printer_name}'")
                self._respond_json(200, {
                    "success": True,
                    "printer": printer_name,
                    "labels_count": len(items),
                    "message": f"Impresión completada en {printer_name}"
                })
            except Exception as e:
                logger.error(f"Error imprimiendo lote de etiquetas: {e}")
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

# ----------------- TRAY ICON (BANDEJA DEL SISTEMA) -----------------
def get_tray_icon_image():
    base_path = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
    icon_path = os.path.join(base_path, "app_icon.ico")
    if os.path.exists(icon_path):
        try:
            return Image.open(icon_path)
        except Exception:
            pass

    # Fallback: Icono dinámico púrpura con letra F
    img = Image.new('RGBA', (64, 64), color=(147, 51, 234, 255))
    return img

def run_system_tray(httpd: HTTPServer):
    icon_image = get_tray_icon_image()

    def on_open_erp(icon, item_):
        webbrowser.open("https://app.diazlab.online")

    def on_test_print(icon, item_):
        printers = get_installed_printers()
        target = next((p["name"] for p in printers if "etiqueta" in p["name"].lower() or "barcode" in p["name"].lower() or "3b-365" in p["name"].lower()), None)
        if not target and printers:
            target = printers[0]["name"]
        if target:
            test_item = [{"name": "TEST BANDEJA", "sku": "10000429", "price": 90000, "quantity": 2}]
            try:
                tspl = generate_tspl_labels_two_column(test_item)
                send_raw_bytes_to_printer(target, tspl, "Test Tray")
            except Exception as e:
                logger.error(f"Error desde tray test: {e}")

    def on_quit(icon, item_):
        icon.stop()
        try:
            httpd.shutdown()
        except Exception:
            pass
        sys.exit(0)

    menu = (
        item(f"Frant Print Agent v{VERSION} (Activo)", None, enabled=False),
        item("Puerto: 19890 (Local)", None, enabled=False),
        item("🏷️ Imprimir Etiqueta de Prueba", on_test_print),
        item("🌐 Abrir ERP (diazlab.online)", on_open_erp),
        item("❌ Salir", on_quit)
    )

    icon = pystray.Icon("FrantPrintAgent", icon_image, "Frant Print Agent (Activo)", menu)
    icon.run()

def main():
    if is_already_running():
        logger.warning("Ya existe una instancia de Frant Print Agent ejecutándose en este equipo.")
        sys.exit(0)

    # Configurar auto-arranque en el registro de Windows
    setup_windows_startup()

    server_address = ("127.0.0.1", PORT)
    try:
        httpd = ThreadedHTTPServer(server_address, PrintRequestHandler)
        logger.info(f"Servidor activo en http://127.0.0.1:{PORT}")

        # Ejecutar servidor HTTP en hilo de fondo
        server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        server_thread.start()

        # Iniciar icono en la bandeja del sistema (System Tray) en el hilo principal
        run_system_tray(httpd)
    except Exception as e:
        logger.error(f"Error fatal: {e}")

if __name__ == "__main__":
    main()
