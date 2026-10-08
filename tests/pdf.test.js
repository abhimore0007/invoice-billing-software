import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPDF,company} from '../src/pdf.js';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';

const assets=Object.fromEntries(Object.entries({letterhead:'letterhead.png',watermark:'watermark.png',footer:'footer.png',regular:'reference-regular.ttf',bold:'reference-bold.ttf'}).map(([key,file])=>[key,fs.readFileSync(new URL('../public/branding/'+file,import.meta.url)).toString('base64')]));
const base={type:'Invoice',number:'RHC-26/27/-602',date:'2026-10-06',client:{company:'JINDAL INFRASTRUCTURES PRIVATE LIMITED',address:'2nd Floor Plot No-89, D-Block, Kamla Nagar, North Delhi',city:'',pincode:'110007',state:'Delhi',gst:'07AABCJ3327M1ZH'},data:{type:'Invoice',items:[{description:'1/2"R3 3600 MM ONLY HOSE-PARKER',hsn:'40092100',qty:2,rate:1500},{description:'3/8"NPT MALE ONLY FITTINGS',hsn:'40092200',qty:1,rate:150}],cgst:0,sgst:0,igst:18,discount:0,rounding:0,terms:company.terms}};
async function contents(pdf){
  const loadingTask=getDocument({data:new Uint8Array(pdf.output('arraybuffer')),useSystemFonts:true});
  const parsed=await loadingTask.promise;
  const pages=[];
  for(let i=1;i<=parsed.numPages;i++){const p=await parsed.getPage(i);pages.push((await p.getTextContent()).items.map(i=>i.str).join(' '));}
  await loadingTask.destroy();return pages;
}
test('reference invoice renders complete text, expected totals and bank details on one A4 page',async()=>{
  const pdf=createPDF(base,assets),pages=await contents(pdf);
  assert.equal(pages.length,1);
  for(const value of ['TAX Invoice','JINDAL INFRASTRUCTURES PRIVATE LIMITED','1/2"R3 3600 MM ONLY HOSE-PARKER','3150.00','567.00','3717.00','UTIB0001965','922030067831478','Three Thousand Seven Hundred And Seventeen Rupees Only'])assert.ok(pages[0].includes(value),`Missing ${value}`);
  assert.equal((pages[0].match(/Price in Words:/g)||[]).length,1);
  assert.equal(Math.round(pdf.internal.pageSize.getHeight()),842);
});
test('long invoices retain every multiline item, repeat table headings and reserve footer space',async()=>{
  const items=Array.from({length:50},(_,i)=>({description:`Product ${i+1}\nIndustrial equipment for continuous operation.\nSupplied with mounting accessories.`,hsn:'84148011',qty:2,rate:45000}));
  const pdf=createPDF({...base,data:{...base.data,items}},assets),pages=await contents(pdf);
  assert.ok(pages.length>1);
  const all=pages.join(' ');
  for(let i=1;i<=50;i++)assert.ok(all.includes(`Product ${i} `),`Missing row ${i}`);
  assert.ok(pages.filter(p=>p.includes('Particulars')).length>1);
  assert.ok(all.includes('Total Payable Amount'));
  assert.ok(all.includes(`Page ${pages.length} of ${pages.length}`));
});
test('delivery challan uses the same reference letterhead without monetary totals',async()=>{
  const pages=await contents(createPDF({...base,type:'Delivery Challan',data:{...base.data,type:'Delivery Challan'}},assets));
  assert.ok(pages[0].includes('DELIVERY CHALLAN'));
  assert.ok(!pages.join(' ').includes('Total Payable Amount'));
  assert.ok(!pages.join(' ').includes('Amount (INR)'));
});
