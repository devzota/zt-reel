import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZTTeamFacebookStore } from '../stores/facebookStore';
import { useUIStore } from '../stores/uiStore';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { ztteam_decodeHtmlEntity } from '../utils/stringUtils';

function FanpageRow({ page, isExpired, testingPageId, handleTestPost }: any) {
  const navigate = useNavigate();
  const { ztteam_getPageReport } = useZTTeamFacebookStore();
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

  return (
    <React.Fragment>
      <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {page.avatar ? (
            <img src={page.avatar} alt={page.name} className="w-10 h-10 rounded-xl object-cover bg-slate-100" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined">pages</span>
            </div>
          )}
          <div>
            <p className="font-bold text-gray-900">{page.name}</p>
            <div className="flex flex-col gap-1 mt-0.5">
              <span className="text-[12px] text-gray-500">ID: {page.id}</span>
              {page.tags && page.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {page.tags.map((t: string) => (
                    <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                      {t}
                    </span>
                  ))}
                </div>
              )}
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
          <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>Expired</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
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
        </div>
      </td>
    </tr>
    <tr>
        <td colSpan={6} className="px-6 pb-6 pt-2 border-b border-slate-100">
          <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Cấu hình Đăng bài</p>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-gray-700">
                  {page.scheduleMode === 'immediate' ? 'Đăng ngay có giãn cách' : 'Khung giờ cố định'}
                </span>
                {page.scheduleMode === 'immediate' && (
                  <span className="text-xs text-gray-500">Giãn cách: {page.scheduleImmediateGapMinutes} phút</span>
                )}
                {page.scheduleMode === 'fixed' && page.scheduleFixedTimes && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {page.scheduleFixedTimes.map((t: string) => (
                      <span key={t} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Cấu hình Tạo Video</p>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-gray-700">
                  {page.autoCreateEnabled ? 'Đang bật tự động tạo' : 'Đang tắt'}
                </span>
                {page.autoCreateEnabled && (
                  <span className="text-xs text-gray-500">Chu kỳ: {page.autoScanIntervalHours} tiếng/lần</span>
                )}
                {page.defaultReelTemplateId && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded w-max mt-0.5 font-medium truncate max-w-[150px]" title={page.defaultReelTemplateName || page.defaultReelTemplateId}>
                    Mẫu: {page.defaultReelTemplateName || page.defaultReelTemplateId}
                  </span>
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Bài chuẩn bị đăng</p>
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-gray-900 leading-snug" title={ztteam_decodeHtmlEntity(page.nextVideoTitle) || ''}>
                  {page.nextVideoTitle ? ztteam_decodeHtmlEntity(page.nextVideoTitle) : 'Không có bài chờ'}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                  {ztteam_formatDate(page.nextPublishTime)}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">Lần lấy bài tiếp theo</p>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-gray-900 truncate">
                  {page.autoCreateEnabled ? ztteam_formatDate(page.nextRenderTime) : 'N/A'}
                </span>
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
              {pages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">inbox</span>
                    <p className="text-gray-900 font-bold">Chưa có Fanpage nào được kết nối</p>
                    <p className="text-sm text-gray-500 mt-1">Vui lòng cấp quyền quản lý trang cho hệ thống.</p>
                  </td>
                </tr>
              ) : (
                pages.map(page => {
                  const isExpired = page.status === 'expired';
                  const initials = page.ownerName ? page.ownerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'FB';
                  
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
        {pages.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">Hiển thị {pages.length} Fanpage</p>
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
