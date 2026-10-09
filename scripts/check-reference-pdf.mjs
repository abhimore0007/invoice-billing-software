import fs from 'node:fs';
import {createPDF,company} from '../src/pdf.js';
const assets=Object.fromEntries(Object.entries({logo:'v6-logo.png',regular:'reference-regular.ttf',bold:'reference-bold.ttf'}).map(([key,file])=>[key,fs.readFileSync('public/branding/'+file).toString('base64')]));
const client={company:'JINDAL INFRASTRUCTURES PRIVATE LIMITED',address:'2nd Floor, Plot No-89, D-Block, Kamla Nagar,',city:'North Delhi',pincode:'110007',state:'Delhi',gst:'07AABCJ3327M1ZH'};
const data={type:'Invoice',items:[{description:'1/2" R3 3600 MM ONLY HOSE-PARKER',hsn:'40092100',qty:2,rate:1500},{description:'3/8" NPT MALE ONLY FITTINGS',hsn:'40092200',qty:1,rate:150}],cgst:0,sgst:0,igst:18,discount:0,rounding:0,terms:company.terms};
const pdf=createPDF({type:'Invoice',number:'RHC-26/27/-602',date:'2026-10-06',client,data},assets);
const destination=process.argv[2];
if(destination)fs.writeFileSync(destination,Buffer.from(pdf.output('arraybuffer')));
console.log('Reference reproduction generated:',pdf.getNumberOfPages(),'page(s).');
