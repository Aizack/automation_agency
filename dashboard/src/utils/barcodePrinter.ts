import JsBarcode from 'jsbarcode';

const renderCode128Svg = (value: string, width = 1.8, height = 42): string => {
    const cleanValue = (value || '').toUpperCase().replace(/[^0-9A-Z\-\.\s]/g, '').trim();
    if (!cleanValue) {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="42" viewBox="0 0 140 42"></svg>';
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', `${height}`);
    svg.setAttribute('viewBox', `0 0 ${Math.max(140, cleanValue.length * 11)} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    JsBarcode(svg, cleanValue, {
        format: 'CODE128',
        displayValue: false,
        width,
        height,
        margin: 4,
        background: '#ffffff',
        lineColor: '#000000',
        fontSize: 12,
        textMargin: 0
    });

    return svg.outerHTML;
};

export type LabelProfileId = 'two-column' | 'single-column' | 'pos';

export interface LabelPrintSettings {
    id: LabelProfileId;
    name: string;
    pageWidthMm: number;
    rowHeightMm: number;
    pageOrientation?: 'portrait' | 'landscape';
    columns: number;
    stickerWidthMm: number;
    stickerGapMm: number;
    paddingMm: number;
}

export const LABEL_PRINT_PROFILES: Record<LabelProfileId, LabelPrintSettings> = {
    'two-column': {
        id: 'two-column',
        name: '2 Columnas - Óptica / Joyería',
        pageWidthMm: 65.5,
        rowHeightMm: 15,
        pageOrientation: 'portrait',
        columns: 2,
        stickerWidthMm: 30.75,
        stickerGapMm: 2.5,
        paddingMm: 1.5
    },
    'single-column': {
        id: 'single-column',
        name: '1 Columna - Estándar',
        pageWidthMm: 50,
        rowHeightMm: 30,
        pageOrientation: 'portrait',
        columns: 1,
        stickerWidthMm: 50,
        stickerGapMm: 0,
        paddingMm: 2
    },
    pos: {
        id: 'pos',
        name: 'Tirilla Continua / POS 80mm',
        pageWidthMm: 80,
        rowHeightMm: 22,
        pageOrientation: 'portrait',
        columns: 1,
        stickerWidthMm: 80,
        stickerGapMm: 0,
        paddingMm: 1.5
    }
};

export const DEFAULT_LABEL_PRINT_SETTINGS = LABEL_PRINT_PROFILES['two-column'];

export const formatPrice = (p: number | string) => {
    const num = typeof p === 'string' ? parseFloat(p) : p;
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(num || 0);
};

export const generateBarcodeSvg = (sku: string): string => {
    return renderCode128Svg(sku, 1.8, 42);
};

export interface PrintItem {
    name: string;
    sku: string;
    price: number | string;
    quantity: number;
}

const normalizePrintItems = (items: PrintItem[], columns: number) => {
    const flattened: PrintItem[] = [];

    items.forEach(item => {
        const copies = Math.max(1, Number(item.quantity) || 1);
        for (let i = 0; i < copies; i += 1) {
            flattened.push({ ...item, quantity: 1 });
        }
    });

    const grouped: PrintItem[][] = [];
    for (let index = 0; index < flattened.length; index += columns) {
        const row = flattened.slice(index, index + columns);
        if (row.length < columns) {
            while (row.length < columns) {
                row.push({
                    name: '',
                    sku: '',
                    price: 0,
                    quantity: 0
                });
            }
        }
        grouped.push(row);
    }

    return grouped;
};

export const buildBarcodePrintHtml = (
    items: PrintItem[],
    settings: LabelPrintSettings = DEFAULT_LABEL_PRINT_SETTINGS,
    autoPrint: boolean = true
) => {
    if (!items || items.length === 0) return '';

    const rowGroups = normalizePrintItems(items, settings.columns);
    const rowsHtml = rowGroups.map((row) => {
        const rowCells = row.map((item) => {
            const isEmpty = !item.sku && !item.name;
            if (isEmpty) {
                return `
                    <div class="label-cell empty" style="width:${settings.stickerWidthMm}mm;height:${settings.rowHeightMm - 2}mm;flex:0 0 ${settings.stickerWidthMm}mm;visibility:hidden;">
                        <div class="label-inner"></div>
                    </div>
                `;
            }

            const cleanSku = (item.sku || '').toUpperCase().replace(/[^0-9A-Z\-\.\s]/g, '');
            const priceFormatted = formatPrice(item.price);
            const svg = generateBarcodeSvg(item.sku || '');
            const safeName = (item.name || 'Producto').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            return `
                <div class="label-cell" style="width:${settings.stickerWidthMm}mm;height:${settings.rowHeightMm - 2}mm;flex:0 0 ${settings.stickerWidthMm}mm;">
                    <div class="label-inner">
                        <div class="product-name">${safeName}</div>
                        <div class="barcode-wrap">${svg}</div>
                        <div class="barcode-text">${cleanSku}</div>
                        <div class="price">${priceFormatted}</div>
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="label-row">${rowCells}</div>`;
    }).join('');

    return `
        <html>
        <head>
            <title>Imprimir Códigos de Barras</title>
            <style>
                @page {
                    size: ${settings.pageWidthMm}mm auto;
                    margin: 0;
                    marks: none;
                    bleed: 0;
                }
                * { box-sizing: border-box; }
                html, body {
                    margin: 0;
                    padding: 0;
                    width: ${settings.pageWidthMm}mm;
                    background: white;
                    color: black;
                    font-family: 'Courier New', Courier, monospace;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    overflow: hidden;
                }
                body {
                    display: block;
                    transform: none !important;
                    zoom: 1 !important;
                }
                .label-row {
                    width: 65.5mm;
                    height: 15mm;
                    display: grid;
                    grid-template-columns: 31.5mm 31.5mm;
                    column-gap: 2.5mm;
                    box-sizing: border-box;
                    margin: 0 auto;
                    overflow: hidden;
                    page-break-after: auto;
                    break-after: auto;
                }
                .label-cell {
                    width: 31.5mm;
                    height: 15mm;
                    display: block;
                    box-sizing: border-box;
                    padding: 0.5mm;
                    overflow: hidden;
                    margin: 0;
                }
                .label-inner {
                    width: 100%;
                    height: 100%;
                    display: grid;
                    grid-template-rows: auto 5.5mm auto;
                    align-items: center;
                    justify-items: center;
                    text-align: center;
                    overflow: hidden;
                }
                .product-name {
                    font-size: 6px;
                    font-weight: bold;
                    line-height: 1.05;
                    max-width: 29.5mm;
                    width: 100%;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    text-align: center;
                    margin: 0;
                }
                .barcode-wrap {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    max-width: 29mm;
                    height: 6.5mm;
                    overflow: hidden;
                }
                .barcode-wrap svg {
                    display: block;
                    width: 100%;
                    max-width: 29mm;
                    height: 6.5mm !important;
                    object-fit: contain;
                }
                .barcode-text,
                .price {
                    font-size: 6px;
                    line-height: 1;
                    font-weight: bold;
                    text-align: center;
                    white-space: nowrap;
                    margin: 0;
                }
            </style>
        </head>
        <body>
            ${rowsHtml}
            ${autoPrint ? `
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 800);
                    };
                </script>
            ` : ''}
        </body>
        </html>
    `;
};

export const printBarcodes = (items: PrintItem[], settings: LabelPrintSettings = DEFAULT_LABEL_PRINT_SETTINGS) => {
    if (!items || items.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Por favor, permite las ventanas emergentes (popups) para poder imprimir.');
        return;
    }

    const html = buildBarcodePrintHtml(items, settings, true);
    if (!html) return;

    printWindow.document.write(html);
    printWindow.document.close();
};

export const previewBarcodes = (items: PrintItem[], settings: LabelPrintSettings = DEFAULT_LABEL_PRINT_SETTINGS) => {
    if (!items || items.length === 0) return;

    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
        alert('Por favor, permite las ventanas emergentes (popups) para poder abrir la vista previa.');
        return;
    }

    const html = buildBarcodePrintHtml(items, settings, false);
    if (!html) return;

    previewWindow.document.write(html);
    previewWindow.document.close();
};
