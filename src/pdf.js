import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';
import {totals,words} from '../shared/billing.js';

export const company={
  name:'Ruby Hydraulic Co.',
  address:['823, Kalamboli Steel Market, Near Disma Kata,','Kalamboli Service Road No.8,','Navi Mumbai - 410 218'],
  gst:'27AYYPS6944F1ZH',
  bank:['Ruby Hydraulic Co.','922030067831478','UTIB0001965','Kalamboli, Navi Mumbai','Current','AXIS Bank\nLimited'],
  terms:'All disputes are subject to Mumbai jurisdiction only.',
};

let assetsPromise;
export function loadPDFAssets(){
  if(!assetsPromise){
    const files={logo:'v6-logo.png',regular:'reference-regular.ttf',bold:'reference-bold.ttf'};
    assetsPromise=Promise.all(Object.entries(files).map(async([key,file])=>{
      const response=await fetch(`/branding/${file}`);
      if(!response.ok)throw Error(`Cannot load invoice branding (${file}). Refresh and try again.`);
      const buffer=new Uint8Array(await response.arrayBuffer());
      let binary='';for(let i=0;i<buffer.length;i+=8192)binary+=String.fromCharCode(...buffer.subarray(i,i+8192));
      return [key,btoa(binary)];
    })).then(Object.fromEntries).catch(error=>{assetsPromise=null;throw error});
  }
  return assetsPromise;
}

// A4 coordinates and typography follow Invoice_RHC-26-27-602_v6.pdf.
export function createPDF(doc,assets){
  if(!assets?.logo)throw Error('Invoice branding must be loaded before creating a PDF.');
  const pdf=new jsPDF({unit:'pt',format:'a4',compress:true,putOnlyUsedFonts:true});
  pdf.addFileToVFS('reference-regular.ttf',assets.regular);
  pdf.addFileToVFS('reference-bold.ttf',assets.bold);
  pdf.addFont('reference-regular.ttf','Reference','normal');
  pdf.addFont('reference-bold.ttf','Reference','bold');
  const {data,client}=doc,total=totals(data),challan=doc.type==='Delivery Challan';
  const left=40,right=555.28,width=right-left,height=pdf.internal.pageSize.getHeight();
  const ink=[46,55,67],muted=[113,118,128],red=[153,29,51],line=[207,209,214],panel=[243,244,246];
  const cash=n=>Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
  const text=(value,x,y,size=9,bold=false,options={},color=ink)=>{
    const content=Array.isArray(value)?value:String(value);
    // Keep the reference's Helvetica metrics; retain Unicode support for client data.
    pdf.setFont(/[^\x20-\x7e\n]/.test(String(content))?'Reference':'helvetica',bold?'bold':'normal');
    pdf.setFontSize(size);pdf.setTextColor(...color);pdf.text(content,x,y,options);
  };
  const wrap=(value,max,size=9,bold=false)=>{
    pdf.setFont(/[^\x20-\x7e\n]/.test(String(value))?'Reference':'helvetica',bold?'bold':'normal');pdf.setFontSize(size);
    return pdf.splitTextToSize(String(value||''),max);
  };
  const rule=(y,color=line,x=left,end=right)=>{pdf.setDrawColor(...color);pdf.setLineWidth(.6);pdf.line(x,y,end,y);};
  const title={Invoice:'TAX INVOICE',Proforma:'PROFORMA INVOICE',Quotes:'QUOTATION','Delivery Challan':'DELIVERY CHALLAN'}[doc.type]||doc.type;
  function background(){
    pdf.setFillColor(...red);pdf.rect(0,0,595.28,10,'F');pdf.rect(0,height-10,595.28,10,'F');
    pdf.saveGraphicsState();pdf.setGState(new pdf.GState({opacity:.055}));
    pdf.addImage(assets.logo,'PNG',108,420,370,89,'logo','FAST');pdf.restoreGraphicsState();
    pdf.addImage(assets.logo,'PNG',40,47,187,45,'logo','FAST');
    text(title,right,58,title.length>16?18:24,true,{align:'right'});
    text('Original For Recipient',right,76,8.5,false,{align:'right'},muted);
    text('ISO 9001 : 2015 Certified',right,89,8.5,false,{align:'right'},muted);
    rule(108);
  }
  background();
  pdf.internal.events.subscribe('addPage',()=>{background();text(`${doc.type} No. ${doc.number}`,right,126,9,true,{align:'right'});});
  const state=client.state||'',stateCode=(client.gst||'').slice(0,2);
  const supply=state+(stateCode?` (State Code ${stateCode})`:'');
  const date=new Date(String(doc.date).slice(0,10)+'T00:00:00Z');
  const formattedDate=Number.isNaN(date.getTime())?String(doc.date):date.toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'});
  const meta=[['INVOICE NO.',doc.number,40,140],['INVOICE DATE',formattedDate,190,130],['PLACE OF SUPPLY',supply,330,130],['REVERSE CHARGE','No',470,85]];
  let metaBottom=140;
  for(const [label,value,x,w] of meta){
    text(label==='INVOICE NO.'&&doc.type!=='Invoice'?`${doc.type.toUpperCase()} NO.`:label,x,124,7,true,{},muted);
    const lines=wrap(value,w,10.5,true);text(lines,x,139,10.5,true,{lineHeightFactor:1.2});metaBottom=Math.max(metaBottom,139+(lines.length-1)*12.6);
  }
  rule(metaBottom+13);
  const panelY=metaBottom+29,panelWidth=250;
  const name=wrap(client.company.toUpperCase(),222,10.5,true);
  const address=wrap([client.address,client.city].filter(Boolean).map(v=>v.replace(/[,\s]+$/,'')).join(client.city?'\n':'')+(client.pincode?` - ${client.pincode}`:''),222,8.5);
  const stateLines=wrap(`State: ${state} | State Code: ${stateCode}`,222,8.5);
  const panelHeight=Math.max(108,32+name.length*13+address.length*11.5+stateLines.length*11.5+15);
  for(const x of [left,306]){pdf.setFillColor(...panel);pdf.rect(x,panelY,panelWidth,panelHeight,'F');pdf.setFillColor(...red);pdf.rect(x,panelY,3.5,panelHeight,'F');}
  text('BILLED BY',54,panelY+16,7.5,true,{},red);text('BILLED TO',320,panelY+16,7.5,true,{},red);
  text(company.name,54,panelY+32,10.5,true);
  text(company.address,54,panelY+45,8.5,false,{lineHeightFactor:1.35});
  text(`GSTIN: ${company.gst}`,54,panelY+79,8.5);
  let cy=panelY+32;text(name,320,cy,10.5,true,{lineHeightFactor:1.24});cy+=name.length*13;
  text(address,320,cy,8.5,false,{lineHeightFactor:1.35});cy+=address.length*11.5;
  text(stateLines,320,cy,8.5,false,{lineHeightFactor:1.35});cy+=stateLines.length*11.5;
  text(`GSTIN: ${client.gst||''}`,320,cy,8.5);
  let tableY=panelY+panelHeight+24;
  const references=[['Challan No.',data.challanNo],['P.O. No.',data.poNo]].filter(([,value])=>value);
  if(references.length){text(references.map(([label,value])=>`${label}: ${value}`).join('    '),left,tableY,8);tableY+=14;}
  const base={theme:'plain',tableWidth:width,margin:{left,right:40,top:143,bottom:85},rowPageBreak:'avoid',
    styles:{font:'helvetica',fontStyle:'normal',fontSize:9,textColor:ink,fillColor:false,lineColor:line,lineWidth:{bottom:.5},cellPadding:{left:8,right:8,top:5.4,bottom:5.4},valign:'middle',overflow:'linebreak'},
    headStyles:{fontStyle:'bold',fontSize:8.5,textColor:[255,255,255],fillColor:ink,lineWidth:0,cellPadding:{left:4,right:8,top:9,bottom:9}},
    didParseCell:cell=>{if(/[^\x20-\x7e\n]/.test(cell.cell.text.join('')))cell.cell.styles.font='Reference';},
  };
  autoTable(pdf,{...base,startY:tableY,showHead:'everyPage',head:[challan?['Sr. No.','Particulars','HSN','Qty']:['Sr. No.','Particulars','HSN','Qty','Rate (INR)','Amount (INR)']],
    theme:'grid',styles:{...base.styles,lineWidth:.6},headStyles:{...base.headStyles,lineWidth:.6,lineColor:line},
    body:data.items.map((item,i)=>challan?[i+1,item.description,item.hsn,item.qty]:[i+1,item.description,item.hsn,item.qty,cash(item.rate),cash(item.qty*item.rate)]),
    columnStyles:challan?{0:{cellWidth:34,halign:'center'},1:{cellWidth:335},2:{cellWidth:86,halign:'center'},3:{cellWidth:width-455,halign:'center'}}:
      {0:{cellWidth:34,halign:'center'},1:{cellWidth:220},2:{cellWidth:60,halign:'center'},3:{cellWidth:48,halign:'center'},4:{cellWidth:70,halign:'right'},5:{cellWidth:width-432,halign:'right'}},
    didParseCell:cell=>{
      base.didParseCell(cell);
      if(cell.section==='head'){
        cell.cell.styles.halign=cell.column.index===1?'left':cell.column.index>=4?'right':'center';
        if(cell.column.index===0)cell.cell.styles.cellPadding={left:2,right:2,top:9,bottom:9};
      }else cell.cell.styles.cellPadding={left:8,right:8,top:6.5,bottom:6.5};
    },
  });
  if(!challan){
    const rows=[];
    if(Number(data.discount))rows.push([`Discount (${data.discount}%)`,cash(total.discount)]);
    rows.push(['Total Taxable Amount',cash(total.taxable)],
      [`CGST ${Number(data.cgst)?Number(data.cgst).toFixed(2):''}%`,cash(total.cgst)],
      [`SGST ${Number(data.sgst)?Number(data.sgst).toFixed(2):''}%`,cash(total.sgst)],
      [`IGST ${Number(data.igst)?Number(data.igst).toFixed(2):''}%`,cash(total.igst)],
      ['Rounding Off',cash(data.rounding)],['TOTAL PAYABLE AMOUNT',`INR ${cash(total.total)}`],['GST Payable On Reverse Charges','No']);
    autoTable(pdf,{...base,startY:pdf.lastAutoTable.finalY,body:rows,columnStyles:{0:{cellWidth:width-125},1:{cellWidth:125,halign:'right'}},didParseCell:cell=>{
      const label=cell.row.raw[0];
      if(label==='Total Taxable Amount')cell.cell.styles.fontStyle='bold';
      if(label==='TOTAL PAYABLE AMOUNT')Object.assign(cell.cell.styles,{fontStyle:'bold',fontSize:11,textColor:red,fillColor:[250,234,237],lineColor:red,lineWidth:{top:1,bottom:1},cellPadding:{left:8,right:8,top:7,bottom:7}});
      if((label.startsWith('CGST')&&!Number(data.cgst))||(label.startsWith('SGST')&&!Number(data.sgst))||label==='Rounding Off')cell.cell.styles.textColor=muted;
    }});
    const priceWords=words(total.total).replace(/ Hundred (?=\w)/g,' Hundred And ');
    autoTable(pdf,{...base,startY:pdf.lastAutoTable.finalY,styles:{...base.styles,fillColor:panel,lineColor:ink},body:[[
      {content:'Price in Words:',styles:{fontStyle:'bold',cellWidth:76,cellPadding:{left:8,right:0,top:7,bottom:7}}},
      {content:priceWords,styles:{cellPadding:{left:0,right:8,top:7,bottom:7}}},
    ]]});
  }
  let y=pdf.lastAutoTable.finalY;
  // Keep bank details and the final sign-off together where possible.
  const terms=wrap((data.terms||company.terms).split('\n').map((v,i)=>`${i+1}. ${v.replace(/^[•\d.\s]+/,'')}`).join('\n'),305,8.5);
  const signoffHeight=Math.max(88,terms.length*11+34);
  if(y+105+signoffHeight>height-90){pdf.addPage();y=143;}
  text('BANK DETAILS',left,y+26,8.5,true);
  autoTable(pdf,{...base,startY:y+36,head:[['Account Name','Account Number','IFSC Code','Branch','Account Type','Bank Name']],body:[company.bank],
    styles:{...base.styles,fontSize:8.5,fillColor:panel,cellPadding:{left:7,right:4,top:7,bottom:7}},
    headStyles:{...base.headStyles,fontSize:7.4,cellPadding:{left:7,right:3,top:7,bottom:7}},
    columnStyles:Object.fromEntries([100,105,70,110,65,width-450].map((cellWidth,i)=>[i,{cellWidth,fontStyle:i<3?'bold':'normal'}]))});
  y=pdf.lastAutoTable.finalY+30;
  if(y+66>height-85){pdf.addPage();y=155;}
  text('TERMS & CONDITIONS',left,y,8.5,true);
  // AutoTable allows unusually long terms to continue safely across pages.
  autoTable(pdf,{...base,startY:y+4,tableWidth:305,styles:{...base.styles,fontSize:8.5,lineWidth:0,cellPadding:0},body:terms.map(term=>[term])});
  const end=pdf.lastAutoTable.finalY;
  if(end+64>height-85){pdf.addPage();y=155;}else y=Math.max(y,end-14);
  text(`For ${company.name}`,right,y,9,true,{align:'right'});
  pdf.setFont('helvetica','italic');pdf.setFontSize(10.5);pdf.setTextColor(...ink);pdf.text('Mohd Alam N Shaikh',460,y+36,{align:'center'});
  text('Digitally signed by Mohd Alam N Shaikh',460,y+46,6,false,{align:'center'},muted);
  rule(y+54,ink,365,right);text('Authorized Signatory',460,y+66,8.5,true,{align:'center'});
  pdf.setFont('helvetica','italic');pdf.setFontSize(9);pdf.setTextColor(...muted);pdf.text('Thank you for your business.',left,y+62);
  const pages=pdf.getNumberOfPages();
  for(let p=1;p<=pages;p++){
    pdf.setPage(p);rule(height-62);
    text('823, Kalamboli Steel Market, Near Disma Kanta, Service Road No. 8, Kalamboli, Navi Mumbai - 410 218',297.64,height-48,8,false,{align:'center'},muted);
    text('Tel: 27426680   |   Mo: 9892095068 / 9920905068   |   info@rubyhydraulic.com   |   www.rubyhydraulic.com',297.64,height-36,8,false,{align:'center'},muted);
    if(pages>1)text(`Page ${p} of ${pages}`,right,height-69,7,false,{align:'right'},muted);
  }
  return pdf;
}

export async function downloadPDF(doc){
  try{
    const assets=await loadPDFAssets();
    createPDF(doc,assets).save(doc.number.replace(/[\\/]/g,'-')+'.pdf');
    return true;
  }catch(error){
    window.dispatchEvent(new CustomEvent('ruby-error',{detail:error.message}));
    return false;
  }
}
