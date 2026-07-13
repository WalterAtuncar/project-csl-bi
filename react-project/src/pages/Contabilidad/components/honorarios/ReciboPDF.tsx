// Recibo de pago de honorarios médicos — @react-pdf/renderer, generado ON-DEMAND (no hay base64 en BD).
// Se reconstruye determinísticamente desde los datos del pago (POST result o GET /pagos/{id}).
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';

// Datos de la clínica (estáticos — NO se llama al legacy). Ajustables si el usuario lo pide.
const CLINICA = {
  nombre: 'CLÍNICA SAN LORENZO',
  ruc: '20000000000',
  direccion: 'Av. Principal 123 - Lima, Perú',
  telefono: '(01) 000-0000',
  email: 'contacto@clinicasanlorenzo.pe',
};
const LOGO_URL = '/assets/images/logo-csl.png';

export interface ReciboConsultorioRow {
  Nombre: string;
  MontoServicios: number;
  MontoPago: number;
}
export interface ReciboHonorarioData {
  IdPago: number;
  MedicoNombre: string;
  PeriodoDesde: string; // YYYY-MM-DD
  PeriodoHasta: string; // YYYY-MM-DD
  FechaPago: string;    // YYYY-MM-DD
  TotalServicios: number;
  TotalPago: number;
  Glosa?: string | null;
  Estado?: string | null;
  Consultorios: ReciboConsultorioRow[];
}

const money = (n: number) => `S/ ${(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fechaLegible = (iso: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
// N° de documento del recibo: PH-{IdPago}-{YYYYMM} (derivado de la fecha de pago).
const nroDocumento = (data: ReciboHonorarioData): string => {
  const yyyymm = (data.FechaPago || '').slice(0, 7).replace('-', '');
  return `PH-${data.IdPago}-${yyyymm}`;
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: '#0f172a', fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 2, borderBottomColor: '#059669', paddingBottom: 10, marginBottom: 14 },
  logo: { width: 64, height: 64, objectFit: 'contain' },
  clinicaBox: { flex: 1, marginLeft: 12 },
  clinicaNombre: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  clinicaLinea: { fontSize: 8, color: '#475569', marginTop: 1 },
  docBox: { alignItems: 'flex-end' },
  docTitulo: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#059669' },
  docNro: { fontSize: 9, color: '#0f172a', marginTop: 2 },
  docFecha: { fontSize: 8, color: '#475569', marginTop: 1 },
  tituloRecibo: { fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 12, color: '#0f172a' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  infoItem: { width: '50%', marginBottom: 6 },
  infoLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase' },
  infoValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  seccionTitulo: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 6 },
  table: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4 },
  trHead: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  thCons: { flex: 2, padding: 6, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#475569' },
  thNum: { flex: 1, padding: 6, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#475569', textAlign: 'right' },
  tdCons: { flex: 2, padding: 6, fontSize: 9, color: '#0f172a' },
  tdNum: { flex: 1, padding: 6, fontSize: 9, color: '#0f172a', textAlign: 'right' },
  trTotal: { flexDirection: 'row', backgroundColor: '#ecfdf5' },
  tdTotalLabel: { flex: 2, padding: 6, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#065f46' },
  tdTotalNum: { flex: 1, padding: 6, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#065f46', textAlign: 'right' },
  totalPagoBox: { marginTop: 16, alignItems: 'flex-end' },
  totalPagoLabel: { fontSize: 9, color: '#64748b' },
  totalPagoValor: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#059669' },
  glosa: { marginTop: 14, fontSize: 9, color: '#475569' },
  anulado: { marginTop: 10, fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#e11d48', textAlign: 'center' },
  firma: { marginTop: 48, flexDirection: 'row', justifyContent: 'space-around' },
  firmaLinea: { width: 160, borderTopWidth: 1, borderTopColor: '#94a3b8', paddingTop: 4, textAlign: 'center', fontSize: 8, color: '#475569' },
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, textAlign: 'center', fontSize: 7, color: '#94a3b8' },
});

const ReciboHonorarioDoc: React.FC<{ data: ReciboHonorarioData }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image style={styles.logo} src={LOGO_URL} />
        <View style={styles.clinicaBox}>
          <Text style={styles.clinicaNombre}>{CLINICA.nombre}</Text>
          <Text style={styles.clinicaLinea}>RUC: {CLINICA.ruc}</Text>
          <Text style={styles.clinicaLinea}>{CLINICA.direccion}</Text>
          <Text style={styles.clinicaLinea}>{CLINICA.telefono} · {CLINICA.email}</Text>
        </View>
        <View style={styles.docBox}>
          <Text style={styles.docTitulo}>RECIBO DE HONORARIOS</Text>
          <Text style={styles.docNro}>N° {nroDocumento(data)}</Text>
          <Text style={styles.docFecha}>Emisión: {fechaLegible(data.FechaPago)}</Text>
        </View>
      </View>

      <Text style={styles.tituloRecibo}>PAGO DE HONORARIOS MÉDICOS</Text>

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Médico</Text>
          <Text style={styles.infoValue}>{data.MedicoNombre}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Fecha de pago</Text>
          <Text style={styles.infoValue}>{fechaLegible(data.FechaPago)}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Periodo</Text>
          <Text style={styles.infoValue}>{fechaLegible(data.PeriodoDesde)} - {fechaLegible(data.PeriodoHasta)}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Consultorios</Text>
          <Text style={styles.infoValue}>{data.Consultorios.length}</Text>
        </View>
      </View>

      <Text style={styles.seccionTitulo}>Desglose por consultorio</Text>
      <View style={styles.table}>
        <View style={styles.trHead}>
          <Text style={styles.thCons}>Consultorio</Text>
          <Text style={styles.thNum}>Servicios</Text>
          <Text style={styles.thNum}>Pago</Text>
        </View>
        {data.Consultorios.map((c, i) => (
          <View style={styles.tr} key={i}>
            <Text style={styles.tdCons}>{c.Nombre}</Text>
            <Text style={styles.tdNum}>{money(c.MontoServicios)}</Text>
            <Text style={styles.tdNum}>{money(c.MontoPago)}</Text>
          </View>
        ))}
        <View style={styles.trTotal}>
          <Text style={styles.tdTotalLabel}>TOTAL</Text>
          <Text style={styles.tdTotalNum}>{money(data.TotalServicios)}</Text>
          <Text style={styles.tdTotalNum}>{money(data.TotalPago)}</Text>
        </View>
      </View>

      <View style={styles.totalPagoBox}>
        <Text style={styles.totalPagoLabel}>Total a pagar al médico</Text>
        <Text style={styles.totalPagoValor}>{money(data.TotalPago)}</Text>
      </View>

      {data.Glosa ? <Text style={styles.glosa}>Glosa: {data.Glosa}</Text> : null}
      {data.Estado === 'ANULADO' ? <Text style={styles.anulado}>*** PAGO ANULADO ***</Text> : null}

      <View style={styles.firma}>
        <Text style={styles.firmaLinea}>Recibí conforme (médico)</Text>
        <Text style={styles.firmaLinea}>Autorizado por (contabilidad)</Text>
      </View>

      <Text style={styles.footer} fixed>
        Documento generado electrónicamente por el módulo de Contabilidad — Clínica San Lorenzo. N° {nroDocumento(data)}
      </Text>
    </Page>
  </Document>
);

// Genera el PDF on-demand y lo abre en una pestaña nueva (reimprimible sin persistir base64).
export async function abrirReciboHonorarioPDF(data: ReciboHonorarioData): Promise<void> {
  const blob = await pdf(<ReciboHonorarioDoc data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export default ReciboHonorarioDoc;
