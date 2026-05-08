import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '../services/api'
import { fmt, getErrorMsg } from '../utils/helpers'
import { Spinner, Empty, Modal, Field, Toast } from '../components/ui'
import { useForm } from 'react-hook-form'

function ProductForm({ onSubmit, loading, defaultValues }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Código *" error={errors.code?.message}>
          <input className="input" placeholder="SRV-001"
            {...register('code', { required: 'Requerido' })} />
        </Field>
        <Field label="Tipo">
          <select className="input" {...register('type')}>
            <option value="service">Servicio</option>
            <option value="product">Producto</option>
          </select>
        </Field>
      </div>
      <Field label="Nombre *" error={errors.name?.message}>
        <input className="input" placeholder="Nombre del producto o servicio"
          {...register('name', { required: 'Requerido' })} />
      </Field>
      <Field label="Descripción">
        <textarea className="input resize-none" rows={2} {...register('description')} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Precio unitario *" error={errors.unit_price?.message}>
          <input type="number" step="0.01" min="0" className="input"
            {...register('unit_price', { required: 'Requerido', min: 0 })} />
        </Field>
        <Field label="IVA %">
          <input type="number" step="0.01" min="0" max="100" className="input"
            defaultValue={19} {...register('tax_rate')} />
        </Field>
        <Field label="Unidad">
          <select className="input" {...register('unit')}>
            {['Und','Hr','Kg','Lt','m²','m³','Día','Mes'].map(u => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
      </div>
      <button type="submit" disabled={loading}
              className="btn btn-primary w-full justify-center py-2.5 mt-1 disabled:opacity-50">
        {loading ? <><span className="spinner w-4 h-4" /> Guardando...</> : 'Guardar producto'}
      </button>
    </form>
  )
}

export default function ProductsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () => productsApi.list({ page, per_page: 15, search: search || undefined }).then(r => r.data),
    keepPreviousData: true,
  })

  const createMut = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => { qc.invalidateQueries(['products']); setModal(null); showToast('Producto creado') },
    onError: e => showToast(getErrorMsg(e), 'error'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => productsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['products']); setModal(null); showToast('Producto actualizado') },
    onError: e => showToast(getErrorMsg(e), 'error'),
  })

  const TYPE_LABEL = { product: '📦 Producto', service: '⚡ Servicio' }

  return (
    <div>
      <div className="sticky top-0 z-10 bg-bg/80 backdrop-blur border-b border-border
                      flex items-center justify-between px-8 py-5">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Productos & Servicios</h1>
          <p className="text-xs text-muted font-mono mt-0.5">{data?.total || 0} registrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>＋ Nuevo</button>
      </div>

      <div className="p-8">
        <div className="mb-5">
          <input className="input max-w-sm" placeholder="🔍 Buscar por nombre o código..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>

        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : !data?.items?.length ? (
            <Empty icon="📦" title="Sin productos" desc="Agrega tu primer producto o servicio" />
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {['Código','Nombre','Tipo','Precio unit.','IVA','Unidad',''].map(h => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map(p => (
                  <tr key={p.id} className="table-row">
                    <td className="td font-mono text-xs text-accent">{p.code}</td>
                    <td className="td">
                      <p className="font-semibold text-sm">{p.name}</p>
                      {p.description && <p className="text-xs text-muted truncate max-w-xs">{p.description}</p>}
                    </td>
                    <td className="td text-xs">{TYPE_LABEL[p.type]}</td>
                    <td className="td font-mono font-semibold text-sm">{fmt.currency(p.unit_price)}</td>
                    <td className="td font-mono text-xs text-muted">{p.tax_rate}%</td>
                    <td className="td text-xs text-muted">{p.unit}</td>
                    <td className="td">
                      <button
                        className="text-[11px] bg-surface2 border border-border px-2 py-1
                                   rounded-md font-semibold hover:bg-accent hover:text-black
                                   hover:border-accent transition-all"
                        onClick={() => setModal({ edit: p })}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data?.pages > 1 && (
          <div className="flex justify-center gap-2 mt-5">
            {Array.from({ length: data.pages }, (_, i) => (
              <button key={i}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all
                  ${page === i+1 ? 'bg-accent text-black' : 'btn btn-ghost'}`}
                onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Nuevo Producto" width="max-w-xl">
        <ProductForm loading={createMut.isPending} onSubmit={createMut.mutate} />
      </Modal>

      <Modal open={!!modal?.edit} onClose={() => setModal(null)} title="Editar Producto" width="max-w-xl">
        <ProductForm
          defaultValues={modal?.edit}
          loading={updateMut.isPending}
          onSubmit={data => updateMut.mutate({ id: modal.edit.id, data })}
        />
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
