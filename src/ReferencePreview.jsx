import React,{useEffect,useRef,useState} from 'react';
import {Download,LoaderCircle,Pencil} from 'lucide-react';
import {createPDF,loadPDFAssets} from './pdf';

export default function ReferencePreview({doc,onEdit}){
  const [ready,setReady]=useState(false),[error,setError]=useState('');
  const container=useRef(null),documentRef=useRef(null);
  useEffect(()=>{
    let cancelled=false,renderer;
    setReady(false);setError('');documentRef.current=null;
    Promise.all([loadPDFAssets(),import('./pdfRenderer')]).then(async([assets,{renderPDF}])=>{
      if(cancelled)return;
      const pdf=createPDF(doc,assets);
      documentRef.current=pdf;
      renderer=renderPDF(pdf.output('arraybuffer'),container.current);
      await renderer.ready;
      if(!cancelled)setReady(true);
    }).catch(e=>{if(!cancelled)setError(e.message)});
    return()=>{cancelled=true;renderer?.destroy()};
  },[doc]);
  return <><div className="preview-actions"><span className={'badge '+doc.status.toLowerCase()}><span/>{doc.status}</span><button className="btn compact" onClick={onEdit}><Pencil size={14}/>Edit</button><button className="btn primary compact" disabled={!ready} onClick={()=>documentRef.current.save(doc.number.replace(/[\\/]/g,'-')+'.pdf')}><Download size={14}/>Download PDF</button></div>
    {error?<div className="form-error" role="alert">{error}</div>:!ready&&<div className="empty-state"><LoaderCircle className="spin" size={28}/><p>Preparing your invoice preview…</p></div>}
    <div className="reference-pdf-preview" ref={container} aria-label="Invoice PDF preview"/>
    <details className="preview-document-details"><summary>{doc.number} · {doc.client.company} · {doc.data.items.length} items</summary><ul>{doc.data.items.map((item,i)=><li key={i}>{i+1}. {item.description} · HSN {item.hsn} · Qty {item.qty}</li>)}</ul></details>
  </>;
}
