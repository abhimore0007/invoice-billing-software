import {test,expect} from '@playwright/test';

test('signature is visible only on the final PDF page and footer stays aligned',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const pages=await page.evaluate(async()=>{
    const {createPDF,loadPDFAssets}=await import('/src/pdf.js');
    const {renderPDF}=await import('/src/pdfRenderer.js');
    const items=Array.from({length:50},(_,i)=>({description:`Test product ${i+1}\nIndustrial equipment for continuous operation.\nSupplied with mounting accessories.`,hsn:'84148011',qty:2,rate:45000}));
    const pdf=createPDF({type:'Invoice',number:'TEST-PAGINATION',date:'2026-10-07',client:{company:'Test Company',address:'Test Address',city:'Mumbai',state:'Maharashtra',pincode:'400001',gst:'27AABCA1234A1Z5'},data:{type:'Invoice',items,cgst:9,sgst:9,igst:0,discount:0,rounding:0,terms:'Test terms.'}},await loadPDFAssets());
    const container=document.createElement('div');document.body.appendChild(container);
    const renderer=renderPDF(pdf.output('arraybuffer'),container);
    try{
      await renderer.ready;
      return Array.from(container.querySelectorAll('canvas')).map(canvas=>{
        const context=canvas.getContext('2d'),pixels=context.getImageData(18,1095,330,93).data;
        let ink=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<130&&pixels[i+1]<130&&pixels[i+2]<130)ink++;
        return {ink,footer:Array.from(context.getImageData(18,1200,1,1).data)};
      });
    }finally{renderer.destroy();container.remove();}
  });
  expect(pages.length).toBeGreaterThan(1);
  for(const [index,result] of pages.entries()){
    if(index===pages.length-1)expect(result.ink).toBeGreaterThan(100);
    else expect(result.ink).toBeLessThan(20);
    expect(result.footer[0]).toBeGreaterThan(200);
    expect(result.footer[1]).toBeLessThan(100);
    expect(result.footer[2]).toBeLessThan(100);
  }
});

test('admin-created staff account can log in and retains identity after reload',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.locator('nav').getByRole('button',{name:'Users',exact:true}).click();
  await page.getByRole('button',{name:'Add user',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill('Priya Staff');
  await dialog.getByLabel('Username').fill('priya');
  await dialog.getByLabel('Password',{exact:true}).fill('TestStaff123!');
  await dialog.getByRole('button',{name:'Save user'}).click();
  await expect(dialog).toHaveCount(0);
  const account=await page.evaluate(()=>JSON.parse(localStorage.getItem('ruby-demo')).users.find(u=>u.username==='priya'));
  expect(account.password).toBeUndefined();expect(account.passwordHash).toMatch(/^\$2/);
  await page.getByRole('button',{name:'Logout',exact:true}).click();
  await page.getByLabel('Username').fill('priya');
  await page.getByLabel('Password',{exact:true}).fill('incorrect-password');
  await page.getByRole('button',{name:'Login',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Invalid username or password');
  await page.getByLabel('Password',{exact:true}).fill('TestStaff123!');
  await page.getByRole('button',{name:'Login',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Welcome back, Priya'})).toBeVisible();
  await expect(page.locator('nav').getByRole('button',{name:'Users',exact:true})).toHaveCount(0);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'Welcome back, Priya'})).toBeVisible();
});

test('older demo account can set an admin password and log in',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.locator('nav').getByRole('button',{name:'Users',exact:true}).click();
  await page.getByRole('button',{name:'Edit user'}).click();
  await page.getByRole('dialog').getByLabel('New password (leave blank to keep)').fill('AdminTest123!');
  await page.getByRole('button',{name:'Save user'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'Logout',exact:true}).click();
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password',{exact:true}).fill('AdminTest123!');
  await page.getByRole('button',{name:'Login',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Welcome back, Alex'})).toBeVisible();
  await expect(page.locator('nav').getByRole('button',{name:'Users',exact:true})).toBeVisible();
});

test('create invoice, update payment status, download, duplicate and delete',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'Welcome back, Alex'})).toBeVisible();
  await page.getByRole('button',{name:'Create invoice',exact:true}).first().click();
  await page.locator('#client-picker').click();
  await page.getByRole('button',{name:/Acme Industries Rahul/}).click();
  await page.getByRole('textbox',{name:'Particular 1',exact:true}).fill('Precision hydraulic assembly');
  await page.getByRole('spinbutton',{name:'Quantity 1',exact:true}).fill('2');
  await page.getByRole('spinbutton',{name:'Rate 1',exact:true}).fill('1000');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Document history'})).toBeVisible();
  const number=await page.locator('.document-link').first().innerText();
  await page.locator('.document-link').first().click();
  await expect(page.getByRole('dialog')).toContainText('Precision hydraulic assembly');
  await page.getByLabel('Document status',{exact:true}).selectOption('Paid');
  await expect(page.getByRole('dialog').locator('.badge.paid')).toBeVisible();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('dialog').getByRole('button',{name:'Download PDF',exact:true}).click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe(number.trim()+'.pdf');
  expect(await download.failure()).toBeNull();
  await page.getByRole('button',{name:'Close dialog'}).click();
  await page.getByRole('button',{name:'More actions'}).first().click();
  await page.getByRole('button',{name:'Duplicate',exact:true}).click();
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('button',{name:'More actions'}).first().click();
  await page.getByRole('button',{name:'Delete',exact:true}).click();
  await page.getByRole('button',{name:'Delete record'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('inline client creation selects the new client without leaving the invoice',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Create invoice',exact:true}).first().click();
  await page.getByRole('button',{name:'Add New Client'}).click();
  const dialog=page.getByRole('dialog');
  for(const [label,value] of [['Name','Test Contact'],['Company','Test Manufacturing'],['Address','12 Industrial Road'],['City','Mumbai'],['Pincode','400001'],['Phone','9876543210'],['Email','test@example.com']])await dialog.getByLabel(label,{exact:true}).fill(value);
  await dialog.getByRole('button',{name:'Save client'}).click();
  await expect(page.locator('#client-picker')).toHaveValue('Test Manufacturing');
  await expect(page.getByLabel('Company Contact no')).toHaveValue('9876543210');
});

test('mobile navigation and login validation',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Toggle menu'}).click();
  await page.locator('nav').getByRole('button',{name:'Delivery Challan'}).click();
  await expect(page.getByRole('heading',{name:'Create delivery challan'})).toBeVisible();
  await expect(page.getByRole('spinbutton',{name:'Rate 1',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Sign in to your workspace'}).click();
  await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible();
  await page.getByLabel('Password',{exact:true}).fill('test-password');
  await page.getByRole('button',{name:'Show password'}).click();
  await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('type','text');
  await page.getByRole('button',{name:'Login',exact:true}).click();
  await expect(page.getByLabel('Username')).toBeFocused();
});
