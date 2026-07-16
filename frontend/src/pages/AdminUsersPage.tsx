import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi } from '../api/admin.api';
import { AdminUserEditModal } from '../components/AdminUserEditModal';
import { RoleBadge } from '../components/Badge';
import { CreateClientModal } from '../components/CreateClientModal';
import { Button } from '../components/ui/Button';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../lib/format';

const USERS_KEY = ['admin', 'users'] as const;

export function AdminUsersPage() {
  const { me } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: USERS_KEY,
    queryFn: adminApi.listUsers,
  });

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500">
            Gestiona las cuentas: datos, rol, contraseña y eliminación.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Crear cliente</Button>
      </div>

      <div className="animate-fade-in-up overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
        {isLoading ? (
          <p className="p-6 text-sm text-slate-500">Cargando…</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Alta</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const isSelf = user.id === me?.user.id;
                return (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {user.username}
                      {isSelf && <span className="ml-2 text-xs text-slate-400">(tú)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" onClick={() => setEditingId(user.id)}>
                        Ver / Editar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editingId && (
        <AdminUserEditModal
          userId={editingId}
          isSelf={editingId === me?.user.id}
          onClose={() => setEditingId(null)}
        />
      )}

      {creating && <CreateClientModal onClose={() => setCreating(false)} />}
    </DashboardLayout>
  );
}
