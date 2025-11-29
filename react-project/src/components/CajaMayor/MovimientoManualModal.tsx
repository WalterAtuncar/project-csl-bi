// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, MinusCircle, X, Save } from 'lucide-react';
import CajaService from '../../services/CajaService';
import ToastAlerts from '../UI/ToastAlerts';

interface MovimientoManualModalProps {
  isOpen: boolean;
  tipoMovimiento: 'I' | 'E';
  idCajaMayorCierre: number;
  idTipoCaja: number;
  // Rango de fecha del período de cierre (YYYY-MM-DD)
  fechaMin?: string;
  fechaMax?: string;
  origenDefault?: string; // v_Origen
  onClose: () => void;
  onSaved?: () => void; // para refrescar lista/resumen luego de guardar
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const MovimientoManualModal: React.FC<MovimientoManualModalProps> = ({
  isOpen,
  tipoMovimiento,
  idCajaMayorCierre,
  idTipoCaja,
  fechaMin,
  fechaMax,
  origenDefault = 'manual',
  onClose,
  onSaved,
}) => {
  const cajaService = useMemo(() => CajaService.getInstance(), []);

  const [loading, setLoading] = useState(false);
  const [concepto, setConcepto] = useState('');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [total, setTotal] = useState<number>(0);
  const [totalInput, setTotalInput] = useState<string>('0');
  const [usarIGV, setUsarIGV] = useState<boolean>(false);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [igv, setIgv] = useState<number>(0);
  const [observaciones, setObservaciones] = useState<string>('');
  const [numeroDocumento, setNumeroDocumento] = useState<string>('');

  // Resetear formulario cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      setConcepto('');
      // Por defecto: primer día del mes del cierre (fechaMin)
      setFecha((fechaMin && fechaMin.trim()) ? fechaMin : new Date().toISOString().split('T')[0]);
      setTotal(0);
      setTotalInput('0');
      setUsarIGV(false);
      setSubtotal(0);
      setIgv(0);
      setObservaciones('');
      setNumeroDocumento('');
    }
  }, [isOpen, fechaMin]);

  // Recalcular cuando cambia total o usarIGV
  useEffect(() => {
    if (usarIGV) {
      const sub = total / 1.18;
      const igvCalc = total - sub;
      setSubtotal(round2(sub));
      setIgv(round2(igvCalc));
    } else {
      setSubtotal(0);
      setIgv(0);
    }
  }, [total, usarIGV]);

  const formatMoney = (n: number) => {
    try {
      return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch {
      return String(n);
    }
  };

  const parseMoneyInput = (str: string) => {
    const s = (str || '').replace(/\s/g, '');
    const hasComma = s.includes(',');
    const hasDot = s.includes('.');
    let normalized = s;
    if (hasComma && hasDot) {
      const lastComma = s.lastIndexOf(',');
      const lastDot = s.lastIndexOf('.');
      if (lastComma > lastDot) {
        normalized = s.replace(/\./g, '').replace(',', '.');
      } else {
        normalized = s.replace(/,/g, '');
      }
    } else if (hasComma && !hasDot) {
      normalized = s.replace(',', '.');
    }
    normalized = normalized.replace(/[^0-9.]/g, '');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  const handleTotalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseMoneyInput(raw);
    setTotal(num);
    setTotalInput(raw);
  };

  const handleTotalBlur = () => {
    setTotalInput(formatMoney(total));
  };

  const handleTotalFocus = () => {
    setTotalInput(String(total ?? 0));
  };

  const titulo = tipoMovimiento === 'I' ? 'Registrar ingreso' : 'Registrar egreso';
  const HeaderIcon = tipoMovimiento === 'I' ? PlusCircle : MinusCircle;
  const headerBg = tipoMovimiento === 'I' ? 'bg-green-600' : 'bg-red-600';
  const headerHover = tipoMovimiento === 'I' ? 'hover:bg-green-700' : 'hover:bg-red-700';

  const handleSubmit = async () => {
    // Campos requeridos del modal: concepto, total, fecha, observaciones
    if (!concepto?.trim() || !fecha?.trim() || !observaciones?.trim()) {
      ToastAlerts.warning({ title: 'Campos requeridos', message: 'Complete concepto, fecha y observaciones.' });
      return;
    }
    if (total <= 0) {
      ToastAlerts.warning({ title: 'Total inválido', message: 'El total debe ser mayor a 0.' });
      return;
    }
    try {
      setLoading(true);
      const body: any = {
        idTipoCaja,
        tipoMovimiento,
        total: round2(total),
        // Enviar fecha sin zona horaria para evitar desplazamientos
        fechaRegistro: `${fecha}T00:00:00`,
        observaciones,
        // Campos nuevos
        conceptoMovimiento: concepto,
        subtotal: usarIGV ? subtotal : null,
        igv: usarIGV ? igv : null,
        origen: origenDefault,
        // Campos requeridos por backend: rellenar con '---' por defecto
        codigoDocumento: '---',
        serieDocumento: '---',
        numeroDocumento: (numeroDocumento && numeroDocumento.trim()) ? numeroDocumento.trim() : '---',
        idVenta: '---',
      };
      // Llamar al backend para registrar movimiento manual
      const resp = await cajaService.insertMovimientoManual(idCajaMayorCierre, body);
      const saved = resp?.objModel;
      ToastAlerts.success({ title: 'Movimiento registrado', message: 'Se guardó el movimiento correctamente.' });
      // Notificar al padre para refrescar listas/resumen
      onSaved && onSaved();
    } catch (e: any) {
      ToastAlerts.error({ title: 'Error', message: e?.message || 'Fallo al registrar movimiento.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
          >
            {/* Header */}
            <div className={`px-6 py-4 ${headerBg} text-white rounded-t-lg flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <HeaderIcon className="w-5 h-5" />
                <h3 className="text-lg font-semibold text-white">{titulo}</h3>
              </div>
              <button className={`p-2 rounded-md ${headerHover}`} onClick={onClose}>
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-3">
              {/* Concepto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Concepto</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                  placeholder="Descripción del movimiento"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                  value={fecha}
                  min={fechaMin || undefined}
                  max={fechaMax || undefined}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>

              {/* Total */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                  value={totalInput}
                  onChange={handleTotalInputChange}
                  onBlur={handleTotalBlur}
                  onFocus={handleTotalFocus}
                />
              </div>

              {/* IGV opcional */}
              <div className="flex items-center gap-2">
                <input
                  id="usarIGV"
                  type="checkbox"
                  checked={usarIGV}
                  onChange={(e) => setUsarIGV(e.target.checked)}
                />
                <label htmlFor="usarIGV" className="text-sm text-gray-700 dark:text-gray-300">Calcular subtotal e IGV (18%)</label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtotal</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                    value={subtotal}
                    disabled={!usarIGV}
                    onChange={(e) => setSubtotal(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IGV</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                    value={igv}
                    disabled={!usarIGV}
                    onChange={(e) => setIgv(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Observaciones (requerido) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones <span className="text-red-500">*</span></label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="Ingrese observaciones"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </div>

              {/* Número de comprobante de sustento (opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número de comprobante de sustento</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ingrese el número del comprobante"
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <motion.button
                onClick={onClose}
                className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
              >
                <X className="w-4 h-4 mr-2 inline" />Cancelar
              </motion.button>
              <motion.button
                onClick={handleSubmit}
                className={`px-4 py-2 ${headerBg} text-white rounded-lg text-sm font-medium ${headerHover} transition-colors`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                title={tipoMovimiento === 'I' ? 'Guardar ingreso' : 'Guardar egreso'}
              >
                {loading ? (
                  <span className="inline-flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </span>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2 inline" />
                    {tipoMovimiento === 'I' ? 'Grabar ingreso' : 'Grabar egreso'}
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MovimientoManualModal;