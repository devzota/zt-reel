import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useUIStore } from '../stores/uiStore';

export default function UserManagement() {
  const { ztteam_showToast } = useUIStore();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'EDITOR'
  });

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/users');
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (error) {
      ztteam_showToast('Không thể tải danh sách người dùng', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setFormData({ email: user.email, password: '', role: user.role });
    } else {
      setEditingUser(null);
      setFormData({ email: '', password: '', role: 'EDITOR' });
    }
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          role: formData.role,
          ...(formData.password ? { password: formData.password } : {})
        });
        ztteam_showToast('Cập nhật người dùng thành công', 'success');
      } else {
        await api.post('/users', formData);
        ztteam_showToast('Thêm người dùng thành công', 'success');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      ztteam_showToast(error.response?.data?.message || 'Có lỗi xảy ra', 'error');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa người dùng này?')) return;
    try {
      await api.delete(`/users/${id}`);
      ztteam_showToast('Đã xóa người dùng', 'success');
      fetchUsers();
    } catch (error) {
      ztteam_showToast('Không thể xóa người dùng', 'error');
    }
  };

  if (isLoading) return <div className="p-8 font-bold text-gray-500">Đang tải danh sách...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý Người Dùng</h2>
          <p className="text-sm text-gray-500 mt-1">Thêm, sửa, xóa và phân quyền nhân sự</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="px-5 py-2.5 bg-primary text-white font-bold rounded-full hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          Thêm User
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase">Email</th>
              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase">Vai trò</th>
              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase">Ngày tạo</th>
              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-4 px-6 font-bold text-slate-800">{user.email}</td>
                <td className="py-4 px-6">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="py-4 px-6 text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('vi-VN')}
                </td>
                <td className="py-4 px-6 text-right space-x-2">
                  <button 
                    onClick={() => handleOpenModal(user)}
                    className="w-10 h-10 rounded-full inline-flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    title="Chỉnh sửa"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(user.id)}
                    className="w-10 h-10 rounded-full inline-flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    title="Xóa"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">Chưa có người dùng nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {editingUser ? 'Chỉnh sửa Người Dùng' : 'Thêm Người Dùng Mới'}
            </h3>
            
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  disabled={!!editingUser}
                  className="w-full bg-gray-100 border-2 border-transparent focus:border-primary rounded-full px-4 py-2.5 outline-none transition-colors disabled:opacity-50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Mật khẩu {editingUser && '(Bỏ trống nếu không đổi)'}
                </label>
                <input 
                  type="password" 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-gray-100 border-2 border-transparent focus:border-primary rounded-full px-4 py-2.5 outline-none transition-colors"
                  required={!editingUser}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Vai trò</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full bg-gray-100 border-2 border-transparent focus:border-primary rounded-full px-4 py-2.5 outline-none transition-colors"
                >
                  <option value="ADMIN">Admin (Toàn quyền)</option>
                  <option value="MANAGER">Manager (Quản lý)</option>
                  <option value="EDITOR">Editor (Biên tập)</option>
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 font-bold transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-primary text-white hover:bg-blue-600 font-bold transition-colors"
                >
                  {editingUser ? 'Lưu thay đổi' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
