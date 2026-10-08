import fs from 'node:fs';
import path from 'node:path';
import {createCanvas,DOMMatrix,ImageData,Path2D} from '@napi-rs/canvas';
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const {getDocument,OPS}=await import('pdfjs-dist/legacy/build/pdf.mjs');
const source=process.argv[2];
const inspect=process.argv.includes('--inspect');
if(!source)throw Error('Usage: node scripts/extract-reference.mjs <reference.pdf>');
const loadingTask=getDocument({data:new Uint8Array(fs.readFileSync(source)),useSystemFonts:true,fontExtraProperties:true});
const pdf=await loadingTask.promise;
const page=await pdf.getPage(1);
console.log('Reference page:',page.view);
const operators=await page.getOperatorList();
let matrix=new DOMMatrix(page.getViewport({scale:1}).transform);const stack=[];
for(let i=0;inspect&&i<operators.fnArray.length;i++){
  const op=operators.fnArray[i],args=operators.argsArray[i];
  if(op===OPS.save)stack.push(matrix);
  else if(op===OPS.restore)matrix=stack.pop()||matrix;
  else if(op===OPS.transform)matrix=matrix.multiply(new DOMMatrix(args));
  else if(op===OPS.paintImageXObject)console.log('IMAGE PLACEMENT',args[0],{x:matrix.e,y:matrix.f+matrix.d,width:matrix.a,height:-matrix.d});
  else if(op===OPS.setGState)console.log('GRAPHICS STATE',JSON.stringify(args));
}
for(let i=0;inspect&&i<operators.fnArray.length;i++){
  const name=Object.keys(OPS).find(key=>OPS[key]===operators.fnArray[i]);
  if(/Image|FillColorN|Pattern/.test(name))console.log('Image/pattern operation:',name,JSON.stringify(operators.argsArray[i],(key,value)=>ArrayBuffer.isView(value)?`<${value.constructor.name} length=${value.length}>`:value).slice(0,1600));
}
const imageIds=[];
function collectImages(list){for(let i=0;i<list.fnArray.length;i++){if(list.fnArray[i]===OPS.paintImageXObject)imageIds.push(list.argsArray[i][0]);if(list.fnArray[i]===OPS.setFillColorN&&list.argsArray[i][0]==='TilingPattern')collectImages(list.argsArray[i][2]);}}
collectImages(operators);
for(const id of [...new Set(imageIds)]){
  const image=await new Promise(resolve=>page.objs.get(id,resolve));
  const canvas=createCanvas(image.width,image.height),ctx=canvas.getContext('2d');
  if(image.bitmap)ctx.drawImage(image.bitmap,0,0);
  else{
    const pixels=new Uint8ClampedArray(image.width*image.height*4);
    for(let p=0;p<image.width*image.height;p++){
      if(image.kind===3){for(let c=0;c<4;c++)pixels[p*4+c]=image.data[p*4+c];}
      else if(image.kind===2){for(let c=0;c<3;c++)pixels[p*4+c]=image.data[p*3+c];pixels[p*4+3]=255;}
      else{const stride=Math.ceil(image.width/8),x=p%image.width,y=Math.floor(p/image.width);const v=(image.data[y*stride+(x>>3)]>>(7-(x%8)))&1;pixels.fill(v?255:0,p*4,p*4+3);pixels[p*4+3]=255;}
    }
    ctx.putImageData(new ImageData(pixels,image.width,image.height),0,0);
  }
  const filename=id==='img_p0_1'?'watermark.png':id==='img_p0_2'?'footer.png':'letterhead.png';
  fs.writeFileSync(path.join('public/branding',filename),canvas.toBuffer('image/png'));
  console.log(filename,image.width,image.height);
}
const text=await page.getTextContent();
if(inspect)for(const item of text.items)if(item.str.trim())console.log('TEXT',JSON.stringify(item.str),'x',item.transform[4].toFixed(2),'yFromTop',(841.89-item.transform[5]).toFixed(2),'size',item.transform[0].toFixed(2),'font',item.fontName);
if(inspect)console.log('Fonts:',text.styles);
// PDF.js font data remaps glyphs for its renderer. Use the complete, same-family
// font files instead, so jsPDF can encode all dynamic text correctly.
fs.copyFileSync('node_modules/dejavu-fonts-ttf/ttf/DejaVuSansCondensed.ttf','public/branding/reference-regular.ttf');
fs.copyFileSync('node_modules/dejavu-fonts-ttf/ttf/DejaVuSansCondensed-Bold.ttf','public/branding/reference-bold.ttf');
fs.copyFileSync('node_modules/dejavu-fonts-ttf/LICENSE','public/branding/FONT-LICENSE.txt');
for(const obsolete of ['reference-image-1.png','reference-image-2.png']){
  const file=path.join('public/branding',obsolete);if(fs.existsSync(file))fs.unlinkSync(file);
}
await loadingTask.destroy();
