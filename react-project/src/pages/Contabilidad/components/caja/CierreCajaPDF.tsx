// PDF del "Cuadre de caja diario" (/conta/caja) — @react-pdf/renderer, generado ON-DEMAND y abierto
// en pestaña nueva (mismo patrón que ReciboPDF.tsx / abrirReciboHonorarioPDF). Layout inspirado en el
// reporte "Cuadre de Caja" del SAMBHS, con NUESTROS campos (WYSIWYG). 100% front — no toca API/BD.
// El "Origen" de los egresos llega ya traducido (labelOrigen) desde CajaDiaria.tsx: aquí nunca aparece
// la palabra "legacy".
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { CLINICA, LOGO_URL } from '../honorarios/ReciboPDF';
import { unidadCorto } from '../dashboard/dashHelpers';
import { CuadreExportData, resumenPorUnidad } from './excelCuadreCaja';

const money = (n: number) => `S/ ${(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// YYYY-MM-DD -> "dd - mm - yyyy" por SPLIT del string (nunca new Date('YYYY-MM-DD'): shift UTC->Lima).
const fechaGuiones = (iso: string): string => {
  const [y, m, d] = (iso || '').slice(0, 10).split('-');
  if (!y || !m || !d) return iso || '';
  return `${d} - ${m} - ${y}`;
};

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8, color: '#0f172a', fontFamily: 'Helvetica' },
  // Cabecera: 3 zonas (logo · título+clínica · datos derecha), borde inferior verde (patrón ReciboPDF).
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 2, borderBottomColor: '#059669', paddingBottom: 8, marginBottom: 8 },
  logo: { width: 52, height: 52, objectFit: 'contain' },
  headCenter: { flex: 1, marginLeft: 12 },
  docTitulo: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#059669' },
  clinicaNombre: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginTop: 2 },
  clinicaLinea: { fontSize: 7, color: '#475569', marginTop: 1 },
  headRight: { alignItems: 'flex-end' },
  headRightLabel: { fontSize: 7, color: '#64748b', textTransform: 'uppercase' },
  headRightValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 4 },
  filtros: { fontSize: 7.5, color: '#475569', marginBottom: 8 },
  // Banda gris de título de sección.
  banda: { backgroundColor: '#f1f5f9', paddingVertical: 3, paddingHorizontal: 6, marginTop: 8, marginBottom: 3 },
  bandaTexto: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  trHead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingBottom: 2, marginBottom: 1 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 1.5 },
  th: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#475569' },
  td: { fontSize: 7.5, color: '#0f172a' },
  right: { textAlign: 'right' },
  // Fila de total de sección.
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 3, paddingTop: 2 },
  totalLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginRight: 10 },
  totalMonto: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#0f172a', width: 90, textAlign: 'right' },
  // Resumen por forma de pago (estilo pantalla).
  fpRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 1.5 },
  fpLabel: { flex: 1, fontSize: 8 },
  fpTag: { fontFamily: 'Helvetica-Bold', color: '#b91c1c' },
  fpPct: { width: 60, textAlign: 'center', fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#b91c1c' },
  fpMonto: { width: 90, textAlign: 'right', fontSize: 8 },
  // Totales de consolidado.
  sep: { borderBottomWidth: 1, borderBottomColor: '#cbd5e1', marginVertical: 4 },
  consRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1.5 },
  consLabel: { fontSize: 8.5, color: '#475569' },
  consMonto: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  netoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, marginTop: 2, borderTopWidth: 1, borderTopColor: '#cbd5e1' },
  netoLabel: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  netoMonto: { fontSize: 9.5, fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 16, left: 28, right: 28, textAlign: 'center', fontSize: 6.5, color: '#94a3b8' },
});

// Anchos flex de la tabla de INGRESOS: Itm · Documento · Unidad · Forma de pago · Cond. · Cajero · Monto.
// (flex proporcional: se reequilibró al sumar Cajero para que las 7 columnas quepan en A4).
const ingCols = { itm: 0.6, doc: 2.0, uni: 1.4, forma: 1.9, cond: 1.0, cajero: 1.5, monto: 1.5 };
// Anchos flex de la tabla de EGRESOS: Itm · Origen · Documento · Unidad · Concepto · Monto.
const egrCols = { itm: 0.7, origen: 1.6, doc: 2, uni: 1.4, concepto: 2.6, monto: 1.6 };

const CierreCajaDoc: React.FC<{ data: CuadreExportData }> = ({ data }) => {
  const filtroUnidadesTxt = data.filtroUnidades && data.filtroUnidades.length ? data.filtroUnidades.join(', ') : 'TODAS';
  const filtroMediosTxt = data.filtroMedios ?? 'Todos';
  const resumen = resumenPorUnidad(data);
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Cabecera */}
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image style={styles.logo} src={LOGO_URL} />
          <View style={styles.headCenter}>
            <Text style={styles.docTitulo}>CUADRE DE CAJA</Text>
            <Text style={styles.clinicaNombre}>{CLINICA.nombre}</Text>
            <Text style={styles.clinicaLinea}>RUC: {CLINICA.ruc}</Text>
          </View>
          <View style={styles.headRight}>
            <Text style={styles.headRightLabel}>Generado por</Text>
            <Text style={styles.headRightValue}>{data.generadoPor}</Text>
            <Text style={styles.headRightLabel}>Cuadre de la fecha</Text>
            <Text style={styles.headRightValue}>{fechaGuiones(data.fecha)}</Text>
            <Text style={styles.headRightLabel}>Impresión</Text>
            <Text style={styles.headRightValue}>{new Date().toLocaleString('es-PE')}</Text>
          </View>
        </View>

        {/* Línea de filtros (WYSIWYG) */}
        <Text style={styles.filtros}>Tipos de caja: {filtroUnidadesTxt}  ·  Medios de pago: {filtroMediosTxt}</Text>

        {/* INGRESOS */}
        {data.ingresos.length > 0 && (
          <>
            <View style={styles.banda}><Text style={styles.bandaTexto}>INGRESOS</Text></View>
            <View style={styles.trHead}>
              <Text style={[styles.th, { flex: ingCols.itm }]}>Itm</Text>
              <Text style={[styles.th, { flex: ingCols.doc }]}>Documento</Text>
              <Text style={[styles.th, { flex: ingCols.uni }]}>Unidad</Text>
              <Text style={[styles.th, { flex: ingCols.forma }]}>Forma de pago</Text>
              <Text style={[styles.th, { flex: ingCols.cond }]}>Cond.</Text>
              <Text style={[styles.th, { flex: ingCols.cajero }]}>Cajero</Text>
              <Text style={[styles.th, styles.right, { flex: ingCols.monto }]}>Monto</Text>
            </View>
            {data.ingresos.map((r, i) => (
              <View style={styles.tr} key={`i-${i}`} wrap={false}>
                <Text style={[styles.td, { flex: ingCols.itm }]}>{i + 1}</Text>
                <Text style={[styles.td, { flex: ingCols.doc }]}>{r.Documento}</Text>
                <Text style={[styles.td, { flex: ingCols.uni }]}>{unidadCorto(r.Unidad)}</Text>
                <Text style={[styles.td, { flex: ingCols.forma }]}>{r.FormaPago}</Text>
                <Text style={[styles.td, { flex: ingCols.cond }]}>{r.Condicion}</Text>
                <Text style={[styles.td, { flex: ingCols.cajero }]}>{r.Cajero}</Text>
                <Text style={[styles.td, styles.right, { flex: ingCols.monto }]}>{money(r.Monto)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL INGRESOS:</Text>
              <Text style={styles.totalMonto}>{money(data.totalIngresos)}</Text>
            </View>
          </>
        )}

        {/* EGRESOS (se omite si no hay) */}
        {data.egresos.length > 0 && (
          <>
            <View style={styles.banda}><Text style={styles.bandaTexto}>EGRESOS</Text></View>
            <View style={styles.trHead}>
              <Text style={[styles.th, { flex: egrCols.itm }]}>Itm</Text>
              <Text style={[styles.th, { flex: egrCols.origen }]}>Origen</Text>
              <Text style={[styles.th, { flex: egrCols.doc }]}>Documento</Text>
              <Text style={[styles.th, { flex: egrCols.uni }]}>Unidad</Text>
              <Text style={[styles.th, { flex: egrCols.concepto }]}>Concepto</Text>
              <Text style={[styles.th, styles.right, { flex: egrCols.monto }]}>Monto</Text>
            </View>
            {data.egresos.map((r, i) => (
              <View style={styles.tr} key={`e-${i}`} wrap={false}>
                <Text style={[styles.td, { flex: egrCols.itm }]}>{i + 1}</Text>
                <Text style={[styles.td, { flex: egrCols.origen }]}>{r.Origen}</Text>
                <Text style={[styles.td, { flex: egrCols.doc }]}>{r.Documento}</Text>
                <Text style={[styles.td, { flex: egrCols.uni }]}>{unidadCorto(r.Unidad)}</Text>
                <Text style={[styles.td, { flex: egrCols.concepto }]}>{r.Concepto}</Text>
                <Text style={[styles.td, styles.right, { flex: egrCols.monto }]}>{money(r.Monto)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL EGRESOS:</Text>
              <Text style={styles.totalMonto}>{money(data.totalEgresos)}</Text>
            </View>
          </>
        )}

        {/* RESUMEN POR FORMA DE PAGO */}
        <View style={styles.banda}><Text style={styles.bandaTexto}>RESUMEN POR FORMA DE PAGO</Text></View>
        {data.totalesPorFormaPago.map(([fp, monto], i) => {
          const pct = data.totalIngresos > 0 ? (monto / data.totalIngresos) * 100 : 0;
          return (
            <View style={styles.fpRow} key={`fp-${i}`} wrap={false}>
              <Text style={styles.fpLabel}><Text style={styles.fpTag}>*****TOTAL***** </Text>{fp}</Text>
              <Text style={styles.fpPct}>{pct.toFixed(1)}%</Text>
              <Text style={styles.fpMonto}>{money(monto)}</Text>
            </View>
          );
        })}
        <View style={styles.sep} />
        <View style={styles.consRow}>
          <Text style={styles.consLabel}>Total ingresos</Text>
          <Text style={[styles.consMonto, { color: '#0284c7' }]}>{money(data.totalIngresos)}</Text>
        </View>
        <View style={styles.consRow}>
          <Text style={styles.consLabel}>Total egresos</Text>
          <Text style={[styles.consMonto, { color: '#e11d48' }]}>−{money(data.totalEgresos)}</Text>
        </View>
        <View style={styles.netoRow} wrap={false}>
          <Text style={styles.netoLabel}>NETO DEL DÍA</Text>
          <Text style={[styles.netoMonto, { color: data.neto >= 0 ? '#059669' : '#e11d48' }]}>{money(data.neto)}</Text>
        </View>

        {/* RESUMEN DE CAJA POR UNIDAD */}
        <View style={styles.banda}><Text style={styles.bandaTexto}>RESUMEN DE CAJA POR UNIDAD</Text></View>
        <View style={styles.trHead}>
          <Text style={[styles.th, { flex: 2 }]}>Unidad</Text>
          <Text style={[styles.th, styles.right, { flex: 1.4 }]}>Ingresos</Text>
          <Text style={[styles.th, styles.right, { flex: 1.4 }]}>Egresos</Text>
          <Text style={[styles.th, styles.right, { flex: 1.4 }]}>Neto</Text>
        </View>
        {resumen.map((u, i) => (
          <View style={styles.tr} key={`u-${i}`} wrap={false}>
            <Text style={[styles.td, { flex: 2 }]}>{u.unidad}</Text>
            <Text style={[styles.td, styles.right, { flex: 1.4 }]}>{money(u.ingresos)}</Text>
            <Text style={[styles.td, styles.right, { flex: 1.4 }]}>{money(u.egresos)}</Text>
            <Text style={[styles.td, styles.right, { flex: 1.4, color: u.neto >= 0 ? '#059669' : '#e11d48' }]}>{money(u.neto)}</Text>
          </View>
        ))}

        <Text style={styles.footer} fixed>
          Documento generado por el módulo de Contabilidad — Clínica San Lorenzo · Cuadre del {fechaGuiones(data.fecha)}
        </Text>
      </Page>
    </Document>
  );
};

// Genera el PDF on-demand y lo abre en una pestaña nueva (mismo patrón que abrirReciboHonorarioPDF).
export async function abrirCierreCajaPDF(data: CuadreExportData): Promise<void> {
  const blob = await pdf(<CierreCajaDoc data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export default CierreCajaDoc;
