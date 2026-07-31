import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useZTTeamFacebookStore } from '../stores/facebookStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function FanpageReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pages, ztteam_getPageReport, ztteam_getTopPosts, ztteam_checkLoginStatus } = useZTTeamFacebookStore();
  
  const [insights, setInsights] = useState<any[]>([]);
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [daysRange, setDaysRange] = useState<string>('7');

  useEffect(() => {
    if (pages.length === 0) {
      ztteam_checkLoginStatus();
    }
  }, [pages.length]);

  const page = pages.find(p => p.id === id || (p as any).fb_page_id === id);

  useEffect(() => {
    if (id) {
      Promise.all([
        ztteam_getPageReport(id),
        ztteam_getTopPosts(id)
      ]).then(([reportData, postsData]) => {
        setInsights(reportData);
        setTopPosts(postsData);
        setIsLoading(false);
      });
    }
  }, [id]);

  if (!page && !isLoading && pages.length > 0 && insights.length === 0 && topPosts.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-12">
        <p className="text-gray-500 font-bold mb-4">Không tìm thấy thông tin Fanpage.</p>
        <button onClick={() => navigate('/facebook')} className="bg-primary text-white px-6 py-2 rounded-full font-bold">
          Quay lại
        </button>
      </div>
    );
  }

  /** --- Calculate Metrics --- */
  const days = parseInt(daysRange, 10);

  /** Lọc danh sách bài viết theo khoảng thời gian được chọn (7, 14, 28 ngày) */
  const filteredTopPosts = useMemo(() => {
    if (!topPosts || topPosts.length === 0) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const filtered = topPosts.filter(post => new Date(post.created_time) >= cutoff);
    return filtered.length > 0 ? filtered : topPosts;
  }, [topPosts, days]);

  /** 1. Top bài trong kỳ: 15 bài MỚI NHẤT (sắp xếp theo created_time mới nhất -> cũ hơn) */
  const latestPosts = useMemo(() => {
    if (!filteredTopPosts || filteredTopPosts.length === 0) return [];
    return [...filteredTopPosts]
      .sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime())
      .slice(0, 15);
  }, [filteredTopPosts]);

  /** 2. Thư viện nội dung: 15 bài TƯƠNG TÁC CAO NHẤT (sắp xếp theo engagements cao -> thấp) */
  const topEngagedPosts = useMemo(() => {
    if (!filteredTopPosts || filteredTopPosts.length === 0) return [];
    return [...filteredTopPosts]
      .sort((a, b) => (b.engagements || 0) - (a.engagements || 0))
      .slice(0, 15);
  }, [filteredTopPosts]);

  const calculateTrend = (data: any[], metricName: string) => {
    const metric = data.find((m: any) => m.name === metricName);
    if (!metric || !metric.values || metric.values.length < days) {
      return { current: 0, prev: 0, trend: 0, isUp: true };
    }
    
    const values = metric.values;
    const currentPeriod = values.slice(-days);
    const prevPeriod = values.slice(-days * 2, -days);

    const currentSum = currentPeriod.reduce((acc: number, val: any) => acc + (val.value || 0), 0);
    const prevSum = prevPeriod.reduce((acc: number, val: any) => acc + (val.value || 0), 0);
    
    let trend = 0;
    if (prevSum === 0) {
      trend = currentSum > 0 ? 100 : 0;
    } else {
      trend = ((currentSum - prevSum) / prevSum) * 100;
    }

    return {
      current: currentSum,
      prev: prevSum,
      trend: Math.abs(trend),
      isUp: trend >= 0
    };
  };

  let totalImpressions = 0;
  let chartData: any[] = [];
  if (insights && Array.isArray(insights)) {
    const impMetric = insights.find((m: any) => m.name === 'page_media_view');
    const engMetric = insights.find((m: any) => m.name === 'page_post_engagements');
    
    if (impMetric && impMetric.values && impMetric.values.length > 0) {
      const selectedValues = impMetric.values.slice(-days);
      totalImpressions = selectedValues.reduce((sum: number, v: any) => sum + (v.value || 0), 0);
      
      chartData = selectedValues.map((v: any, i: number) => {
        /** Facebook end_time = thời điểm KẾT THÚC chu kỳ, trừ 1 ngày để ra đúng ngày thực */
        const date = new Date(v.end_time);
        date.setDate(date.getDate() - 1);
        const label = `${date.getDate()}/${date.getMonth() + 1}`;
        return {
          name: label,
          impressions: v.value || 0,
          engagements: engMetric?.values?.slice(-days)[i]?.value || 0
        };
      });
    } else if (engMetric && engMetric.values && engMetric.values.length > 0) {
      const selectedValues = engMetric.values.slice(-days);
      chartData = selectedValues.map((v: any, i: number) => {
        const date = new Date(v.end_time);
        date.setDate(date.getDate() - 1);
        const label = `${date.getDate()}/${date.getMonth() + 1}`;
        return {
          name: label,
          impressions: 0,
          engagements: v.value || 0
        };
      });
    }
  }

  if (chartData.length === 0) {
    const today = new Date();
    chartData = Array(days).fill(0).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (days - 1 - i));
      return {
        name: `${d.getDate()}/${d.getMonth() + 1}`,
        impressions: 0,
        engagements: 0
      };
    });
  }

  const reachStats = calculateTrend(insights, 'page_total_media_view_unique');
  const engStats = calculateTrend(insights, 'page_post_engagements');
  const followStats = calculateTrend(insights, 'page_daily_follows');

  return (
    <div className="w-full pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/facebook')}
            className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm hover:shadow-md transition-shadow text-gray-600 shrink-0"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          {page && (
            <div className="flex items-center gap-4">
              {page.avatar ? (
                <img src={page.avatar} alt={page.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">pages</span>
                </div>
              )}
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{page.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium text-sm">Quản lý bởi:</span>
                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">{page.ownerName || 'Admin'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200/60">
          <span className="material-symbols-outlined text-sm text-gray-500">calendar_today</span>
          <select 
            value={daysRange}
            onChange={(e) => setDaysRange(e.target.value)}
            className="bg-transparent text-sm font-bold text-gray-800 focus:outline-none cursor-pointer pr-2"
          >
            <option value="7">7 ngày qua</option>
            <option value="14">14 ngày qua</option>
            <option value="28">28 ngày qua</option>
          </select>
        </div>
      </div>

      {!page || isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Top Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
            <div className="glass-card p-5 rounded-3xl flex flex-col justify-between">
              <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Follower</span>
              <h4 className="text-3xl font-bold text-gray-900">{page.followersCount?.toLocaleString() || 0}</h4>
            </div>

            <div className="glass-card p-5 rounded-3xl flex flex-col justify-between">
              <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Lượt xem ({daysRange} ngày)</span>
              <h4 className="text-3xl font-bold text-gray-900">{totalImpressions.toLocaleString()}</h4>
            </div>

            <div className="glass-card p-5 rounded-3xl flex flex-col justify-between relative overflow-hidden">
              <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Người xem ({daysRange} ngày)</span>
              <div>
                <h4 className="text-3xl font-bold text-gray-900">{reachStats.current.toLocaleString()}</h4>
                <div className={`flex items-center gap-1 mt-1 text-xs font-bold ${reachStats.isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                  <span>{reachStats.isUp ? '▲' : '▼'} {reachStats.trend.toFixed(1)}%</span>
                  <span className="text-gray-400">so với {daysRange} ngày trước</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 rounded-3xl flex flex-col justify-between relative overflow-hidden">
              <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Tương tác ({daysRange} ngày)</span>
              <div>
                <h4 className="text-3xl font-bold text-gray-900">{engStats.current.toLocaleString()}</h4>
                <div className={`flex items-center gap-1 mt-1 text-xs font-bold ${engStats.isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                  <span>{engStats.isUp ? '▲' : '▼'} {engStats.trend.toFixed(1)}%</span>
                  <span className="text-gray-400">so với {daysRange} ngày trước</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 rounded-3xl flex flex-col justify-between bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
              <span className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">Đã đăng / Tạo trong kỳ</span>
              <h4 className="text-3xl font-bold text-blue-900">0 / 0</h4>
              <p className="text-[11px] text-blue-400 font-medium mt-1">Chờ module AutoContent</p>
            </div>
          </div>

          {/* Charts */}
          {chartData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="glass-card p-6 rounded-3xl">
                <h4 className="text-lg font-bold text-gray-900 mb-6">Lượt xem nội dung ({daysRange} ngày)</h4>
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1877F2" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#1877F2" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey="impressions" stroke="#1877F2" strokeWidth={3} fillOpacity={1} fill="url(#colorImp)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="glass-card p-6 rounded-3xl">
                <h4 className="text-lg font-bold text-gray-900 mb-6">Biểu đồ Tương tác ({daysRange} ngày)</h4>
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="engagements" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 0}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 rounded-3xl mb-8 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">insights</span>
              <h4 className="text-xl font-bold text-gray-800 mb-2">Không có dữ liệu Biểu đồ</h4>
              <p className="text-gray-500 max-w-md">
                Facebook API quy định: Fanpage phải có tối thiểu <strong>100 Followers (Lượt theo dõi)</strong> mới được phép xuất dữ liệu Insights (Phân tích). Biểu đồ sẽ tự động xuất hiện khi Page của bạn đạt mốc này.
              </p>
            </div>
          )}

          {/* Section 1: Top bài trong kỳ (15 bài mới nhất) */}
          <div className="glass-card rounded-3xl overflow-hidden mb-8 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">schedule</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Top bài trong kỳ</h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">15 bài viết mới nhất (lọc từ 50 bài gần nhất). Các chỉ số là tổng trọn đời (lifetime).</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{latestPosts.length} bài viết</span>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-[40%]">Nội dung</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Lượt xem</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Người xem</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Hiển thị</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Tổng tương tác</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Chi tiết tương tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {latestPosts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">sentiment_dissatisfied</span>
                        <p className="text-gray-500 font-medium">Chưa có bài viết nào.</p>
                      </td>
                    </tr>
                  ) : (
                    latestPosts.map(post => (
                      <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-4">
                            {post.full_picture ? (
                              <img src={post.full_picture} alt="Post" className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200/60" />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-slate-100 shrink-0 flex items-center justify-center text-gray-400">
                                <span className="material-symbols-outlined text-sm">description</span>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-relaxed">
                                {post.message || <span className="text-gray-400 italic">Không có nội dung chữ</span>}
                              </p>
                              <p className="text-[11px] text-gray-400 font-medium mt-1.5">
                                {new Date(post.created_time).toLocaleString('vi-VN')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top pt-5">
                          <div className="flex items-center gap-1 font-bold text-gray-900 text-sm">
                            <span className="material-symbols-outlined text-[14px] text-blue-600">visibility</span>
                            <span>{(post.views || 0).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top pt-5">
                          <div className="flex items-center gap-1 font-bold text-gray-700 text-sm">
                            <span className="material-symbols-outlined text-[14px] text-indigo-500">group</span>
                            <span>{(post.reach || 0).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top pt-5">
                          <div className="flex items-center gap-1 font-bold text-gray-700 text-sm">
                            <span className="material-symbols-outlined text-[14px] text-slate-500">ads_click</span>
                            <span>{(post.impressions || 0).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top pt-5">
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-sm inline-flex items-center gap-1">
                            <span>{(post.engagements || 0).toLocaleString()}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top pt-4">
                          <div className="flex items-center gap-1 text-xs font-medium">
                            <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px]" title="Cảm xúc">
                              <span className="material-symbols-outlined text-[12px] text-blue-600">thumb_up</span>
                              {post.reactions || 0}
                            </span>
                            <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px]" title="Bình luận">
                              <span className="material-symbols-outlined text-[12px] text-emerald-600">chat_bubble</span>
                              {post.comments || 0}
                            </span>
                            <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px]" title="Chia sẻ">
                              <span className="material-symbols-outlined text-[12px] text-amber-600">share</span>
                              {post.shares || 0}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Thư viện nội dung (15 bài tương tác cao nhất, dạng LIST) */}
          <div className="glass-card rounded-3xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">local_fire_department</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Thư viện nội dung</h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">15 bài viết tương tác cao nhất (lọc từ 50 bài gần nhất). Các chỉ số là tổng trọn đời (lifetime).</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-amber-50 text-amber-600 px-3 py-1 rounded-full">{topEngagedPosts.length} bài viết</span>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-[40%]">Nội dung</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Lượt xem</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Người xem</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Hiển thị</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Tổng tương tác</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Chi tiết tương tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topEngagedPosts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">sentiment_dissatisfied</span>
                        <p className="text-gray-500 font-medium">Chưa có dữ liệu nội dung.</p>
                      </td>
                    </tr>
                  ) : (
                    topEngagedPosts.map(post => (
                      <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-4">
                            {post.full_picture ? (
                              <img src={post.full_picture} alt="Post" className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200/60" />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-slate-100 shrink-0 flex items-center justify-center text-gray-400">
                                <span className="material-symbols-outlined text-sm">description</span>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-relaxed">
                                {post.message || <span className="text-gray-400 italic">Không có nội dung chữ</span>}
                              </p>
                              <p className="text-[11px] text-gray-400 font-medium mt-1.5">
                                {new Date(post.created_time).toLocaleString('vi-VN')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top pt-5">
                          <div className="flex items-center gap-1 font-bold text-gray-900 text-sm">
                            <span className="material-symbols-outlined text-[14px] text-blue-600">visibility</span>
                            <span>{(post.views || 0).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top pt-5">
                          <div className="flex items-center gap-1 font-bold text-gray-700 text-sm">
                            <span className="material-symbols-outlined text-[14px] text-indigo-500">group</span>
                            <span>{(post.reach || 0).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top pt-5">
                          <div className="flex items-center gap-1 font-bold text-gray-700 text-sm">
                            <span className="material-symbols-outlined text-[14px] text-slate-500">ads_click</span>
                            <span>{(post.impressions || 0).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top pt-5">
                          <span className="font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm inline-flex items-center gap-1">
                            <span>{(post.engagements || 0).toLocaleString()}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top pt-4">
                          <div className="flex items-center gap-1 text-xs font-medium">
                            <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px]" title="Cảm xúc">
                              <span className="material-symbols-outlined text-[12px] text-blue-600">thumb_up</span>
                              {post.reactions || 0}
                            </span>
                            <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px]" title="Bình luận">
                              <span className="material-symbols-outlined text-[12px] text-emerald-600">chat_bubble</span>
                              {post.comments || 0}
                            </span>
                            <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px]" title="Chia sẻ">
                              <span className="material-symbols-outlined text-[12px] text-amber-600">share</span>
                              {post.shares || 0}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
