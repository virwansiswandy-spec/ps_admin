import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Search, Send, Bot, User, CheckCircle2, AlertCircle, RefreshCw,
  Power, UserCheck, Paperclip, FileText, Image as ImageIcon, Clock, Check, CheckCheck,
  ChevronRight, Sparkles, Filter, Shield, PhoneCall, X, MoreVertical, Smile, ArrowLeft
} from 'lucide-react';
import api, { getFileUrl as getImageUrl, getWsUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';

const QUICK_TEMPLATES = [
  "Halo kak, pesanan Anda sudah selesai dicetak dan siap diambil di toko! Terima kasih.",
  "Halo kak, mohon sertakan file cetakan (PDF/PNG/CDR) beserta resolusi/ukuran yang diinginkan ya.",
  "Halo kak, pembayaran telah kami terima. Pesanan sedang diproses oleh tim produksi kami.",
  "Toko Primasakti buka setiap hari pukul 08:00 - 21:00 WIB. Ada yang bisa kami bantu lagi?",
];

const WhatsAppChat = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnread, setFilterUnread] = useState(false);
  
  const [gatewayStatus, setGatewayStatus] = useState({
    loading: true,
    connected: false,
    pushname: '',
    wid: '',
    statusText: 'Mengecek layanan...'
  });

  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [togglingAi, setTogglingAi] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const [syncState, setSyncState] = useState({
    syncing: false,
    progress: 0,
    message: ''
  });

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const wsRef = useRef(null);

  // Fetch WA Gateway connection status from node service
  const fetchGatewayStatus = async () => {
    try {
      setGatewayStatus(prev => ({ ...prev, loading: true }));
      const gatewayUrl = import.meta.env.VITE_WA_GATEWAY_URL || (import.meta.env.DEV ? 'http://localhost:3001' : (typeof window !== 'undefined' ? window.location.origin : ''));
      const res = await fetch(`${gatewayUrl}/status`).then(r => r.json());
      if (res && (res.client_status === 'ready' || res.client_status === 'authenticated')) {
        setGatewayStatus({
          loading: false,
          connected: true,
          pushname: res.client_info?.pushname || 'Primasakti WA',
          wid: res.client_info?.wid || '',
          statusText: 'WhatsApp Terhubung & Siap'
        });
      } else {
        setGatewayStatus({
          loading: false,
          connected: false,
          pushname: '',
          wid: '',
          statusText: res.client_status || 'Tidak terhubung'
        });
      }
    } catch (err) {
      setGatewayStatus({
        loading: false,
        connected: false,
        pushname: '',
        wid: '',
        statusText: 'Gateway Service Offline (Port 3001)'
      });
    }
  };

  // Trigger Smart WA Sync in Background
  const handleTriggerSync = async () => {
    try {
      setSyncState({ syncing: true, progress: 15, message: 'Menghubungkan & menyinkronkan chat...' });
      await api.post('/wa/sync-history', null, { params: { limit: 50 } });
    } catch (err) {
      console.error('Failed to trigger WA sync:', err);
      setSyncState({ syncing: false, progress: 0, message: '' });
      alert(err.response?.data?.detail || 'Gagal memulai sinkronisasi chat WhatsApp.');
    }
  };

  // Fetch List of Conversations
  const fetchConversations = async () => {
    try {
      setLoadingConv(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      const res = await api.get('/wa/conversations', { params });
      if (res.data && Array.isArray(res.data.results)) {
        setConversations(res.data.results);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.error('Error fetching WA conversations:', err);
      setConversations([]);
    } finally {
      setLoadingConv(false);
    }
  };

  // Fetch Messages for Selected Conversation
  const fetchMessages = async (convId) => {
    try {
      setLoadingMsgs(true);
      const res = await api.get(`/wa/conversations/${convId}/messages`);
      if (res.data && res.data.messages) {
        setMessages(res.data.messages);
        setActiveConversation(prev => {
          if (prev && prev.id === convId) {
            return {
              ...prev,
              is_ai_enabled: res.data.is_ai_enabled,
              unread_count: 0
            };
          }
          return prev;
        });

        // Update in conversations list unread count
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c));
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    fetchGatewayStatus();
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConversation?.id) {
      fetchMessages(activeConversation.id);
    }
  }, [activeConversation?.id]);

  // Scroll to bottom of message list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Setup WebSocket connection for Real-Time Incoming Messages
  useEffect(() => {
    const wsUrl = getWsUrl('/api/v1/wa/ws');

    let ws = null;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WA WS] Connected to WhatsApp WebSocket');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.event === 'new_message') {
            const { conversation_id, conversation, message } = data;

            setConversations(prev => {
              const list = Array.isArray(prev) ? prev : [];
              const existingIdx = list.findIndex(c => c.id === conversation_id);
              if (existingIdx >= 0) {
                const updated = [...list];
                updated[existingIdx] = {
                  ...updated[existingIdx],
                  ...conversation,
                  unread_count: (activeConversation?.id === conversation_id)
                    ? 0
                    : (conversation?.unread_count ?? (updated[existingIdx].unread_count + 1))
                };
                const [moved] = updated.splice(existingIdx, 1);
                return [moved, ...updated];
              } else if (conversation) {
                return [conversation, ...list];
              }
              return list;
            });

            if (activeConversation?.id === conversation_id && message) {
              setMessages(prev => {
                const msgList = Array.isArray(prev) ? prev : [];
                if (msgList.some(m => m.id === message.id)) return msgList;
                return [...msgList, message];
              });
            }
          } else if (data.event === 'ai_toggled') {
            if (activeConversation?.id === data.conversation_id) {
              setActiveConversation(prev => ({ ...prev, is_ai_enabled: data.is_ai_enabled }));
            }
            setConversations(prev => (Array.isArray(prev) ? prev : []).map(c => c.id === data.conversation_id ? { ...c, is_ai_enabled: data.is_ai_enabled } : c));
          } else if (data.event === 'conversation_assigned') {
            if (activeConversation?.id === data.conversation_id) {
              setActiveConversation(prev => ({ ...prev, assigned_to: data.assigned_to }));
            }
            setConversations(prev => (Array.isArray(prev) ? prev : []).map(c => c.id === data.conversation_id ? { ...c, assigned_to: data.assigned_to } : c));
          } else if (data.event === 'sync_progress') {
            setSyncState({
              syncing: data.status === 'in_progress',
              progress: data.progress || 0,
              message: data.message || ''
            });

            if (data.status === 'completed') {
              fetchConversations();
              setTimeout(() => {
                setSyncState({ syncing: false, progress: 0, message: '' });
              }, 4000);
            }
          }
        } catch (e) {
          console.error('[WA WS] Parse error:', e);
        }
      };

      ws.onclose = () => {
        console.log('[WA WS] WebSocket disconnected');
      };
    } catch (err) {
      console.error('[WA WS] Connection error:', err);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [activeConversation?.id]);

  // Handle Send Reply (Text or Media)
  const handleSendReply = async (e) => {
    e?.preventDefault();
    if ((!replyText.trim() && !selectedFile) || !activeConversation || sending) return;

    try {
      setSending(true);

      let res;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (replyText.trim()) {
          formData.append('caption', replyText.trim());
        }

        res = await api.post(`/wa/conversations/${activeConversation.id}/reply-media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        res = await api.post(`/wa/conversations/${activeConversation.id}/reply`, {
          message: replyText
        });
      }

      if (res.data && res.data.status === 'success') {
        setReplyText('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        setActiveConversation(prev => ({ ...prev, is_ai_enabled: false }));
        fetchMessages(activeConversation.id);
        fetchConversations();
      }
    } catch (err) {
      alert('Gagal mengirim pesan: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSending(false);
    }
  };

  // Toggle AI Auto-Reply
  const handleToggleAi = async () => {
    if (!activeConversation || togglingAi) return;
    const newStatus = !activeConversation.is_ai_enabled;

    try {
      setTogglingAi(true);
      const res = await api.patch(`/wa/conversations/${activeConversation.id}/toggle-ai`, {
        is_ai_enabled: newStatus
      });

      if (res.data && res.data.status === 'success') {
        setActiveConversation(prev => ({ ...prev, is_ai_enabled: newStatus }));
        setConversations(prev => prev.map(c => c.id === activeConversation.id ? { ...c, is_ai_enabled: newStatus } : c));
      }
    } catch (err) {
      alert('Gagal mengubah status AI: ' + (err.response?.data?.detail || err.message));
    } finally {
      setTogglingAi(false);
    }
  };

  // Claim Conversation
  const handleClaim = async () => {
    if (!activeConversation || claiming) return;

    try {
      setClaiming(true);
      const res = await api.post(`/wa/conversations/${activeConversation.id}/claim`);
      if (res.data && res.data.status === 'success') {
        const assigned = { id: user?.id, full_name: user?.full_name || 'Admin' };
        setActiveConversation(prev => ({ ...prev, assigned_to: assigned }));
        setConversations(prev => prev.map(c => c.id === activeConversation.id ? { ...c, assigned_to: assigned } : c));
      }
    } catch (err) {
      alert('Gagal klaim obrolan: ' + (err.response?.data?.detail || err.message));
    } finally {
      setClaiming(false);
    }
  };

  const safeConversations = Array.isArray(conversations) ? conversations : [];
  const filteredConversations = safeConversations.filter(c => {
    if (!c) return false;
    if (filterUnread && c.unread_count === 0) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (c.sender_name?.toLowerCase() || '').includes(q) || (c.phone_number || '').includes(q);
    }
    return true;
  });

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] min-h-[550px] flex flex-col font-sans select-none overflow-hidden rounded-2xl border border-[#222d34] shadow-2xl bg-[#111b21]">
      
      {/* Top Banner Status WhatsApp Gateway - WhatsApp Header Style */}
      <div className="bg-[#202c33] border-b border-[#222d34] px-4 py-2.5 flex items-center justify-between gap-4 text-[#e9edef]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-[#00a884]/20 border border-[#00a884]/40 flex items-center justify-center text-[#00a884]">
              <MessageSquare className="w-4 h-4 fill-current" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#202c33] ${gatewayStatus.connected ? 'bg-[#00a884]' : 'bg-rose-500'}`} />
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-[#e9edef]">WhatsApp Web Gateway</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                gatewayStatus.connected ? 'bg-[#00a884]/15 text-[#00a884] border border-[#00a884]/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}>
                {gatewayStatus.statusText}
              </span>
            </div>
            {gatewayStatus.connected && (
              <p className="text-[11px] text-[#8696a0] mt-0.5">
                Terhubung: <strong className="text-[#e9edef] font-medium">{gatewayStatus.pushname}</strong> <span className="font-mono">({gatewayStatus.wid ? `+${gatewayStatus.wid}` : ''})</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerSync}
            disabled={syncState.syncing}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#0a332c] hover:bg-[#0f473e] text-[#00a884] rounded-lg text-xs font-semibold transition-colors border border-[#00a884]/30 shadow-sm disabled:opacity-50"
            title="Sinkronkan histori chat WhatsApp terbaru di background tanpa memberatkan server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncState.syncing ? 'animate-spin' : ''}`} />
            <span>{syncState.syncing ? 'Menyinkronkan...' : 'Sync Chat WA'}</span>
          </button>

          <button
            onClick={() => { fetchGatewayStatus(); fetchConversations(); }}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#111b21] hover:bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef] rounded-lg text-xs font-medium transition-colors border border-[#222d34]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${gatewayStatus.loading ? 'animate-spin text-[#00a884]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Sync Progress Bar Banner */}
      {Boolean(syncState.syncing || syncState.message) && (
        <div className="bg-[#0a332c] border-b border-[#00a884]/30 px-4 py-2 flex items-center justify-between text-xs text-[#00a884] animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${syncState.syncing ? 'animate-spin' : ''}`} />
            <span className="font-semibold">{syncState.message}</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span>{syncState.progress}%</span>
            <div className="w-28 bg-[#111b21] h-1.5 rounded-full overflow-hidden border border-[#00a884]/30">
              <div
                className="bg-[#00a884] h-full transition-all duration-300"
                style={{ width: `${syncState.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Container: Sidebar (Left) + Chat Window (Right) */}
      <div className="flex-1 flex min-h-0 bg-[#111b21]">
        
        {/* LEFT PANEL: Conversation Sidebar (WhatsApp Web Sidebar) */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-[#222d34] flex flex-col min-w-0 bg-[#111b21] ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Search & Filter Header */}
          <div className="p-2.5 bg-[#111b21] border-b border-[#222d34] space-y-2">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#8696a0] absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari atau mulai chat baru"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#202c33] border border-transparent rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition-all"
              />
            </div>
            <div className="flex items-center justify-between text-xs px-1">
              <button
                onClick={() => setFilterUnread(!filterUnread)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  filterUnread ? 'bg-[#0a332c] text-[#00a884] border border-[#00a884]/40 font-semibold' : 'text-[#8696a0] hover:bg-[#202c33] hover:text-[#e9edef]'
                }`}
              >
                <Filter className="w-3 h-3" />
                <span>Pesan Belum Dibaca</span>
              </button>
              <span className="text-[#8696a0] font-mono text-[11px]">{filteredConversations.length} chat</span>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#222d34]/40 custom-scrollbar">
            {loadingConv ? (
              <div className="p-8 text-center text-[#8696a0] text-xs">Memuat percakapan...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-[#8696a0] text-xs">Pesan tidak ditemukan</div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = activeConversation?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversation(conv)}
                    className={`px-3 py-3 cursor-pointer transition-all flex items-center gap-3 relative ${
                      isActive
                        ? 'bg-[#2a3942]'
                        : 'hover:bg-[#202c33]'
                    }`}
                  >
                    {/* Contact Avatar Circle */}
                    <div className="w-12 h-12 rounded-full bg-[#202c33] border border-[#222d34] flex items-center justify-center flex-shrink-0 text-[#00a884] font-bold text-base shadow-sm">
                      {conv.sender_name?.charAt(0).toUpperCase() || 'W'}
                    </div>

                    {/* Contact Info & Message Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-[#e9edef] truncate">
                          {conv.sender_name || conv.phone_number}
                        </span>
                        <span className="text-[11px] text-[#8696a0] flex-shrink-0 ml-2">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs text-[#8696a0] truncate leading-relaxed flex-1">
                          {conv.last_message || 'Obrolan baru'}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="bg-[#00a884] text-[#111b21] text-[10px] font-extrabold min-w-4 h-4 px-1 rounded-full flex items-center justify-center flex-shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>

                      {/* Status Tags */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {conv.is_ai_enabled ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#0a332c] text-[#00a884] text-[9px] font-bold rounded border border-[#00a884]/30">
                            <Sparkles className="w-2.5 h-2.5" /> AI AUTO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#202c33] text-[#8696a0] text-[9px] font-medium rounded border border-[#222d34]">
                            <User className="w-2.5 h-2.5" /> STAF
                          </span>
                        )}
                        {conv.assigned_to && (
                          <span className="text-[10px] text-[#8696a0] truncate">
                            • {conv.assigned_to.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: WhatsApp Active Room */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col min-w-0 bg-[#0b141a] relative w-full h-full">
            
            {/* Active Room WhatsApp Header */}
            <div className="h-16 px-3 sm:px-4 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between gap-2 sm:gap-4 flex-shrink-0 z-10">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Back button on mobile view */}
                <button
                  onClick={() => setActiveConversation(null)}
                  className="p-1.5 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-lg md:hidden flex-shrink-0"
                  title="Kembali ke Daftar Chat"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#111b21] border border-[#222d34] flex items-center justify-center text-[#00a884] font-bold text-sm shadow-sm flex-shrink-0">
                  {activeConversation.sender_name?.charAt(0).toUpperCase() || 'W'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#e9edef] text-xs sm:text-sm truncate">
                      {activeConversation.sender_name || activeConversation.phone_number}
                    </h3>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-[#8696a0] truncate mt-0.5">
                    Staf: <span className="text-[#e9edef] font-medium">{activeConversation.assigned_to?.full_name || 'Belum diklaim'}</span>
                  </p>
                </div>
              </div>

              {/* Actions Header Buttons */}
              <div className="flex items-center gap-2">
                {/* AI Toggle Button */}
                <button
                  onClick={handleToggleAi}
                  disabled={togglingAi}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    activeConversation.is_ai_enabled
                      ? 'bg-[#0a332c] text-[#00a884] border-[#00a884]/40 hover:bg-[#00a884]/20'
                      : 'bg-[#202c33] text-[#8696a0] border-[#222d34] hover:bg-[#2a3942] hover:text-[#e9edef]'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${togglingAi ? 'animate-spin' : ''}`} />
                  <span>AI: {activeConversation.is_ai_enabled ? 'ON' : 'OFF'}</span>
                </button>

                {/* Claim Button */}
                {!activeConversation.assigned_to && (
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] text-xs font-bold rounded-lg transition-all shadow-sm"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Klaim Chat</span>
                  </button>
                )}
              </div>
            </div>

            {/* Chat Wallpaper & Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-[#0b141a] relative custom-scrollbar">
              {/* WhatsApp Subtle Wallpaper Doodle Pattern Overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(#00a884_1px,transparent_1px)] [background-size:20px_20px]" />

              {loadingMsgs ? (
                <div className="p-8 text-center text-[#8696a0] text-xs relative z-10">Memuat pesan...</div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-[#8696a0] text-xs relative z-10">Belum ada percakapan.</div>
              ) : (
                messages.map((msg, index) => {
                  const isInbound = msg.direction === 'inbound';
                  const isAi = msg.sender_type === 'ai_bot';

                  return (
                    <div
                      key={msg.id || index}
                      className={`flex flex-col relative z-10 ${isInbound ? 'items-start' : 'items-end'}`}
                    >
                      {/* WhatsApp Speech Bubble */}
                      <div
                        className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-md text-xs leading-relaxed space-y-1 relative ${
                          isInbound
                            ? 'bg-[#202c33] text-[#e9edef] rounded-tl-none border border-[#222d34]/60'
                            : isAi
                            ? 'bg-[#182229] text-[#e9edef] rounded-tr-none border border-[#00a884]/30'
                            : 'bg-[#005c4b] text-[#e9edef] rounded-tr-none border border-[#00a884]/20'
                        }`}
                      >
                        {/* Sender Label Tag */}
                        <div className="flex items-center justify-between gap-2 text-[10px] font-bold border-b border-white/10 pb-1 mb-1 opacity-80">
                          {isInbound ? (
                            <span className="flex items-center gap-1 text-[#00a884]">
                              <User className="w-3 h-3" /> {activeConversation.sender_name || 'Pelanggan'}
                            </span>
                          ) : isAi ? (
                            <span className="flex items-center gap-1 text-purple-300">
                              <Sparkles className="w-3 h-3 text-purple-400" /> AI Assistant Primasakti
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[#53bdeb]">
                              <Shield className="w-3 h-3" /> Staf: {msg.admin_name || 'Admin'}
                            </span>
                          )}
                        </div>

                        {/* Media Attachment */}
                        {msg.media_url && (
                          <div className="my-1.5">
                            {(msg.message_type === 'image' || /\.(jpg|jpeg|png|webp|gif)$/i.test(msg.media_url)) ? (
                              <a href={getImageUrl(msg.media_url)} target="_blank" rel="noreferrer">
                                <img
                                  src={getImageUrl(msg.media_url)}
                                  alt="Lampiran WA"
                                  className="max-w-xs max-h-60 rounded-lg border border-[#222d34] shadow-sm hover:opacity-95 transition-opacity cursor-pointer object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                href={getImageUrl(msg.media_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 p-2 bg.black/20 rounded-lg text-[#00a884] hover:underline border border-[#222d34]"
                              >
                                <FileText className="w-4 h-4" />
                                <span className="truncate">Buka Dokumen Lampiran</span>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Message Body */}
                        <p className="whitespace-pre-wrap break-words text-[13px]">{msg.message_body}</p>

                        {/* Time & Read Receipts */}
                        <div className={`flex items-center gap-1 text-[10px] font-mono text-[#8696a0] ${isInbound ? 'justify-start' : 'justify-end'}`}>
                          <span>{formatTime(msg.created_at)}</span>
                          {!isInbound && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Templates Bar */}
            <div className="px-3 py-2 bg-[#111b21] border-t border-[#222d34] flex items-center gap-2 overflow-x-auto custom-scrollbar flex-shrink-0">
              <span className="text-[11px] font-bold text-[#8696a0] flex-shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#00a884]" /> Template:
              </span>
              {QUICK_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => setReplyText(tmpl)}
                  className="px-2.5 py-1 bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] rounded-md text-[11px] font-medium whitespace-nowrap transition-colors border border-[#222d34]"
                >
                  {tmpl.slice(0, 32)}...
                </button>
              ))}
            </div>

            {/* File Attachment Selected Banner */}
            {selectedFile && (
              <div className="px-4 py-2 bg-[#182229] border-t border-[#00a884]/40 flex items-center justify-between text-xs text-[#e9edef] flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="w-4 h-4 text-[#00a884] flex-shrink-0" />
                  <span className="font-semibold truncate">File Terlampir: {selectedFile.name}</span>
                  <span className="text-[10px] text-[#8696a0]">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button
                  onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="p-1 hover:bg-[#202c33] rounded text-[#8696a0] hover:text-rose-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {/* WhatsApp Footer Input Bar */}
            <form onSubmit={handleSendReply} className="p-3 bg-[#202c33] border-t border-[#222d34] flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Lampirkan Dokumen/Gambar"
                className="p-2 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition-colors flex-shrink-0"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <textarea
                rows={1}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                placeholder="Ketik pesan..."
                className="flex-1 bg-[#2a3942] border border-transparent rounded-lg px-3 py-2 text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] resize-none transition-all"
              />

              <button
                type="submit"
                disabled={sending || (!replyText.trim() && !selectedFile)}
                className="p-2.5 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-40 text-[#111b21] font-bold rounded-full transition-all flex items-center justify-center flex-shrink-0 shadow-md"
              >
                <Send className="w-4 h-4 fill-current ml-0.5" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0b141a] text-[#8696a0]">
            <div className="w-16 h-16 rounded-full bg-[#202c33] border border-[#222d34] flex items-center justify-center text-[#00a884] mb-4 shadow-md">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-[#e9edef] text-base">WhatsApp Web for Admin</h4>
            <p className="text-xs text-[#8696a0] max-w-sm mt-1.5 leading-relaxed">
              Pilih kontak di sebelah kiri untuk membaca dan membalas pesan WhatsApp pelanggan secara real-time.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default WhatsAppChat;
