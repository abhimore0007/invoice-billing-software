export const types = ['Invoice', 'Proforma', 'Quotes', 'Delivery Challan'];
export const prefixes = {Invoice:'INV',Proforma:'PRO',Quotes:'QUO','Delivery Challan':'DC'};
export function totals(d) {
  const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const subtotal = round((d.items || []).reduce((s,i)=>s+round(Number(i.qty)*Number(i.rate)),0));
  const discount = round(subtotal * Number(d.discount || 0)/100);
  const taxable = round(subtotal-discount);
  const cgst = round(taxable * Number(d.cgst || 0)/100);
  const sgst = round(taxable * Number(d.sgst || 0)/100);
  const igst = round(taxable * Number(d.igst || 0)/100);
  return {subtotal,discount,taxable,cgst,sgst,igst,tax:round(cgst+sgst+igst),total:d.type==='Delivery Challan'?0:round(taxable+cgst+sgst+igst+Number(d.rounding||0))};
}
export const money = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(n||0));
export function words(value) {
  const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function spell(n){if(n<20)return ones[n];if(n<100)return tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');if(n<1000)return ones[Math.floor(n/100)]+' Hundred'+(n%100?' '+spell(n%100):'');for(const [unit,label] of [[10000000,'Crore'],[100000,'Lakh'],[1000,'Thousand']])if(n>=unit)return spell(Math.floor(n/unit))+' '+label+(n%unit?' '+spell(n%unit):'');}
  const paise=Math.round(Number(value)*100);return (spell(Math.floor(paise/100))||'Zero')+' Rupees'+(paise%100?' and '+spell(paise%100)+' Paise':'')+' Only';
}
