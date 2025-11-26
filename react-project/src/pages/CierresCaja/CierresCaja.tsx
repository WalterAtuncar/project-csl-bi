import React from 'react';
import { CierreCajaGrid } from '../../components/CierresCaja';
import './CierresCaja.css';

/**
 * Página principal para gestión de cierres de caja
 */
const CierresCaja: React.FC = () => {
  return (
    <div className="cierres-caja-page">
      <CierreCajaGrid />
    </div>
  );
};

export default CierresCaja;
