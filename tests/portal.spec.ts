import { test, expect, type Page } from '@playwright/test';

async function backend(page: Page, role = 'admin', expired = false) {
  let refreshed = false;
  let refreshCount = 0;
  const members: Record<string, unknown>[] = [];
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    const reply = (body: unknown, status = 200) => route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path === '/api/auth/login') {
      if(route.request().postDataJSON().password === 'wrong') return reply({message:'Invalid credentials'},401);
      return reply({access_token:'test-access',refresh_token:'test-refresh'});
    }
    if(path === '/api/auth/refresh') {refreshed=true;refreshCount++;return reply({access_token:'new-access',refresh_token:'new-refresh'});}
    if(expired && !refreshed) return reply({message:'expired'},401);
    if(path === '/api/auth/me') return reply({user_id:1,username:'pengurus',role});
    if(path === '/api/auth/logout') return reply({message:'logout successful'});
    if(path === '/api/jemaat' && method === 'GET') return reply(route.request().url().includes('?') ? {items:members,total:members.length} : members);
    if(path === '/api/jemaat' && method === 'POST') {const item={...route.request().postDataJSON(),id:1};members.push(item);return reply(item,201);}
    return reply([]);
  });
  return {members,refreshCount:()=>refreshCount};
}
async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Username',{exact:true}).fill('pengurus');
  await page.getByLabel('Password',{exact:true}).fill('password-test');
  await page.getByRole('button',{name:'Masuk ke portal'}).click();
  await expect(page.getByRole('heading',{name:'Shalom, pengurus.'})).toBeVisible();
}
test('public landing works on mobile and protects admin routes', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await expect(page.getByRole('heading',{name:/Rumah untuk/})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Buka navigasi'}).click();
  await page.getByRole('link',{name:'Warta jemaat',exact:true}).click();
  await expect(page).toHaveURL(/#warta/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
});
test('invalid credentials show an error; login, refresh and logout work', async ({page}) => {
  const mock = await backend(page,'admin',true);
  await page.goto('/login');
  await page.getByLabel('Username',{exact:true}).fill('pengurus');
  await page.getByLabel('Password',{exact:true}).fill('wrong');
  await page.getByRole('button',{name:'Masuk ke portal'}).click();
  await expect(page.getByText('Username atau password tidak sesuai.')).toBeVisible();
  await login(page);
  expect(mock.refreshCount()).toBe(1);
  await page.getByRole('button',{name:'Keluar',exact:true}).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => sessionStorage.getItem('gkmi.session'))).toBeNull();
});
test('viewer cannot create members or access user management', async ({page}) => {
  await backend(page,'viewer');await login(page);
  await page.goto('/admin/jemaat');
  await expect(page.getByRole('heading',{name:'Data jemaat',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Tambah jemaat'})).toHaveCount(0);
  await page.goto('/admin/users');
  await expect(page.getByText('Akses terbatas')).toBeVisible();
});
test('member form sends the actual Go API schema', async ({page}) => {
  const mock = await backend(page);await login(page);
  await page.goto('/admin/jemaat');
  await page.getByRole('button',{name:'Tambah jemaat'}).click();
  await page.getByLabel('Nama lengkap',{exact:true}).fill('Jemaat Pengujian');
  await page.getByLabel('Nama panggilan',{exact:true}).fill('Pengujian');
  await page.getByLabel('Tanggal lahir',{exact:true}).fill('1990-01-15');
  await page.getByLabel('Domisili',{exact:true}).fill('Kota Pengujian');
  for(const [label,value] of [['Jenis kelamin','Perempuan'],['Status jemaat','Jemaat'],['Diakonia','Tidak'],['Kelompok ibadah','Youth']]) {
    await page.getByRole('dialog').getByLabel(label,{exact:true}).click();
    await page.locator('.ant-select-item-option-content').getByText(value,{exact:true}).click();
  }
  await page.getByRole('button',{name:'Simpan data'}).click();
  await expect(page.getByRole('cell',{name:'Jemaat Pengujian',exact:true})).toBeVisible();
  expect(mock.members[0].tanggal_lahir).toBe('1990-01-15T00:00:00Z');
  expect(mock.members[0].kelompok_ibadah).toBe('Youth');
});
test('finance demo persists and published bulletin appears publicly', async ({page}) => {
  await backend(page);await login(page);
  await page.goto('/admin/keuangan');
  await page.getByRole('button',{name:'Tambah keuangan'}).click();
  await page.getByLabel('Keterangan',{exact:true}).fill('Persembahan pengujian');
  await page.getByLabel('Tanggal',{exact:true}).fill('2026-09-29');
  await page.getByRole('dialog').getByLabel('Jenis',{exact:true}).click();
  await page.locator('.ant-select-item-option-content').getByText('Pemasukan',{exact:true}).click();
  await page.getByLabel('Kategori',{exact:true}).click();
  await page.locator('.ant-select-item-option-content').getByText('Persembahan',{exact:true}).click();
  await page.getByLabel('Jumlah (Rp)',{exact:true}).fill('250000');
  await page.getByRole('button',{name:'Simpan data'}).click();
  await expect(page.getByRole('cell',{name:'Persembahan pengujian'})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('cell',{name:'Persembahan pengujian'})).toBeVisible();
  await page.goto('/admin/laporan');
  await page.getByLabel('Periode laporan').fill('2026-09');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Ekspor CSV'}).click();
  expect((await download).suggestedFilename()).toBe('laporan-2026-09.csv');
  await page.goto('/admin/warta');
  await page.getByRole('button',{name:'Tambah warta'}).click();
  await page.getByLabel('Judul',{exact:true}).fill('Warta pengujian');
  await page.getByLabel('Tanggal',{exact:true}).fill('2026-09-29');
  await page.getByLabel('Isi warta',{exact:true}).fill('Mari bertumbuh bersama dalam kasih.');
  await page.getByRole('dialog').getByLabel('Status',{exact:true}).click();
  await page.locator('.ant-select-item-option-content').getByText('Terbit',{exact:true}).click();
  await page.getByRole('button',{name:'Simpan data'}).click();
  await expect(page.getByRole('cell',{name:'Warta pengujian'})).toBeVisible();
  await page.goto('/');
  await page.getByRole('button',{name:'Baca selengkapnya'}).click();
  await expect(page.getByRole('dialog')).toContainText('Mari bertumbuh bersama dalam kasih.');
});
