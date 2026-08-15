import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZTTeamFacebookStore } from '../stores/facebookStore';
import { useUIStore } from '../stores/uiStore';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { ztteam_decodeHtmlEntity } from '../utils/stringUtils';

function FanpageRow({ page, isExpired, testingPageId, handleTestPost }: any) {
  const navigate = useNavigate();
  const { ztteam_getPageReport, ztteam_deletePage } = useZTTeamFacebookStore();
  const { ztteam_showToast, ztteam_showConfirm } = useUIStore();
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    if (!isExpired) {
      ztteam_getPageReport(page.id).then(data => setInsights(data));
    }
  }, [page.id, isExpired]);

  const initials = page.ownerName ? page.ownerName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'FB';
  
  /** Parse insights */
  let newFollowers = 0;
  let totalViews28d = 0;
  let totalReach28d = 0;
  let totalEngagements28d = 0;
  let chartData: any[] = [];
  
  if (insights && Array.isArray(insights)) {
    /** Lượt theo dõi mới từ page_daily_follows */
    const followMetric = insights.find((m: any) => m.name === 'page_daily_follows');
    if (followMetric && followMetric.values) {
      const last7 = followMetric.values.slice(-7);
      newFollowers = last7.reduce((s: number, v: any) => s + (v.value || 0), 0);
    }
    
    /** Tổng Lượt xem 28 ngày và biểu đồ */
    const viewMetric = insights.find((m: any) => m.name === 'page_media_view');
    if (viewMetric && viewMetric.values) {
      totalViews28d = viewMetric.values.reduce((s: number, v: any) => s + (v.value || 0), 0);
      chartData = viewMetric.values.map((v: any, i: number) => ({
        name: `Ngày ${i + 1}`,
        value: v.value
      }));
    }

    /** Tổng Tiếp cận 28 ngày */
    const reachMetric = insights.find((m: any) => m.name === 'page_total_media_view_unique');
    if (reachMetric && reachMetric.values) {
      totalReach28d = reachMetric.values.reduce((s: number, v: any) => s + (v.value || 0), 0);
    }

    /** Tổng Tương tác 28 ngày */
    const engMetric = insights.find((m: any) => m.name === 'page_post_engagements');
    if (engMetric && engMetric.values) {
      totalEngagements28d = engMetric.values.reduce((s: number, v: any) => s + (v.value || 0), 0);
    }
  }

  /** Nếu không có dữ liệu biểu đồ, tạo mảng 28 ngày = 0 */
  if (chartData.length === 0) {
    chartData = Array(28).fill(0).map((_, i) => ({ name: `Ngày ${i + 1}`, value: 0 }));
  }

  const ztteam_formatDate = (dateStr: string | null | undefined, allowPast = false) => {
    if (!dateStr) return 'Đang chờ...';
    const d = new Date(dateStr);
    if (!allowPast && d.getTime() < Date.now()) return 'Đang chờ...';
    return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  };

  const handleDeletePage = async () => {
    const confirm = await ztteam_showConfirm(
      'Xóa Fanpage',
      `Bạn có chắc muốn xóa Fanpage "${page.name}"? Tất cả Reels, Ảnh, Lịch sử, và Cấu hình sẽ bị xóa vĩnh viễn và không thể khôi phục.`
    );
    if (confirm) {
      try {
        await ztteam_deletePage(page.id);
        ztteam_showToast(`Đã xóa Fanpage ${page.name} thành công`, 'success');
      } catch (error: any) {
        ztteam_showToast(error.message, 'error');
      }
    }
  };

  return (
    <React.Fragment>
      <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {page.avatar ? (
            <img src={page.avatar} alt={page.name} className="w-11 h-11 rounded-2xl object-cover bg-slate-100 border border-slate-200/60 shadow-sm" />
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined">pages</span>
            </div>
          )}
          <div>
            <p className="font-bold text-gray-900">{page.name}</p>
            <div className="flex flex-col gap-1 mt-0.5">
              <span className="text-[12px] text-gray-500">ID: {page.id}</span>
              
              {/* Mini Status Indicators under Page Name */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {page.autoPublishEnabled !== false ? (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200/60 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    ĐĂNG: BẬT
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200/60 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    ĐĂNG: TẮT
                  </span>
                )}

                {page.autoCreateEnabled ? (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200/60 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    TẠO: BẬT
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200/60 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    TẠO: TẮT
                  </span>
                )}

                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200/60 rounded-full text-[10px] font-extrabold">
                  🎨 {page.defaultReelTemplateName || 'Template Mặc định'}
                </span>

                {page.tags && page.tags.length > 0 && page.tags.map((t: string) => (
                  <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-700 font-bold">
            {initials}
          </div>
          <span className="text-sm font-medium text-gray-700">{page.ownerName || 'Admin'}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-700">{page.followersCount?.toLocaleString() || 0}</span>
          <span className="text-[11px] font-bold text-emerald-600">+{newFollowers} mới</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1 w-32 shrink-0">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500">Lượt xem:</span>
              <span className="font-bold text-gray-900">{totalViews28d.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500">Tiếp cận:</span>
              <span className="font-bold text-gray-900">{totalReach28d.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500">Tương tác:</span>
              <span className="font-bold text-emerald-600">{totalEngagements28d.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="w-24 h-10 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', padding: '6px 10px' }}
                  labelStyle={{ color: '#64748b', fontWeight: '600', marginBottom: '4px' }}
                  itemStyle={{ color: '#1877F2', fontWeight: 'bold', padding: 0 }}
                  formatter={(value: any) => [`${value} lượt xem`, '']}
                />
                <Line type="monotone" dataKey="value" stroke="#1877F2" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        {isExpired ? (
          <div className="flex items-center gap-2 text-red-600 font-bold text-sm bg-red-50 px-3 py-1 rounded-full border border-red-200/60 w-fit">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>Expired</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60 w-fit">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Connected</span>
          </div>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <button 
            onClick={() => handleTestPost(page.id)}
            disabled={testingPageId === page.id || isExpired}
            className="w-10 h-10 flex items-center justify-center text-primary hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50" 
            title="Test đăng bài"
          >
            <span className={`material-symbols-outlined text-[20px] ${testingPageId === page.id ? 'animate-spin' : ''}`}>
              {testingPageId === page.id ? 'sync' : 'send'}
            </span>
          </button>
          <button 
            onClick={() => navigate(`/facebook/pages/${page.id}/settings`)}
            className="w-10 h-10 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors" 
            title="Cấu hình Fanpage"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
          <button 
            onClick={() => navigate(`/facebook/pages/${page.id}/report`)}
            className="w-10 h-10 flex items-center justify-center text-amber-600 hover:bg-amber-50 rounded-full transition-colors" 
            title="Thống kê"
          >
            <span className="material-symbols-outlined text-[20px]">query_stats</span>
          </button>
          <a 
            href={`https://facebook.com/${page.fb_page_id || page.id}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-10 h-10 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-full transition-colors" 
            title="Xem page"
          >
            <span className="material-symbols-outlined text-[20px]">open_in_new</span>
          </a>
          <button 
            onClick={handleDeletePage}
            className="w-10 h-10 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-full transition-colors ml-1" 
            title="Xóa Fanpage"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        </div>
      </td>
    </tr>
    <tr>
        <td colSpan={6} className="px-6 pb-6 pt-2 border-b border-slate-100">
          <div className="bg-slate-50/60 border border-slate-200/60 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 shadow-sm">
            {/* Column 1: Auto Publish Configuration */}
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-2">Cấu hình Đăng Bài</p>
              <div className="flex flex-col gap-1.5">
                {page.autoPublishEnabled !== false ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/60 w-fit">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>🟢 Đang BẬT tự động đăng</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200/60 w-fit">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span>🔴 Đã TẮT tự động đăng</span>
                  </div>
                )}

                {page.autoPublishEnabled !== false && page.scheduleMode === 'immediate' && (
                  <span className="text-xs font-medium text-slate-600">Giãn cách: <b>{page.scheduleImmediateGapMinutes} phút/bài</b></span>
                )}
                {page.autoPublishEnabled !== false && page.scheduleMode === 'fixed' && page.scheduleFixedTimes && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {page.scheduleFixedTimes.map((t: string) => (
                      <span key={t} className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200/60 text-[10px] font-extrabold rounded-md">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Auto Create Configuration & Template */}
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-2">Cấu hình Tạo Video</p>
              <div className="flex flex-col gap-1.5">
                {page.autoCreateEnabled ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/60 w-fit">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>🟢 Đang BẬT tự động tạo</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200/60 w-fit">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span>🔴 Đã TẮT tự động tạo</span>
                  </div>
                )}

                {page.autoCreateEnabled && (
                  <span className="text-xs font-medium text-slate-600">Chu kỳ quét: <b>{page.autoScanIntervalHours} tiếng/lần</b></span>
                )}

                {/* PROMINENT REEL TEMPLATE BADGE */}
                <div className="mt-1 pt-1.5 border-t border-slate-200/60">
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200/60 inline-flex items-center gap-1 shadow-sm">
                    🎨 Giao diện: <b>{page.defaultReelTemplateName || 'Mặc định'}</b>
                  </span>
                </div>
              </div>
            </div>

            {/* Column 3: Next Scheduled Post */}
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-2">Bài Chuẩn Bị Đăng</p>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug" title={ztteam_decodeHtmlEntity(page.nextVideoTitle) || ''}>
                  {page.nextVideoTitle ? ztteam_decodeHtmlEntity(page.nextVideoTitle) : 'Chưa có bài chờ trong hàng đợi'}
                </span>
                {page.autoPublishEnabled !== false ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    {ztteam_formatDate(page.nextPublishTime)}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200/60 w-fit flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">block</span>
                    Đã tắt tự động đăng
                  </span>
                )}
              </div>
            </div>

            {/* Column 4: Next Render Scan Time */}
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-2">Lịch Tạo Video Tiếp Theo</p>
              <div className="flex flex-col gap-1.5">
                {page.autoCreateEnabled ? (
                  <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">update</span>
                    {ztteam_formatDate(page.nextRenderTime)}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200/60 w-fit flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">block</span>
                    Đã tắt tự động tạo
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>
      </tr>
    </React.Fragment>
  );
}

export default function FacebookPages() {
  const {
    isConnected,
    pages,
    isLoading,
    error,
    ztteam_checkLoginStatus,
    ztteam_loginWithFacebook,
    ztteam_fetchPages,
    ztteam_testPost
  } = useZTTeamFacebookStore();
  const { ztteam_showToast } = useUIStore();
  const navigate = useNavigate();

  const [testingPageId, setTestingPageId] = useState<string | null>(null);
  
  /** Lọc dữ liệu */
  const [filterOwner, setFilterOwner] = useState('');
  const [filterTag, setFilterTag] = useState('');
  
  const uniqueOwners = Array.from(new Set(pages.map(p => p.ownerName).filter(Boolean)));
  const uniqueTags = Array.from(new Set(pages.flatMap(p => p.tags || [])));

  const filteredPages = pages.filter(p => {
    let match = true;
    if (filterOwner && p.ownerName !== filterOwner) match = false;
    if (filterTag && (!p.tags || !p.tags.includes(filterTag))) match = false;
    return match;
  });

  useEffect(() => {
    const handleSDKLoad = () => {
      ztteam_checkLoginStatus();
    };

    if (window.FB) {
      ztteam_checkLoginStatus();
    } else {
      window.addEventListener('fbSDKLoaded', handleSDKLoad);
      return () => window.removeEventListener('fbSDKLoaded', handleSDKLoad);
    }
  }, []);

  const handleTestPost = async (pageId: string) => {
    if (testingPageId) return;
    setTestingPageId(pageId);
    try {
      await ztteam_testPost(pageId, "Bài đăng thử nghiệm hệ thống AutoContent AI");
      ztteam_showToast("Đăng bài thành công!", 'success');
    } catch (error: any) {
      ztteam_showToast(error.message || "Lỗi khi đăng bài", 'error');
    } finally {
      setTestingPageId(null);
    }
  };

  const expiredPagesCount = pages.filter(p => p.status === 'expired').length;
  const totalFollowers = pages.reduce((acc, p) => acc + (p.followersCount || 0), 0);
  const formattedFollowers = totalFollowers > 1000000 ? (totalFollowers / 1000000).toFixed(1) + 'M' : 
                             totalFollowers > 1000 ? (totalFollowers / 1000).toFixed(1) + 'k' : totalFollowers;

  return (
    <div className="w-full">
      {/* Header Section with CTA */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">Quản lý Fanpage</h3>
          <p className="text-gray-500 font-medium max-w-2xl">Theo dõi trạng thái kết nối, sức khỏe tài khoản và cấu hình tự động hóa cho các trang Facebook của bạn.</p>
        </div>
        
        {/* Highlighted CTA */}
        <button
          onClick={ztteam_loginWithFacebook}
          disabled={isLoading}
          className="bg-[#1877F2] hover:bg-[#166fe5] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <span className="material-symbols-outlined animate-spin text-[24px]">sync</span>
          ) : (
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_2</span>
          )}
          {isConnected ? 'Kết nối thêm' : 'Kết nối Facebook'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined text-red-600" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          <p className="text-red-600 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="glass-card p-5 rounded-2xl flex flex-col">
          <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">Tổng Fanpage</span>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-gray-900">{pages.length}</span>
            <span className="text-blue-600 font-bold text-sm bg-blue-50 px-2 py-1 rounded">All pages</span>
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl flex flex-col">
          <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">Token Hết hạn</span>
          <div className="flex items-end justify-between">
            <span className={`text-3xl font-bold ${expiredPagesCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{expiredPagesCount}</span>
            {expiredPagesCount > 0 && (
              <span className="text-red-600 font-bold text-sm bg-red-50 px-2 py-1 rounded">Cần xử lý</span>
            )}
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl flex flex-col">
          <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">Tổng Follower</span>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-gray-900">{formattedFollowers}</span>
            <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-1 rounded">Reach</span>
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl flex flex-col">
          <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">Reels Đã đăng (24h)</span>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-gray-900">0</span>
            <span className="text-gray-500 font-bold text-sm bg-gray-100 px-2 py-1 rounded">Sắp tới</span>
          </div>
        </div>
      </div>

      {/* Main Listing Section */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-sm">
        {/* Filters & Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <select className="appearance-none bg-slate-50 border-2 border-transparent focus:border-primary rounded-full pl-4 pr-10 py-2 text-sm font-medium focus:ring-0 outline-none">
                <option>Tất cả trạng thái</option>
                <option>Connected</option>
                <option>Expired</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
            </div>
            {uniqueOwners.length > 0 && (
              <div className="relative">
                <select 
                  value={filterOwner}
                  onChange={(e) => setFilterOwner(e.target.value)}
                  className="appearance-none bg-slate-50 border-2 border-transparent focus:border-primary rounded-full pl-4 pr-10 py-2 text-sm font-medium focus:ring-0 outline-none"
                >
                  <option value="">Tất cả Nick</option>
                  {uniqueOwners.map((owner: any) => (
                    <option key={owner} value={owner}>{owner}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
              </div>
            )}
            {uniqueTags.length > 0 && (
              <div className="relative">
                <select 
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="appearance-none bg-slate-50 border-2 border-transparent focus:border-primary rounded-full pl-4 pr-10 py-2 text-sm font-medium focus:ring-0 outline-none"
                >
                  <option value="">Tất cả Thẻ</option>
                  {uniqueTags.map((tag: any) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={ztteam_fetchPages} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50">
              <span className={`material-symbols-outlined text-sm ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
              Làm mới
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fanpage</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nick sở hữu</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Followers</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Hiệu suất (28 ngày)</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái Token</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">inbox</span>
                    <p className="text-gray-900 font-bold">Không tìm thấy Fanpage nào</p>
                    <p className="text-sm text-gray-500 mt-1">Thử thay đổi bộ lọc hoặc kết nối thêm Fanpage.</p>
                  </td>
                </tr>
              ) : (
                filteredPages.map(page => {
                  const isExpired = page.status === 'expired';
                  
                  return (
                    <FanpageRow 
                      key={page.id} 
                      page={page} 
                      isExpired={isExpired} 
                      testingPageId={testingPageId} 
                      handleTestPost={handleTestPost} 
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination placeholder */}
        {filteredPages.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">Hiển thị {filteredPages.length} / {pages.length} Fanpage</p>
          </div>
        )}
      </div>

      {/* Health Alerts Section */}
      {(expiredPagesCount > 0) && (
        <div className="mt-8 grid grid-cols-1 gap-5">
          <div className="p-6 bg-red-50 rounded-2xl border border-red-100 flex gap-4 items-start">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <span className="material-symbols-outlined text-2xl">report</span>
            </div>
            <div>
              <h4 className="font-bold text-gray-900">Cảnh báo Token hết hạn</h4>
              <p className="text-sm text-gray-600 mt-1">{expiredPagesCount} Fanpage của bạn cần được kết nối lại để tiếp tục quy trình tự động hóa Reels.</p>
              <button onClick={ztteam_loginWithFacebook} className="mt-4 text-red-600 font-bold text-sm flex items-center gap-1 hover:underline">
                Gia hạn tất cả ngay
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
