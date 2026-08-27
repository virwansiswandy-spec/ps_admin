import api from './api';

const DEFAULT_PRINTER_IP = import.meta.env.VITE_PRINTER_IP || '192.168.0.110';
const DEFAULT_PRINTER_PORT = parseInt(import.meta.env.VITE_PRINTER_PORT || '9100', 10);

/**
 * Direct Server Thermal Print (Backend FastAPI -> TCP Socket LAN 192.168.0.110:9100)
 */
export const sendServerPrint = async ({ orderId, printerIp, printerPort, width = 48 }) => {
  const targetIp = printerIp || DEFAULT_PRINTER_IP;
  const targetPort = printerPort || DEFAULT_PRINTER_PORT;

  try {
    const res = await api.post(`/orders/${orderId}/print-thermal`, {
      printer_ip: targetIp,
      printer_port: targetPort,
      width: width
    });

    return {
      success: true,
      data: res.data,
      message: res.data?.message || `Struk berhasil dikirim dari Server Backend ke Printer LAN (${targetIp}:${targetPort})`
    };
  } catch (err) {
    const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Gagal mengirim perintah cetak dari server backend.';
    throw new Error(errorMsg);
  }
};

/**
 * Fetch Full Receipt Data (Text & Base64 QR Code) dari Backend API
 */
export const fetchReceiptData = async (orderId, width = 48) => {
  try {
    const res = await api.get(`/orders/${orderId}/pos-receipt?width=${width}`);
    return res.data || {};
  } catch (err) {
    console.error('Gagal mengambil pratinjau struk dari backend:', err);
    throw err;
  }
};

/**
 * Fetch Text Preview Struk POS dari Backend API
 */
export const fetchReceiptPreview = async (orderId, width = 48) => {
  const data = await fetchReceiptData(orderId, width);
  return data.receipt_text || '';
};

export default {
  sendServerPrint,
  fetchReceiptData,
  fetchReceiptPreview
};
