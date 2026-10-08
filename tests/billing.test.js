import test from 'node:test';
import assert from 'node:assert/strict';
import {totals,words} from '../shared/billing.js';
test('GST is calculated on the discounted taxable amount',()=>{const result=totals({type:'Invoice',items:[{qty:2,rate:1000},{qty:1,rate:500}],discount:10,cgst:9,sgst:9,rounding:0});assert.equal(result.taxable,2250);assert.equal(result.cgst,202.5);assert.equal(result.total,2655);});
test('IGST, fractional quantities and rounding',()=>{const result=totals({type:'Invoice',items:[{qty:1.5,rate:100}],igst:18,rounding:-.5});assert.equal(result.total,176.5);});
test('Delivery challans carry no financial total',()=>assert.equal(totals({type:'Delivery Challan',items:[{qty:5,rate:100}],cgst:9,sgst:9}).total,0));
test('Rounded displayed tax components reconcile with the payable total',()=>{const result=totals({type:'Invoice',items:[{qty:1,rate:10.05}],cgst:9,sgst:9});assert.equal(result.cgst,.9);assert.equal(result.sgst,.9);assert.equal(result.total,11.85);});
test('Indian amount in words handles zero, lakh, crore and paise',()=>{assert.equal(words(0),'Zero Rupees Only');assert.equal(words(125000.25),'One Lakh Twenty Five Thousand Rupees and Twenty Five Paise Only');assert.equal(words(10000000),'One Crore Rupees Only');assert.equal(words(1.999),'Two Rupees Only');});
