import { useEffect, useState } from 'react';
import { Alert, App, Button, Empty, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag } from 'antd';
import { DownloadOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { api, type Identity } from './api';
import { modules } from './modules';
import { sundayService } from './church';
import { exportCsv, readRows, rupiah, type Row } from './local';

export function ResourcePage({ resource, identity }: { resource: string; identity: Identity }) {
  const config = modules[resource];
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>();
  const [editing, setEditing] = useState<Row | null | undefined>();
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const canWrite = resource === 'users' ? identity.role === 'admin' : identity.role !== 'viewer';
  async function load() {
    setBusy(true); setError('');
    try { const data = config.remote ? await api<Row[] | null>('/' + resource) : readRows(resource); setRows(data || []); }
    catch (e) { setError(e instanceof Error ? e.message : 'Gagal mengambil data'); }
    finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, [resource]);
  function open(row: Row | null) {
    form.resetFields();
    form.setFieldsValue(row ? {...row, tanggal_lahir: String(row.tanggal_lahir || '').slice(0,10)} : { is_active:true });
    setEditing(row);
  }
  async function save(values: Record<string, unknown>) {
    setSaving(true);
    try {
      const normalized = Object.fromEntries(Object.entries(values).map(([k,v]) => [k, typeof v === 'string' ? v.trim() : v]));
      if (resource === 'jemaat') normalized.tanggal_lahir = `${normalized.tanggal_lahir}T00:00:00Z`;
      if (config.remote) await api('/' + resource + (editing ? '/' + editing.id : ''), { method: editing ? 'PUT' : 'POST', body: JSON.stringify(normalized) });
      else {
        const row = { ...normalized, id: editing?.id || crypto.randomUUID() };
        const next = editing ? rows.map(r => r.id === editing.id ? row : r) : [...rows, row];
        localStorage.setItem('gkmi.demo.' + resource, JSON.stringify(next));
      }
      setEditing(undefined); message.success('Data berhasil disimpan'); await load();
    } catch (e) { message.error(e instanceof Error ? e.message : 'Data gagal disimpan'); }
    finally { setSaving(false); }
  }
  async function remove(row: Row) {
    try {
      if (config.remote) await api('/' + resource + '/' + row.id, {method:'DELETE'});
      else localStorage.setItem('gkmi.demo.' + resource, JSON.stringify(rows.filter(r => r.id !== row.id)));
      message.success('Data dihapus'); await load();
    } catch (e) { message.error(e instanceof Error ? e.message : 'Gagal menghapus'); }
  }
  const filterField = config.fields.find(f => f.options);
  const visible = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(search.toLowerCase())) && (!filter || r[filterField!.name] === filter));
  const fields = config.fields.filter(f => !['password','textarea'].includes(f.type || ''));
  return <>
    <div className="page-heading"><div><span className="eyebrow">RUANG PELAYANAN</span><h1>{config.title}</h1><p>{config.description}</p></div>{canWrite && <Button type="primary" icon={<PlusOutlined/>} onClick={() => open(null)}>Tambah {resource === 'users' ? 'pengguna' : resource}</Button>}</div>
    {resource === 'ibadah' && <Alert className="notice" showIcon type="info" message={`${sundayService.title} — ${sundayService.schedule}`} description="Jadwal rutin gereja. Tabel di bawah digunakan untuk jadwal tambahan demo lokal."/>}
    {!config.remote && <Alert className="notice" showIcon type="info" message="Mode demo lokal" description="Data modul ini hanya disimpan di browser ini, belum terhubung ke backend. Jangan masukkan data operasional atau informasi sensitif."/>}
    {error && <Alert className="notice" showIcon type="error" message="Data belum dapat dimuat" description={error} action={<Button onClick={load}>Coba lagi</Button>}/>}
    <section className="panel"><div className="table-toolbar"><Input.Search aria-label="Cari data" placeholder={`Cari ${config.title.toLowerCase()}…`} allowClear value={search} onChange={e => setSearch(e.target.value)} style={{maxWidth:320}}/>
      <Space wrap>{filterField && <Select aria-label={filterField.label} placeholder={filterField.label} allowClear style={{minWidth:160}} value={filter} onChange={setFilter} options={filterField.options!.map(value => ({value,label:value}))}/>}<Button icon={<ReloadOutlined/>} onClick={load} aria-label="Muat ulang"/><Button icon={<DownloadOutlined/>} onClick={() => exportCsv(visible, fields.map(f => f.name), resource)} disabled={!visible.length}>Ekspor CSV</Button></Space></div>
      <Table<Row> rowKey="id" loading={busy} dataSource={visible} scroll={{x:900}} pagination={{pageSize:10,showSizeChanger:true,showTotal:n => `${n} data`}} locale={{emptyText:<Empty description={error ? 'Data tidak tersedia. Silakan coba lagi.' : 'Belum ada data. Mulai dengan menambahkan data pertama.'}/>}} columns={[
        ...fields.map(f => ({title:f.label,dataIndex:f.name,key:f.name,render:(v:unknown) => f.type === 'boolean' ? <Tag color={v ? 'green':'default'}>{v ? 'Aktif':'Nonaktif'}</Tag> : f.type === 'date' ? String(v || '').slice(0,10) : f.name === 'jumlah' ? rupiah(Number(v)) : f.options ? <Tag>{String(v || '—')}</Tag> : String(v || '—')})),
        {title:'Aksi',key:'actions',fixed:'right' as const,width:160,render:(_,row) => <Space><Button size="small" onClick={() => open(row)}>{canWrite ? 'Edit':'Detail'}</Button>{identity.role === 'admin' && <Popconfirm title="Hapus data ini?" description="Data yang dihapus tidak dapat dikembalikan." onConfirm={() => remove(row)} okText="Hapus" cancelText="Batal"><Button danger size="small">Hapus</Button></Popconfirm>}</Space>}
      ]}/>
    </section>
    <Modal title={`${editing ? canWrite ? 'Edit' : 'Detail' : 'Tambah'} ${config.title.toLowerCase()}`} open={editing !== undefined} onCancel={() => setEditing(undefined)} footer={null} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={save} disabled={!canWrite}>
        {config.fields.filter(f => !(f.type === 'password' && editing)).map(f => <Form.Item key={f.name} name={f.name} label={f.label} valuePropName={f.type === 'boolean' ? 'checked':'value'} rules={[{type: f.type === 'number' ? 'number' : f.type === 'boolean' ? 'boolean' : 'string', required:!f.optional && f.type !== 'boolean',message:`${f.label} wajib diisi`, whitespace:!f.options && !['number','boolean'].includes(f.type || '')},...(f.type === 'email' ? [{type:'email' as const,message:'Format email tidak valid'}]:[]),...(f.type === 'password' ? [{min:8,message:'Minimal 8 karakter'}]:[])]}>
          {f.options ? <Select options={f.options.map(value => ({value,label:value}))}/> : f.type === 'textarea' ? <Input.TextArea rows={5}/> : f.type === 'number' ? <InputNumber min={1} precision={0} style={{width:'100%'}}/> : f.type === 'boolean' ? <Switch/> : f.type === 'password' ? <Input.Password autoComplete="new-password"/> : <Input type={f.type || 'text'} max={resource === 'jemaat' && f.type === 'date' ? new Date().toISOString().slice(0,10) : undefined}/>}
        </Form.Item>)}
        {canWrite && <Button type="primary" htmlType="submit" loading={saving} block>Simpan data</Button>}
      </Form>
    </Modal>
  </>;
}
