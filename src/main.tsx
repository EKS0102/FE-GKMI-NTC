import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router';
import { Refine } from '@refinedev/core';
import routerProvider from '@refinedev/react-router';
import { App, Button, ConfigProvider, Result } from 'antd';
import idID from 'antd/locale/id_ID';
import { ErrorBoundary } from 'react-error-boundary';
import { authProvider } from './api';
import { PublicPage } from './PublicPage';
import { AdminLayout, Dashboard, Login, ModuleRoute, Reports, Settings } from './Admin';
import { modules } from './modules';
import 'antd/dist/reset.css';
import './styles.css';
document.documentElement.dataset.density = localStorage.getItem('gkmi.density') || 'nyaman';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ErrorBoundary fallbackRender={({resetErrorBoundary}) => <Result status="error" title="Halaman mengalami kendala" subTitle="Silakan muat ulang halaman untuk mencoba kembali." extra={<Button onClick={resetErrorBoundary}>Coba lagi</Button>}/>}><ConfigProvider locale={idID} theme={{token:{colorPrimary:'#1b5e9a',colorInfo:'#1b5e9a',borderRadius:8,fontFamily:'"Segoe UI", sans-serif',colorText:'#273446',colorError:'#c52a35',controlHeight:40}}}><App><BrowserRouter><Refine authProvider={authProvider} routerProvider={routerProvider} options={{disableTelemetry:true}}><Routes><Route path="/" element={<PublicPage/>}/><Route path="/login" element={<Login/>}/><Route path="/admin" element={<AdminLayout/>}><Route index element={<Dashboard/>}/>{Object.keys(modules).map(key => <Route key={key} path={key} element={<ModuleRoute resource={key}/>}/>)}<Route path="laporan" element={<Reports/>}/><Route path="settings" element={<Settings/>}/></Route><Route path="*" element={<Result status="404" title="Halaman tidak ditemukan" extra={<Link to="/">Kembali ke beranda</Link>}/>}/></Routes></Refine></BrowserRouter></App></ConfigProvider></ErrorBoundary></React.StrictMode>
);
