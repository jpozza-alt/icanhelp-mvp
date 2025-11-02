'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { ticketCreateSchema, ticketUpdateSchema } from '@\/lib/validators/ticket';

type Ticket = {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'closed';
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

const Toast = ({ message, onClose }: { message: string; onClose: () => void }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className='fixed bottom-4 right-4 rounded-md border px-4 py-2 shadow bg-neutral-900 text-white'>
      {message}
    </div>
  );
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const refresh = async () => {
    setLoading(true);
    const res = await fetch('/api/tickets', { cache: 'no-store' });
    const json = await res.json();
    setTickets(json.tickets ?? []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const createTicket = async () => {
    const parsed = ticketCreateSchema.safeParse({ title, description });
    if (!parsed.success) {
      setToast('Título muito curto ou inválido.');
      return;
    }
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
    if (res.ok) {
      setTitle(''); setDescription('');
      setToast('Ticket criado!');
      await refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setToast(j.error ?? 'Erro ao criar ticket');
    }
  };

  const updateStatus = async (id: string, status: Ticket['status']) => {
    const parsed = ticketUpdateSchema.safeParse({ status });
    if (!parsed.success) return setToast('Status inválido.');
    const res = await fetch(/api/tickets/, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setToast('Status atualizado');
      await refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setToast(j.error ?? 'Erro ao atualizar');
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(/api/tickets/, { method: 'DELETE' });
    if (res.ok) {
      setToast('Ticket removido');
      await refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setToast(j.error ?? 'Erro ao remover');
    }
  };

  const counts = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      in_progress: tickets.filter(t => t.status === 'in_progress').length,
      closed: tickets.filter(t => t.status === 'closed').length,
    };
  }, [tickets]);

  return (
    <div className='p-6 space-y-6'>
      <h1 className='text-2xl font-semibold'>Atendimentos / Tickets</h1>

      {/* Cards simples */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div className='rounded-lg border p-4'><div className='text-sm opacity-70'>Total</div><div className='text-2xl font-bold'>{counts.total}</div></div>
        <div className='rounded-lg border p-4'><div className='text-sm opacity-70'>Abertos</div><div className='text-2xl font-bold'>{counts.open}</div></div>
        <div className='rounded-lg border p-4'><div className='text-sm opacity-70'>Em andamento</div><div className='text-2xl font-bold'>{counts.in_progress}</div></div>
        <div className='rounded-lg border p-4'><div className='text-sm opacity-70'>Fechados</div><div className='text-2xl font-bold'>{counts.closed}</div></div>
      </div>

      {/* Form criar */}
      <div className='rounded-lg border p-4 space-y-3'>
        <div className='text-lg font-medium'>Novo Ticket</div>
        <div className='grid gap-2'>
          <input className='border rounded px-3 py-2 bg-transparent' placeholder='Título' value={title} onChange={e => setTitle(e.target.value)} />
          <textarea className='border rounded px-3 py-2 bg-transparent' placeholder='Descrição (opcional)' value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <button onClick={createTicket} className='rounded px-4 py-2 border'>Criar</button>
      </div>

      {/* Lista */}
      <div className='rounded-lg border'>
        {loading ? (
          <div className='p-4'>Carregando...</div>
        ) : tickets.length === 0 ? (
          <div className='p-4 opacity-70'>Nenhum ticket ainda.</div>
        ) : (
          <table className='w-full text-sm'>
            <thead className='border-b'>
              <tr className='text-left'>
                <th className='p-3'>Título</th>
                <th className='p-3'>Status</th>
                <th className='p-3'>Criado em</th>
                <th className='p-3'>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id} className='border-b hover:bg-neutral-950/20'>
                  <td className='p-3'>{t.title}</td>
                  <td className='p-3'>
                    <select
                      className='border rounded bg-transparent px-2 py-1'
                      value={t.status}
                      onChange={(e) => updateStatus(t.id, e.target.value as Ticket['status'])}
                    >
                      <option value='open'>open</option>
                      <option value='in_progress'>in_progress</option>
                      <option value='closed'>closed</option>
                    </select>
                  </td>
                  <td className='p-3'>{new Date(t.created_at).toLocaleString()}</td>
                  <td className='p-3 space-x-2'>
                    <button className='border rounded px-2 py-1' onClick={() => remove(t.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
