import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';
import {totals,words} from '../shared/billing.js';

export const company={
  name:'Ruby Hydraulic Co.',
  address:['823, Kalamboli Steel Market, Near Disma Kata,','Kalamboli Service Road No.8, Navi Mumbai-410 218'],
  gst:'27AYYPS6944F1ZH',
  bank:['Ruby Hydraulic Co.','922030067831478','UTIB0001965','Kalamboli Navi Mumbai','Current','AXIS Bank Limited'],
  terms:'All Disputes are Subject to Mumbai jurisdiction Only.',
};

let assetsPromise;
export function loadPDFAssets(){
  if(!assetsPromise){
    const files={letterhead:'letterhead.png',watermark:'watermark.png',footer:'footer.png',regular:'reference-regular.ttf',bold:'reference-bold.ttf'};
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

// All measurements are PDF points, matching the client's A4 reference.
export function createPDF(doc,assets){
  if(!assets)throw Error('Invoice branding must be loaded before creating a PDF.');
  const pdf=new jsPDF({unit:'pt',format:'a4',compress:true,putOnlyUsedFonts:true});
  pdf.addFileToVFS('reference-regular.ttf',assets.regular);
  pdf.addFileToVFS('reference-bold.ttf',assets.bold);
  pdf.addFont('reference-regular.ttf','Reference','normal');
  pdf.addFont('reference-bold.ttf','Reference','bold');
  const data=doc.data,client=doc.client,total=totals(data),challan=doc.type==='Delivery Challan';
  const left=11.25,right=584.03,width=right-left,red=[244,48,50],gray=[86,86,86];
  const cash=n=>Number(n||0).toFixed(2);
  const text=(value,x,y,size=9,bold=false,options={})=>{
    pdf.setFont('Reference',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(...gray);
    pdf.text(Array.isArray(value)?value:String(value),x,y,options);
  };
  function background(){
    pdf.addImage(assets.watermark,'PNG',0,0,750,750,'watermark','FAST');
    pdf.addImage(assets.letterhead,'PNG',0,23.77,595.28,77.349,'letterhead','FAST');
  }
  background();
  pdf.internal.events.subscribe('addPage',()=>{
    background();
    text(`${doc.type} No : ${doc.number}`,right,119.18,9,false,{align:'right'});
  });
  const title={Invoice:'TAX Invoice',Proforma:'PROFORMA Invoice',Quotes:'QUOTATION','Delivery Challan':'DELIVERY CHALLAN'}[doc.type]||doc.type;
  text(title,right,119.18,doc.type==='Invoice'?22.5:19,true,{align:'right'});
  text(`Challan No. : ${data.challanNo||''}`,right,139.71,9,false,{align:'right'});
  text(`P.O. No. : ${data.poNo||''}`,right,154.11,9,false,{align:'right'});
  text('From,',left,132.77,9.75,true);
  text(company.name,left,148.02,11.25,true);
  text(company.address[0],left,160.63);
  text(company.address[1],left,175.03);
  text(`GSTIN: ${company.gst}`,left,189.43);
  text('To,',left,221.49,9.75,true);
  pdf.setFont('Reference','bold');pdf.setFontSize(11.25);
  const names=pdf.splitTextToSize(client.company.toUpperCase(),width);
  text(names,left,236,11.25,true,{lineHeightFactor:1.29});
  const nameExtra=(names.length-1)*14.51;
  pdf.setFont('Reference','normal');pdf.setFontSize(9);
  const address=[client.address,client.city].filter(Boolean).join(', ')+(client.pincode?`-${client.pincode}`:'');
  const addresses=pdf.splitTextToSize(address,Math.min(405,width));
  text(addresses,left,248.61+nameExtra,9,false,{lineHeightFactor:1.6});
  const extra=nameExtra+(addresses.length-1)*14.4;
  const state=client.state||'',stateCode=(client.gst||'').slice(0,2);
  text(`State: ${state}   State Code: ${stateCode}`,left,263.01+extra);
  text(`GSTIN: ${client.gst||''}`,left,277.41+extra);
  text(`Place Of Supply: ${state}`,left,291.81+extra);
  text('Original For Recipient',right,249.83+extra,11.25,true,{align:'right'});
  pdf.setDrawColor(...gray);pdf.setLineWidth(.45);
  const recipientWidth=pdf.getTextWidth('Original For Recipient');
  pdf.line(right-recipientWidth,250.9+extra,right,250.9+extra);
  text(`${doc.type==='Invoice'?'Invoice':doc.type} No : ${doc.number}`,right,265.26+extra,9,false,{align:'right'});
  text(`Date : ${String(doc.date).slice(0,10)}`,right,279.66+extra,9,false,{align:'right'});

  const base={theme:'plain',tableWidth:width,margin:{left,right:11.25,top:133,bottom:128},rowPageBreak:'avoid',
    styles:{font:'Reference',fontStyle:'normal',fontSize:9,textColor:gray,fillColor:false,lineColor:red,lineWidth:.75,minCellHeight:14.55,cellPadding:{left:6.75,right:4,top:2,bottom:2},valign:'top',overflow:'linebreak'},
    headStyles:{font:'Reference',fontStyle:'bold',fontSize:7.5,textColor:[255,255,255],fillColor:[247,63,56],minCellHeight:31.2,cellPadding:{left:6.75,right:4,top:6.8,bottom:6.8}},
  };
  const columnWidths=challan?[25.22,332.81,95.75,119]:[25.22,255,77.81,68.94,57.22,88.59];
  autoTable(pdf,{...base,startY:301.43+extra,showHead:'everyPage',
    head:[challan?['Sr.\nNo.','Particulars','HSN','Quantity']:['Sr.\nNo.','Particulars','HSN','Quantity','Rate','Amount (INR)']],
    body:data.items.map((item,i)=>challan?[i+1,item.description,item.hsn,item.qty]:[i+1,item.description,item.hsn,item.qty,String(Number(item.rate)),cash(item.qty*item.rate)]),
    columnStyles:Object.fromEntries(columnWidths.map((cellWidth,i)=>[i,{cellWidth}])),
    willDrawCell:cell=>{
      if(cell.section!=='head')return;
      // Match the red-to-coral header in the reference without an image dependency.
      const {x,y,width:w,height:h}=cell.cell;
      for(let step=0;step<40;step++){
        const ratio=step/39;pdf.setFillColor(255-Math.round(18*ratio),34+Math.round(52*ratio),36+Math.round(33*ratio));
        pdf.rect(x,y+h*step/40,w,h/40+.1,'F');
      }
      cell.cell.styles.fillColor=false;
    },
  });
  if(!challan){
    const rows=[];
    if(Number(data.discount))rows.push([`Discount (${data.discount}%)`,cash(total.discount)]);
    rows.push(['Total Taxable Amount',cash(total.taxable)],
      [`CGST ${Number(data.cgst)?cash(data.cgst):''}%`,cash(total.cgst)],
      [`SGST ${Number(data.sgst)?cash(data.sgst):''}%`,cash(total.sgst)],
      [`IGST ${Number(data.igst)?cash(data.igst):''}%`,cash(total.igst)],
      ['Rounding Off',cash(data.rounding)],['Total Payable Amount',cash(total.total)],['GST Payable On Reverse Charges','No']);
    autoTable(pdf,{...base,startY:pdf.lastAutoTable.finalY,body:rows,columnStyles:{0:{cellWidth:484.19},1:{cellWidth:88.59}},didParseCell:cell=>{
      if(['Total Taxable Amount','Total Payable Amount'].includes(cell.row.raw[0])&&cell.column.index===1){cell.cell.styles.fontStyle='bold';if(cell.row.raw[0]==='Total Taxable Amount'){cell.cell.styles.fontSize=9.75;cell.cell.styles.minCellHeight=24.45;cell.cell.styles.valign='middle';}}
    }});
    const priceWords=words(total.total).replace(/ Hundred (?=\w)/g,' Hundred And ');
    autoTable(pdf,{...base,startY:pdf.lastAutoTable.finalY,body:[[
      {content:'Price in Words:',styles:{fontStyle:'bold',cellWidth:79.08,lineWidth:{top:.75,bottom:.75,left:.75,right:0},cellPadding:{left:6.75,right:0,top:2,bottom:2}}},
      {content:priceWords,styles:{lineWidth:{top:.75,bottom:.75,left:0,right:.75},cellPadding:{left:0,right:4,top:2,bottom:2}}},
    ]]});
  }
  let y=pdf.lastAutoTable.finalY;
  if(y+80>714){pdf.addPage();y=133;}
  text('Bank Details:',left,y+11,9.75,true);
  autoTable(pdf,{...base,startY:y+16,head:[['Account Name','Account Number','IFSC Code','Branch','Account Type','Bank Name']],body:[company.bank],
    styles:{...base.styles,fontSize:8.25,cellPadding:{left:6.75,right:3,top:6.58,bottom:6.58}},
    headStyles:{font:'Reference',fontStyle:'bold',fontSize:8.25,textColor:gray,fillColor:false,cellPadding:{left:6.75,right:3,top:6.58,bottom:6.58}},
    columnStyles:Object.fromEntries([83.7,83.54,63.02,191.6,69.33,81.59].map((cellWidth,i)=>[i,{cellWidth}]))});
  autoTable(pdf,{...base,startY:pdf.lastAutoTable.finalY+1,styles:{...base.styles,fontStyle:'bold',lineWidth:0,cellPadding:{left:0,right:0,top:2,bottom:2}},body:[['Terms And Conditions:'],[(data.terms||company.terms).split('\n').map(line=>'• '+line.replace(/^•\s*/, '')).join('\n')]]});
  const pages=pdf.getNumberOfPages();
  // The reference artwork contains both the signature and red contact strip.
  // Align it to the table margins, but reveal the signature on the final page only.
  const footerScale=width/924;
  const footerBottom=pdf.internal.pageSize.getHeight()-left;
  const artworkHeight=170*footerScale;
  const artworkTop=footerBottom-artworkHeight;
  const contactTop=artworkTop+119*footerScale;
  for(let p=1;p<=pages;p++){
    pdf.setPage(p);
    pdf.saveGraphicsState();
    if(p!==pages){
      pdf.rect(left,contactTop,width,footerBottom-contactTop,null);
      pdf.clip();pdf.discardPath();
    }
    pdf.addImage(assets.footer,'PNG',left,artworkTop,width,artworkHeight,'footer','FAST');
    pdf.restoreGraphicsState();
    if(pages>1)text(`Page ${p} of ${pages}`,right,contactTop-8,7,false,{align:'right'});
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
