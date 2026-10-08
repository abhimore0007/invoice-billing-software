import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareDemoUser,authenticateDemo} from '../src/demoAuth.js';

test('demo user updates retain credentials, reject duplicate names, and enforce enabled access',async()=>{
  const account=await prepareDemoUser({id:'staff',name:'Staff',username:'staff',role:'Staff',enabled:true,password:'ExamplePass123!'},[]);
  assert.equal(account.password,undefined);
  const edited=await prepareDemoUser({...account,name:'Updated Staff',password:''},[account]);
  assert.equal(edited.passwordHash,account.passwordHash);
  await assert.rejects(prepareDemoUser({...account,id:'duplicate',username:'STAFF',password:'AnotherPass123!'},[account]),/already exists/);
  const oldStorage=globalThis.localStorage;
  let users=[edited];
  globalThis.localStorage={getItem:()=>JSON.stringify({users})};
  try{
    const session=await authenticateDemo('staff','ExamplePass123!');
    assert.equal(session.user.name,'Updated Staff');assert.equal(session.user.passwordHash,undefined);
    users=[{...edited,enabled:false}];
    await assert.rejects(authenticateDemo('staff','ExamplePass123!'),/disabled/);
    users=[{...edited,passwordHash:undefined}];
    await assert.rejects(authenticateDemo('staff','ExamplePass123!'),/no saved password/);
  }finally{
    if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;
  }
});
