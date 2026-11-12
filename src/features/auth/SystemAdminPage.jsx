import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Download,
  History,
  Loader2,
  Save,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../common/ToastProvider';
import ConfirmDialog from '../common/ConfirmDialog';

export default function SystemAdminPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const [newUserForm, setNewUserForm] = useState({
    username: '',
    password: '',
    role: 'er_staff',
  });

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, logsList] = await Promise.all([
        api.getUsers(),
        api.getAuditLogs(80),
      ]);
      setUsers(uList || []);
      setAuditLogs(logsList || []);
    } catch (err) {
      showToast('error', err.message || 'ไม่สามารถโหลดข้อมูลระบบได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserForm.username.trim() || newUserForm.password.length < 4) {
      showToast('error', 'กรุณาระบุชื่อผู้ใช้งานและรหัสผ่านอย่างน้อย 4 ตัวอักษร');
      return;
    }
    setCreating(true);
    try {
      await api.createUser({
        username: newUserForm.username.trim(),
        password: newUserForm.password,
        role: newUserForm.role,
      });
      setNewUserForm({ username: '', password: '', role: 'er_staff' });
      showToast('success', 'สร้างบัญชีผู้ใช้งานสำเร็จ');
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (user, nextRole) => {
    try {
      await api.updateUser(user.id, { role: nextRole });
      showToast('success', `อัปเดตสิทธิ์ของ "${user.username}" เป็น ${nextRole}`);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const requestDeleteUser = (user) => {
    setConfirmState({
      open: true,
      title: 'ยืนยันการลบบัญชีผู้ใช้งาน',
      message: `ต้องการลบบัญชี "${user.username}" ออกจากระบบหรือไม่?`,
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        try {
          await api.deleteUser(user.id);
          showToast('success', 'ลบบัญชีผู้ใช้งานเรียบร้อยแล้ว');
          loadData();
        } catch (err) {
          showToast('error', err.message);
        }
      },
    });
  };

  const handleWriteDiskBackup = async () => {
    setBackingUp(true);
    try {
      const res = await api.triggerDatabaseBackup();
      showToast('success', `บันทึกไฟล์สำรองข้อมูลบนเซิร์ฟเวอร์ (${res.filename}) สำเร็จ`);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBackingUp(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      await api.downloadDatabaseBackup();
      showToast('success', 'ดาวน์โหลดไฟล์สำรองฐานข้อมูลสำเร็จ');
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-slate-900 tracking-tight">
            ผู้ใช้งานและสำรองฐานข้อมูล
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            กำหนดสิทธิ์การใช้งานระหว่างเจ้าหน้าที่ห้องฉุกเฉินและผู้ดูแลระบบ พร้อมบันทึกประวัติและสำรองฐานข้อมูล
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleWriteDiskBackup}
            disabled={backingUp}
            className="h-9 flex items-center gap-2 px-3.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save size={15} strokeWidth={1.5} className="text-slate-500" />
            <span>{backingUp ? 'กำลังบันทึก' : 'สำรองข้อมูลลงเซิร์ฟเวอร์'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadBackup}
            className="h-9 flex items-center gap-2 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <Download size={15} strokeWidth={1.5} />
            <span>ดาวน์โหลดไฟล์ Backup</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-slate-500 text-sm">
          <Loader2 size={18} strokeWidth={1.5} className="animate-spin mr-2 text-teal-700" />
          กำลังโหลดข้อมูลระบบ
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs">
              <h2 className="text-sm font-medium text-slate-900 mb-3.5 flex items-center gap-2">
                <UserPlus size={16} strokeWidth={1.5} className="text-teal-700" />
                เพิ่มบัญชีผู้ใช้งานใหม่
              </h2>
              <form onSubmit={handleCreateUser} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    ชื่อผู้ใช้งาน
                  </label>
                  <input
                    type="text"
                    value={newUserForm.username}
                    onChange={(e) =>
                      setNewUserForm({ ...newUserForm, username: e.target.value })
                    }
                    placeholder="เช่น er_nurse01"
                    className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      รหัสผ่าน
                    </label>
                    <input
                      type="password"
                      value={newUserForm.password}
                      onChange={(e) =>
                        setNewUserForm({ ...newUserForm, password: e.target.value })
                      }
                      placeholder="อย่างน้อย 4 ตัวอักษร"
                      className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      ระดับสิทธิ์การใช้งาน
                    </label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) =>
                        setNewUserForm({ ...newUserForm, role: e.target.value })
                      }
                      className="w-full h-10 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 text-sm text-slate-900"
                    >
                      <option value="er_staff">ER Staff เฉพาะอุบัติเหตุหมู่</option>
                      <option value="admin">Admin จัดการได้ทุกส่วน</option>
                    </select>
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={creating}
                    className="h-9 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {creating ? 'กำลังสร้าง' : 'สร้างบัญชีผู้ใช้'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={16} strokeWidth={1.5} className="text-teal-700" />
                  รายชื่อผู้ใช้งานในระบบ
                </h2>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {users.length} บัญชี
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {u.username}
                      </div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums">
                        สร้างเมื่อ{' '}
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString('th-TH')
                          : '-'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={u.role || 'admin'}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                        className="h-8 bg-slate-50 border border-slate-200/80 rounded-md px-2 text-xs font-medium text-slate-700"
                      >
                        <option value="admin">Admin</option>
                        <option value="er_staff">ER Staff</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => requestDeleteUser(u)}
                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="ลบบัญชีผู้ใช้"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h2 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <History size={16} strokeWidth={1.5} className="text-teal-700" />
                  บันทึกประวัติการใช้งานระบบ
                </h2>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  ล่าสุด {auditLogs.length} รายการ
                </span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  ยังไม่มีประวัติการทำรายการ
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-medium text-slate-800">
                            {log.action}
                          </span>
                          <span className="font-medium text-teal-700">
                            โดย {log.username || 'system'}
                          </span>
                        </div>
                        {log.details && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                            {log.details}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono tabular-nums shrink-0">
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString('th-TH')
                          : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
