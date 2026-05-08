import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { clientsApi } from '../services/api'
import { fmt, getErrorMsg } from '../utils/helpers'
import { Spinner, Empty, Modal, Field, Toast, Confirm } from '../components/ui'
import { useForm } from 'react-hook-form'

function ClientForm({ onSubmit, loading, defaultValues }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre *" error={errors.name?.message}>
          <input className="input" placeholder="Empresa o persona"
            {...register('name', { required: 'Requerido' })} />
        </Field>
        <Field label="Tipo documento">
          <select className="input" {...register('document_type')}>
            {['NIT','CC','CE','Pasaporte'].map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Número documento *" error={errors.document_number?.message}>
        <input className="input" placeholder="900123456-7"
          {...register('document_number', { required: 'Requerido' })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <input className="input" type="email" placeholder="correo@empresa.com"
            {...register('email')} />
        </Field>
        <Field label="Teléfono">
          <input className="input" placeholder="+57 311 000 0000"
            {...register('phone')} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ciudad">
          <input className="input" placeholder="Cúcuta" {...register('city')} />
        </Field>
        <Field label="Dirección">
          <input className="input" placeholder="Calle 1 # 2-3" {...register('address')} />
        </Field>
      </div>
      <Field label="Notas">
        <textarea className="input resize-none" rows={2} {...register('notes')} />
      </Field>
      <button type="submit" disabled={loading}
              className="btn btn-primary w-full justify-center py-2.5 mt-1 disabled:opacity-50">
        {loading ? <><span className="spinner w-4 h-4" /> Guardando...</> : 'Guardar cliente'}
      </button>
    </form>
  )
}

export default function ClientsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null) // 'create' | { edit: client }
  const [toast, setToast] = useState(null)
  const [delConfirm, setDelConfirm] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['clients', page, search],
    queryFn: () => clientsApi.list({ page, per_page: 15, search: search || undefined }).then(r => r.data),
    keepPreviousData: true,
  })

  const createMut = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => { qc.invalidateQueries(['clients']); setModal(null); showToast('Cliente creado') },
    onError: (e) => showToast(getErrorMsg(e), 'error'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => clientsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['clients']); setModal(null); showToast('Cliente actualizado') },
    onError: (e) => showToast(getErrorMsg(e), 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: clientsApi.delete,
    onSuccess: () => { qc.invalidateQueries(['clients']); setDelConfirm(null); showToast('Cliente eliminado') },
    onError: (e) => showToast(getErrorMsg(e), 'error'),
  })

  return (
    <div>
      {/* TOPBAR */}
      <div className="sticky top-0 z-10 bg-bg/80 backdrop-blur border-b border-border
                      flex items-center justify-between px-8 py-5">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Clientes</h1>
          <p className="text-xs text-muted font-mono mt-0.5">
            {data?.total || 0} registrados
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>
          ＋ Nuevo Cliente
        </button>
      </div>

      <div className="p-8">
        {/* SEARCH */}
        <div className="mb-5">
          <input
            className="input max-w-sm"
            placeholder="🔍 Buscar por nombre, NIT o email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        {/* TABLE */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : !data?.items?.length ? (
            <Empty icon="👤" title="No hay clientes" desc="Crea tu primer cliente" />
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {['Cliente','Documento','Contacto','Ciudad','Facturas','Total facturado',''].map(h => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map(c => (
                  <tr key={c.id} className="table-row">
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent
                                        flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{c.name}</p>
                          <p className="text-[11px] text-muted">{c.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td font-mono text-xs text-muted">
                      {c.document_type}: {c.document_number}
                    </td>
                    <td className="td text-xs text-muted">{c.phone || '—'}</td>
                    <td className="td text-xs text-muted">{c.city || '—'}</td>
                    <td className="td font-mono text-xs text-center">{c.invoice_count || 0}</td>
                    <td className="td font-mono text-sm font-semibold text-accent">
                      {fmt.currency(c.total_invoiced)}
                    </td>
                    <td className="td">
                      <div className="flex gap-1.5">
                        <button
                          className="text-[11px] bg-surface2 border border-border px-2 py-1
                                     rounded-md font-semibold hover:bg-accent hover:text-black
                                     hover:border-accent transition-all"
                          onClick={() => setModal({ edit: c })}>
                          Editar
                        </button>
                        <button
                          className="text-[11px] bg-danger/10 border border-danger/20 text-danger px-2 py-1
                                     rounded-md font-semibold hover:bg-danger/20 transition-all"
                          onClick={() => setDelConfirm(c)}>
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION */}
        {data?.pages > 1 && (
          <div className="flex justify-center gap-2 mt-5">
            {Array.from({ length: data.pages }, (_, i) => (
              <button key={i}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all
                  ${page === i+1 ? 'bg-accent text-black' : 'btn btn-ghost'}`}
                onClick={() => setPage(i + 1)}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Nuevo Cliente" width="max-w-xl">
        <ClientForm
          loading={createMut.isPending}
          onSubmit={(data) => createMut.mutate(data)}
        />
      </Modal>

      {/* EDIT MODAL */}
      <Modal open={!!modal?.edit} onClose={() => setModal(null)} title="Editar Cliente" width="max-w-xl">
        <ClientForm
          defaultValues={modal?.edit}
          loading={updateMut.isPending}
          onSubmit={(data) => updateMut.mutate({ id: modal.edit.id, data })}
        />
      </Modal>

      {/* DELETE CONFIRM */}
      <Confirm
        open={!!delConfirm}
        onClose={() => setDelConfirm(null)}
        onConfirm={() => deleteMut.mutate(delConfirm?.id)}
        title="Eliminar cliente"
        desc={`¿Eliminar a "${delConfirm?.name}"? Sus facturas se conservarán.`}
        danger
      />

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
