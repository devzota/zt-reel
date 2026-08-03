import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../services/api';
import { ztteam_decodeHtmlEntity } from '../utils/stringUtils';

export default function Overview() {
  const [stats, setStats] = useState({
    totalPages: 0,
    totalCrawled: 0,
    totalReelsCreated: 0,
    totalReelsPublished: 0,
    successRate: 100,
    alerts: [] as any[],
    activities: [] as any[],
    health: {
      crawler: { status: 'Hoạt động', details: 'OK' },
      factory: { status: 'Đang xử lý', details: 'OK' },
      publisher: { status: 'Sẵn sàng', details: 'OK' }
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const [chartData, setChartData] = useState([]);

  const ztteam_formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('dashboard/stats');
        if (res.data) setStats(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    
    const fetchChart = async () => {
      try {
        const res = await api.get('dashboard/chart');
        if (res.data && res.data.chartData) setChartData(res.data.chartData);
      } catch (e) {
        console.error(e);
      }
    };

    fetchStats();
    fetchChart();
  }, []);

  return (
    <>
    <div className="w-full">
        {/*  Alerts Section  */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {stats.alerts && stats.alerts.length > 0 ? stats.alerts.map((alert: any, idx: number) => (
              <div key={idx} className={`flex items-center gap-4 p-4 rounded-xl shadow-sm ${alert.type === 'TOKEN_EXPIRED' ? 'bg-red-50' : 'bg-amber-50'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${alert.type === 'TOKEN_EXPIRED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                      <span className="material-symbols-outlined" data-weight="fill" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {alert.type === 'TOKEN_EXPIRED' ? 'warning' : 'error'}
                      </span>
                  </div>
                  <div className="flex-1">
                      <h4 className={`text-sm font-bold ${alert.type === 'TOKEN_EXPIRED' ? 'text-red-700' : 'text-amber-700'}`}>{alert.title}</h4>
                      <p className="text-xs text-gray-500">{alert.message}</p>
                  </div>
              </div>
            )) : (
              <>
                <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <span className="material-symbols-outlined" data-weight="fill" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-emerald-700">Hệ thống ổn định</h4>
                        <p className="text-xs text-gray-500">Tất cả các Cron job đang hoạt động bình thường, không có cảnh báo.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-cyan-50 rounded-xl shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700">
                        <span className="material-symbols-outlined">smart_toy</span>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-cyan-700">AI Reel Factory</h4>
                        <p className="text-xs text-gray-500">Hệ thống đang sẵn sàng tiếp nhận và render tự động các bài viết mới.</p>
                    </div>
                </div>
              </>
            )}
        </div>

        {/*  Stats Grid  */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {/* Facebook Pages */}
            <div className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md ring-1 ring-slate-100 flex flex-col hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-blue-50 rounded-xl text-blue-600 shadow-sm">
                        <span className="material-symbols-outlined" data-icon="pages">pages</span>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold">LIVE</span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Tổng Fanpage</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-800">{isLoading ? '...' : stats.totalPages}</span>
                    <span className="text-xs text-slate-400 font-medium">Đã kết nối</span>
                </div>
            </div>

            {/* Bài Cào */}
            <div className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md ring-1 ring-slate-100 flex flex-col hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-cyan-50 rounded-xl text-cyan-600 shadow-sm">
                        <span className="material-symbols-outlined" data-icon="cloud_download">cloud_download</span>
                    </div>
                    <span className="flex items-center text-xs font-bold text-emerald-600">
                        <span className="material-symbols-outlined text-sm" data-icon="trending_up">trending_up</span>
                    </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Tổng Bài Viết Gốc</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-800">{isLoading ? '...' : stats.totalCrawled}</span>
                    <span className="text-xs text-slate-400 font-medium">Đã tải về</span>
                </div>
            </div>

            {/* Reel */}
            <div className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md ring-1 ring-slate-100 flex flex-col hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-amber-50 rounded-xl text-amber-600 shadow-sm">
                        <span className="material-symbols-outlined" data-icon="movie_filter">movie_filter</span>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        <span className="material-symbols-outlined text-[12px] animate-spin" data-icon="sync">sync</span>
                        Processing
                    </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Video Đã Xử Lý</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-800">{isLoading ? '...' : stats.totalReelsCreated}</span>
                    <span className="text-xs text-slate-400 font-medium">Bởi AI Engine</span>
                </div>
            </div>

            {/* Published */}
            <div className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md ring-1 ring-slate-100 flex flex-col hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-emerald-50 rounded-xl text-emerald-600 shadow-sm">
                        <span className="material-symbols-outlined" data-icon="check_circle" data-weight="fill"
                            style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold">{isLoading ? '...' : stats.successRate}% Success</span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Tự Động Đăng</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-800">{isLoading ? '...' : stats.totalReelsPublished}</span>
                    <span className="text-xs text-slate-400 font-medium">Thành công</span>
                </div>
            </div>
        </div>

        {/*  Main Dashboard Content Grid  */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/*  Pipeline Chart (66%)  */}
            <div className="glass-card p-0 xl:col-span-2 flex flex-col overflow-hidden">
                <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center z-10">
                    <div>
                        <h3 className="text-[15px] sm:text-base font-bold text-slate-800 tracking-tight">Hiệu suất Pipeline Tự động</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Theo dõi dòng chảy dữ liệu từ bài viết đến Fanpage</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md text-[11px] font-bold shadow-sm border border-blue-100/50">7 Ngày qua</button>
                    </div>
                </div>
                {/*  Chart  */}
                <div className="flex-1 p-5 bg-white flex flex-col md:flex-row gap-6">
                    {/* Main Pipeline Synchronized Area Charts */}
                    <div className="flex-1 flex flex-col gap-2">
                        <div className="h-[280px] w-full flex flex-col justify-between">
                            {chartData.length > 0 ? (
                                <>
                                    {/* Crawled Chart */}
                                    <div className="flex-1 relative">
                                        <div className="absolute top-2 right-4 text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full z-10">Tải về</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} syncId="pipelineSync" margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
                                                <defs>
                                                  <linearGradient id="colorCrawled" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05}/>
                                                  </linearGradient>
                                                </defs>
                                                <XAxis dataKey="name" hide={true} />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e0f2fe', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }} cursor={{ stroke: '#93c5fd', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                                <Area type="monotone" dataKey="crawled" name="Tải về (Crawl)" stroke="#0ea5e9" fill="url(#colorCrawled)" strokeWidth={2} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                    
                                    {/* Created Chart */}
                                    <div className="flex-1 relative mt-1">
                                        <div className="absolute top-2 right-4 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full z-10">Tạo nội dung</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} syncId="pipelineSync" margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                                                <defs>
                                                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                                                  </linearGradient>
                                                </defs>
                                                <XAxis dataKey="name" hide={true} />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #fef3c7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }} cursor={{ stroke: '#fcd34d', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                                <Area type="monotone" dataKey="created" name="Tạo nội dung (Render)" stroke="#f59e0b" fill="url(#colorCreated)" strokeWidth={2} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Published Chart */}
                                    <div className="flex-1 relative mt-1">
                                        <div className="absolute top-2 right-4 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full z-10">Đã đăng</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} syncId="pipelineSync" margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                                                <defs>
                                                  <linearGradient id="colorPublished" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                                                  </linearGradient>
                                                </defs>
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }} dy={5} />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #d1fae5', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }} cursor={{ stroke: '#6ee7b7', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                                <Area type="monotone" dataKey="published" name="Đăng Fanpage" stroke="#10b981" fill="url(#colorPublished)" strokeWidth={2} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-sm text-slate-400">Đang tải biểu đồ...</div>
                            )}
                        </div>
                        <div className="flex gap-4 mt-auto pt-3 border-t border-slate-100 justify-center">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-sm"></div>
                                <span className="text-[11px] font-medium text-slate-500">Bài lấy về (Crawl)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm"></div>
                                <span className="text-[11px] font-medium text-slate-500">Tạo nội dung (Render)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></div>
                                <span className="text-[11px] font-medium text-slate-500">Đăng Fanpage (Publish)</span>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Funnel/Pie Chart for total conversion */}
                    <div className="w-full md:w-1/3 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 md:pl-5">
                        <h4 className="text-[12px] font-bold text-slate-600 mb-2 text-center uppercase tracking-wider">Tỉ lệ chuyển đổi 7 ngày</h4>
                        <div className="h-48 w-full">
                            {chartData.length > 0 ? (
                                (() => {
                                    const totalCrawled = chartData.reduce((acc: number, curr: any) => acc + (curr.crawled || 0), 0);
                                    const totalCreated = chartData.reduce((acc: number, curr: any) => acc + (curr.created || 0), 0);
                                    const totalPublished = chartData.reduce((acc: number, curr: any) => acc + (curr.published || 0), 0);
                                    
                                    const pieData = [
                                        { name: 'Đã Đăng', value: totalPublished, color: '#10b981' },
                                        { name: 'Tạo Thành Công', value: Math.max(0, totalCreated - totalPublished), color: '#f59e0b' },
                                        { name: 'Lỗi / Chờ Xử Lý', value: Math.max(0, totalCrawled - totalCreated), color: '#f1f5f9' },
                                    ];

                                    return (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                  data={pieData}
                                                  cx="50%"
                                                  cy="50%"
                                                  innerRadius={45}
                                                  outerRadius={65}
                                                  paddingAngle={3}
                                                  dataKey="value"
                                                  stroke="none"
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    );
                                })()
                            ) : (
                                <div className="flex items-center justify-center h-full text-sm text-slate-400">...</div>
                            )}
                        </div>
                        <div className="mt-2 text-center flex flex-col gap-1 text-[11px] font-medium text-slate-500">
                            <div className="flex items-center justify-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Đã Đăng</div>
                            <div className="flex items-center justify-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Đã Render</div>
                            <div className="flex items-center justify-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-200 border border-slate-300"></div> Chờ / Lỗi</div>
                        </div>
                    </div>
                </div>
            </div>

            {/*  Side Recent Activity (33%)  */}
            <div className="glass-card p-0 xl:col-span-1 flex flex-col h-full overflow-hidden">
                <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center z-10">
                    <h3 className="text-[15px] sm:text-base font-bold text-slate-800 tracking-tight">Hoạt động gần đây</h3>
                </div>
                <div className="flex-1 p-4 bg-white overflow-y-auto custom-scrollbar" style={{ maxHeight: '600px' }}>
                    <div className="space-y-4">
                        {stats.activities && stats.activities.length > 0 ? stats.activities.map((activity: any) => (
                          <div key={activity.id} className="flex gap-3">
                              {/* ICON */}
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                                activity.type === 'CRAWL' ? 'bg-cyan-50 text-cyan-600' : 
                                activity.type === 'CREATE_VIDEO' ? 'bg-amber-50 text-amber-600' :
                                activity.type === 'CREATE_IMAGE' ? 'bg-rose-50 text-rose-600' :
                                'bg-emerald-50 text-emerald-600'
                              }`}>
                                {activity.type === 'CRAWL' ? (
                                    <span className="material-symbols-outlined text-[20px]">language</span>
                                ) : activity.type === 'CREATE_VIDEO' ? (
                                    <span className="material-symbols-outlined text-[20px]">movie_filter</span>
                                ) : activity.type === 'CREATE_IMAGE' ? (
                                    <span className="material-symbols-outlined text-[20px]">image</span>
                                ) : (
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/24000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                )}
                              </div>

                              <div className="flex flex-col justify-center min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 mb-1">
                                      <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${
                                        activity.type === 'CRAWL' ? 'bg-cyan-50 text-cyan-700' : 
                                        activity.type === 'CREATE_VIDEO' ? 'bg-amber-50 text-amber-700' :
                                        activity.type === 'CREATE_IMAGE' ? 'bg-rose-50 text-rose-700' :
                                        'bg-emerald-50 text-emerald-700'
                                      }`}>
                                        {activity.type === 'CRAWL' ? 'Lấy bài về' : 
                                         activity.type === 'CREATE_VIDEO' ? 'Tạo Video' : 
                                         activity.type === 'CREATE_IMAGE' ? 'Tạo Ảnh' : 
                                         'Đăng Page'}
                                      </span>
                                      
                                      {/* CRAWL source */}
                                      {activity.type === 'CRAWL' && (
                                        <span className="text-[10px] text-slate-400 font-medium truncate">
                                          {activity.sourceName ? activity.sourceName.replace(/^https?:\/\//, '').split('/')[0] : ''}
                                        </span>
                                      )}

                                      {/* POST or CREATE targets */}
                                      {activity.type !== 'CRAWL' && (
                                        <div className="flex items-center gap-1 min-w-0">
                                            {activity.pageAvatar ? (
                                                <img src={activity.pageAvatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                                            ) : activity.type === 'POST_FACEBOOK' ? (
                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                                    <span className="text-[7px] font-bold text-slate-500">{activity.pageName?.charAt(0) || 'P'}</span>
                                                </div>
                                            ) : null}
                                            <span className="text-[10px] text-slate-400 font-medium truncate">{activity.pageName}</span>
                                        </div>
                                      )}
                                      <span className="text-[10px] text-slate-400 ml-auto shrink-0">{ztteam_formatDate(activity.date)}</span>
                                  </div>
                                  
                                  <p className="text-[13px] font-bold text-slate-700 line-clamp-1 leading-snug" title={ztteam_decodeHtmlEntity(activity.title) || ''}>
                                    {ztteam_decodeHtmlEntity(activity.title) || 'Không có tiêu đề'}
                                  </p>
                                  
                                  {/* Extra Details row */}
                                  {activity.type === 'CRAWL' && activity.targetSiteName && (
                                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                      Về: {activity.targetSiteName.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                    </p>
                                  )}
                                  
                                  {activity.type === 'POST_FACEBOOK' && activity.postUrl && (
                                    <a href={activity.postUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline truncate mt-0.5 inline-flex items-center gap-0.5">
                                      Xem trên Facebook <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                                    </a>
                                  )}
                              </div>
                          </div>
                        )) : (
                          <div className="py-8 text-center text-slate-400 flex flex-col items-center">
                              <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">history</span>
                              <span className="text-sm font-medium">Chưa có hoạt động nào</span>
                          </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/*  System Health Section  */}
        <div className="mt-8">
            <h3 className="text-[16px] font-bold text-slate-800 mb-5 tracking-tight">Trạng thái hệ thống AI</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-slate-100 flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-300">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm">
                        <span className="material-symbols-outlined" data-icon="database">database</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Crawler Node 01</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></div>
                            <span className="text-[14px] font-black text-slate-800">{stats.health.crawler.status} <span className="text-slate-400 font-medium">({stats.health.crawler.details})</span></span>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-slate-100 flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-300">
                    <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600 shadow-sm">
                        <span className="material-symbols-outlined" data-icon="memory">memory</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">AI Reel Factory</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-sm"></div>
                            <span className="text-[14px] font-black text-slate-800">{stats.health.factory.status} <span className="text-slate-400 font-medium">({stats.health.factory.details})</span></span>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-slate-100 flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-300">
                    <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm">
                        <span className="material-symbols-outlined" data-icon="publish">publish</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Publishing Engine</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></div>
                            <span className="text-[14px] font-black text-slate-800">{stats.health.publisher.status} <span className="text-slate-400 font-medium">({stats.health.publisher.details})</span></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </>
  );
}