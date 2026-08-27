import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';

export default function PublicRating() {
  const { invoiceNumber } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [orderInfo, setOrderInfo] = useState(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!invoiceNumber) return;
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/ratings/public/orders/${invoiceNumber}/review-info?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setOrderInfo(res.data);
        if (res.data.already_reviewed) {
          setSubmitted(true);
          if (res.data.existing_review) {
            setRating(res.data.existing_review.rating);
            setComment(res.data.existing_review.review_text || '');
          }
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.detail || 'Nota / pesanan tidak ditemukan.');
      })
      .finally(() => setLoading(false));
  }, [invoiceNumber, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orderInfo) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      await axios.post(`${API_BASE_URL}/ratings/public/orders/${invoiceNumber}/review?token=${encodeURIComponent(token)}`, {
        rating: rating,
        review_text: comment.trim() || null,
      });
      setSubmitted(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Gagal mengirim ulasan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeStars = hoverRating || rating;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
        {/* Store Header */}
        <div className="text-center mb-6 border-b border-slate-800 pb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-xl mb-2">
            PS
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Primasakti Printing</h1>
          <p className="text-xs text-slate-400 mt-0.5">Ulasan & Rating Pelayanan Staf</p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-emerald-400 animate-pulse font-medium">
            Memuat data nota...
          </div>
        ) : errorMsg && !orderInfo ? (
          <div className="py-8 text-center">
            <div className="text-amber-400 text-3xl mb-2">⚠️</div>
            <p className="text-slate-300 font-medium">{errorMsg}</p>
          </div>
        ) : (
          <div>
            {/* Invoice Meta Summary */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 mb-6 text-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">No. Nota</span>
                <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-xs">
                  {orderInfo?.invoice_number}
                </span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400">Customer:</span>
                <span className="font-medium text-slate-200">{orderInfo?.customer_name}</span>
              </div>
              {orderInfo?.items_summary && (
                <div className="flex justify-between items-start mt-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
                  <span>Pesanan:</span>
                  <span className="text-right text-slate-300 max-w-[200px] font-medium truncate">
                    {orderInfo.items_summary}
                  </span>
                </div>
              )}
            </div>

            {submitted ? (
              <div className="py-6 text-center space-y-3">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 text-3xl mb-1">
                  ✓
                </div>
                <h2 className="text-lg font-bold text-white">Terima Kasih Atas Ulasan Anda!</h2>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Ulasan Anda sangat berharga bagi staf & peningkatan pelayanan toko kami.
                </p>

                {/* Display Chosen Rating */}
                <div className="flex justify-center gap-1 text-2xl pt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={star <= rating ? "text-amber-400" : "text-slate-700"}>
                      ★
                    </span>
                  ))}
                </div>
                {comment && (
                  <p className="text-xs italic text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800/60 mt-3 text-left">
                    "{comment}"
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-center text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">
                    Seberapa puas Anda dengan layanan kami?
                  </label>
                  {/* Interactive Star Selector */}
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="text-4xl transition-transform hover:scale-125 focus:outline-none"
                      >
                        <span className={star <= activeStars ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-slate-700"}>
                          ★
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="text-center text-xs font-bold text-amber-400 mt-2">
                    {activeStars === 5 && "⭐ Sangat Puas"}
                    {activeStars === 4 && "👍 Puas"}
                    {activeStars === 3 && "😐 Cukup"}
                    {activeStars === 2 && "👎 Kurang"}
                    {activeStars === 1 && "😡 Kecewa"}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Komentar / Saran Tambahan (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tulis ulasan atau masukan Anda di sini..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Mengirim Ulasan...' : 'Kirim Ulasan'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <p className="text-xs text-slate-600 mt-6">© {new Date().getFullYear()} Primasakti Printing System</p>
    </div>
  );
}
