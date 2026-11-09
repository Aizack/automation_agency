import JsBarcode from 'jsbarcode';

const renderCode128Svg = (value: string, width = 1.8, height = 42): string => {
    const cleanValue = (value || '').toUpperCase().replace(/[^0-9A-Z\-\.\s]/g, '').trim();
    if (!cleanValue) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 42"></svg>';
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

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

    // Remove hardcoded px width & height so SVG stays 100% vector-fluid across all screen scales and DPIs
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('style', 'width:100%;height:100%;max-height:100%;display:block;');

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
        name: '2 Columnas - Óptica / Joyería (65.5 x 15 mm)',
        pageWidthMm: 65.5,
        rowHeightMm: 15,
        pageOrientation: 'portrait',
        columns: 2,
        stickerWidthMm: 31.5,
        stickerGapMm: 2.5,
        paddingMm: 1
    },
    'single-column': {
        id: 'single-column',
        name: '1 Columna - Estándar (50 x 30 mm)',
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

    const cellWidth = settings.columns === 2 ? (settings.stickerWidthMm || 31.5) : settings.pageWidthMm;
    const gap = settings.columns === 2 ? (settings.stickerGapMm || 2.5) : 0;

    const rowGroups = normalizePrintItems(items, settings.columns);
    const rowsHtml = rowGroups.map((row) => {
        const rowCells = row.map((item) => {
            const isEmpty = !item.sku && !item.name;
            if (isEmpty) {
                return `
                    <div class="label-cell empty" style="width:${cellWidth}mm;height:${settings.rowHeightMm}mm;">
                        <div class="label-inner"></div>
                    </div>
                `;
            }

            const cleanSku = (item.sku || '').toUpperCase().replace(/[^0-9A-Z\-\.\s]/g, '');
            const priceFormatted = formatPrice(item.price);
            const svg = generateBarcodeSvg(item.sku || '');
            const safeName = (item.name || 'Producto').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            return `
                <div class="label-cell" style="width:${cellWidth}mm;height:${settings.rowHeightMm}mm;">
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

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Imprimir Códigos de Barras</title>
    <style>
        @page {
            size: ${settings.pageWidthMm}mm ${settings.rowHeightMm}mm;
            margin: 0mm !important;
        }
        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: ${settings.pageWidthMm}mm !important;
            min-width: ${settings.pageWidthMm}mm !important;
            max-width: ${settings.pageWidthMm}mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            font-size: 10px !important;
            line-height: 1.1 !important;
            transform: none !important;
            zoom: 1 !important;
            -webkit-text-size-adjust: 100% !important;
            text-size-adjust: 100% !important;
            overflow: hidden !important;
        }
        .label-row {
            width: ${settings.pageWidthMm}mm;
            height: ${settings.rowHeightMm}mm;
            max-height: ${settings.rowHeightMm}mm;
            box-sizing: border-box;
            display: ${settings.columns === 2 ? 'grid' : 'flex'};
            ${settings.columns === 2 
                ? `grid-template-columns: ${cellWidth}mm ${cellWidth}mm; column-gap: ${gap}mm; justify-content: center;` 
                : 'justify-content: center; align-items: center;'}
            align-items: center;
            margin: 0 auto;
            padding: 0;
            overflow: hidden;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            background: #ffffff;
        }
        .label-row:last-child {
            page-break-after: avoid;
            break-after: avoid;
        }
        .label-cell {
            width: ${cellWidth}mm;
            height: ${settings.rowHeightMm}mm;
            max-height: ${settings.rowHeightMm}mm;
            box-sizing: border-box;
            padding: 0.8mm 1mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            margin: 0;
            flex-shrink: 0;
        }
        .label-cell.empty {
            visibility: hidden;
        }
        .label-inner {
            width: 100%;
            height: 100%;
            max-height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            overflow: hidden;
            gap: 0.2mm;
        }
        .product-name {
            font-size: 6.5px;
            font-weight: 700;
            line-height: 1.1;
            max-width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: center;
            margin: 0;
            color: #000000;
        }
        .barcode-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            max-width: 29mm;
            height: 6.2mm;
            max-height: 6.2mm;
            overflow: hidden;
            margin: 0.3mm 0;
        }
        .barcode-wrap svg {
            display: block;
            width: 100%;
            height: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        .barcode-text {
            font-size: 6.5px;
            line-height: 1;
            font-weight: 700;
            text-align: center;
            white-space: nowrap;
            letter-spacing: 0.4px;
            margin: 0;
            color: #000000;
            font-family: 'Courier New', Courier, monospace;
        }
        .price {
            font-size: 6.5px;
            line-height: 1;
            font-weight: 800;
            text-align: center;
            white-space: nowrap;
            margin: 0;
            color: #000000;
        }
    </style>
</head>
<body>
    ${rowsHtml}
    ${autoPrint ? `
        <script>
            window.addEventListener('load', function() {
                setTimeout(function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 1200);
                }, 150);
            });
        </script>
    ` : ''}
</body>
</html>`;
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
