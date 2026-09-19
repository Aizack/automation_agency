# AGENTE VERTICAL 03: FACTURACIÓN POS/DIAN, COTIZACIONES & CARTERA

## Submódulos Alineados del Menú:
- **Facturación POS & DIAN** (Emisión de facturas electrónicas y tirilla térmica)
- **Cotizaciones** (Presupuestos comerciales)
- **Documentos Soporte** (Compras a no obligados a facturar)
- **Arqueo de Caja** (Cierre diario, efectivo, transferencias)
- **Cartera de Cobros** (Cuentas por cobrar y cuotas)

## Componentes y Tablas Relacionadas:
- Componentes: `SaaSErpInvoices.tsx`, `SaaSErpQuotes.tsx`, `SaaSErpSupportDocuments.tsx`, `SaaSErpCartera.tsx`
- Tablas SQL: `invoices`, `invoice_items`, `quotes`, `support_documents`, `installments`

## Directrices de Negocio:
1. **Firma Electrónica**: Integración transparente con Factus / Alegra.
2. **Arqueo de Caja**: Cuadre automático de dinero físico vs. transferencias recibidas.
