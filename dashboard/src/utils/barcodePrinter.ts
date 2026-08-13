export const code39Map: Record<string, string> = {
    '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
    '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
    '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
    'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
    'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
    'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
    'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
    'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
    'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
    '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101'
};

export const formatPrice = (p: number | string) => {
    const num = typeof p === 'string' ? parseFloat(p) : p;
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(num || 0);
};

export const generateBarcodeSvg = (sku: string): string => {
    const cleanValue = sku.toUpperCase().replace(/[^0-9A-Z\-.\s]/g, '');
    const fullText = `*${cleanValue}*`;
    let pattern = '';
    for (let char of fullText) {
        pattern += (code39Map[char] || code39Map[' ']) + '0';
    }
    
    const barWidth = 1.5;
    const height = 40;
    const width = pattern.length * barWidth;
    
    let svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background:white;padding:2px;border-radius:4px;">`;
    pattern.split('').forEach((bit, idx) => {
        if (bit === '1') {
            svgContent += `<rect x="${idx * barWidth}" y="0" width="${barWidth}" height="${height}" fill="#000000" />`;
        }
    });
    svgContent += `</svg>`;
    return svgContent;
};

export interface PrintItem {
    name: string;
    sku: string;
    price: number | string;
    quantity: number;
}

export const printBarcodes = (items: PrintItem[]) => {
    if (!items || items.length === 0) return;
    
    let labelsHtml = '';
    
    items.forEach(item => {
        const svg = generateBarcodeSvg(item.sku);
        const priceFormatted = formatPrice(item.price);
        const cleanSku = item.sku.toUpperCase().replace(/[^0-9A-Z\-.\s]/g, '');
        
        for (let i = 0; i < item.quantity; i++) {
            labelsHtml += `
                <div class="label">
                    <div class="product-name">${item.name}</div>
                    ${svg}
                    <div class="barcode-text">${cleanSku}</div>
                    <div class="price">${priceFormatted}</div>
                </div>
            `;
        }
    });
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Por favor, permite las ventanas emergentes (popups) para poder imprimir.');
        return;
    }
    
    printWindow.document.write(`
        <html>
        <head>
            <title>Imprimir Códigos de Barras</title>
            <style>
                @page {
                    size: 50mm 30mm;
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 0;
                    background: white;
                    color: black;
                    font-family: 'Courier New', Courier, monospace;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .label {
                    width: 50mm;
                    height: 30mm;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                    padding: 2mm;
                    page-break-after: always;
                    overflow: hidden;
                }
                .product-name {
                    font-size: 8px;
                    font-weight: bold;
                    margin-bottom: 2px;
                    text-align: center;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    width: 100%;
                }
                .barcode-text {
                    font-size: 8px;
                    letter-spacing: 2px;
                    margin-top: 2px;
                    text-align: center;
                }
                .price {
                    font-size: 9px;
                    font-weight: bold;
                    margin-top: 1px;
                }
            </style>
        </head>
        <body>
            ${labelsHtml}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};
