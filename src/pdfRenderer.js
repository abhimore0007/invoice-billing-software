import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist/build/pdf.mjs';
import workerURL from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc=workerURL;

export function renderPDF(buffer,container){
  let cancelled=false;
  const loadingTask=getDocument({data:new Uint8Array(buffer)});
  const ready=loadingTask.promise.then(async pdf=>{
    for(let number=1;number<=pdf.numPages;number++){
      if(cancelled)return;
      const page=await pdf.getPage(number);
      if(cancelled)return;
      const viewport=page.getViewport({scale:1.5});
      const canvas=document.createElement('canvas');
      canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      canvas.setAttribute('aria-label',`Invoice page ${number} of ${pdf.numPages}`);
      container.appendChild(canvas);
      await page.render({canvas,viewport}).promise;
    }
  });
  return {ready,destroy(){cancelled=true;loadingTask.destroy();container.replaceChildren()}};
}
