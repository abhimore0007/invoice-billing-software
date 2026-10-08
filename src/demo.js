const today=new Date();
// Remove only the previously auto-generated sample; preserve user-created records.
export function removeSampleInvoice(store){
  const {sampleInvoiceVersion,...rest}=store;
  return {...rest,documents:store.documents.filter(doc=>doc.id!=='sample-industrial-50')};
}
const date=(days)=>{const d=new Date(today);d.setDate(d.getDate()-days);return d.toISOString().slice(0,10);};
export const demoClients=[
  {id:'c1',name:'Rahul Sharma',company:'Acme Industries',address:'24, Industrial Estate',city:'Mumbai',state:'Maharashtra',pincode:'400001',gst:'27AABCA1234A1Z5',phone:'9876543210',email:'accounts@acme.example'},
  {id:'c2',name:'Priya Patel',company:'Vertex Engineering',address:'18, MIDC Road',city:'Pune',state:'Maharashtra',pincode:'411001',gst:'27AABCV1234A1Z5',phone:'9876543211',email:'hello@vertex.example'},
  {id:'c3',name:'Amit Mehta',company:'Horizon Enterprises',address:'42, Business Park',city:'Ahmedabad',state:'Gujarat',pincode:'380001',gst:'24AABCH1234A1Z5',phone:'9876543212',email:'finance@horizon.example'},
  {id:'c4',name:'Neha Rao',company:'Nova Tech Solutions',address:'9, Technology Park',city:'Bengaluru',state:'Karnataka',pincode:'560001',gst:'29AABCN1234A1Z5',phone:'9876543213',email:'billing@nova.example'},
  {id:'c5',name:'Vikram Singh',company:'Atlas Manufacturing',address:'72, Industrial Road',city:'Delhi',state:'Delhi',pincode:'110001',gst:'07AABCA1234A1Z5',phone:'9876543214',email:'info@atlas.example'}
];
export function initialDemo(){const documents=Array.from({length:24},(_,i)=>{const client=demoClients[i%5],type=['Invoice','Invoice','Proforma','Quotes','Invoice','Delivery Challan'][i%6],total=[48500,32750,68200,24500,56700,0][i%6];const data={type,clientId:client.id,date:date(i*4),status:['Paid','Pending','Draft','Pending','Paid','Paid'][i%6],items:[{description:'Hydraulic power unit',hsn:'8412',qty:1,rate:total/1.18}],cgst:9,sgst:9,igst:0,discount:0,rounding:0,quotationNo:'',proformaNo:'',challanNo:'',poNo:'',poDate:'',vendorCode:'',transport:'',terms:'Payment due within 30 days. Thank you for your business.'};return {id:'d'+i,number:`${{Invoice:'INV',Proforma:'PRO',Quotes:'QUO','Delivery Challan':'DC'}[type]}-${today.getFullYear()}-${String(128-i).padStart(4,'0')}`,type,status:data.status,date:data.date,createdAt:data.date,total,clientId:client.id,client,data};});return {clients:demoClients,documents,users:[{id:'u1',name:'Alex Morgan',username:'admin',role:'Admin',enabled:true}]};}
