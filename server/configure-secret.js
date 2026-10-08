import {randomBytes} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {parse} from 'dotenv';

const file=new URL('../.env',import.meta.url);
const current=existsSync(file)?readFileSync(file,'utf8'):'';
if((parse(current).JWT_SECRET||'').length>=32){
  console.log('JWT_SECRET is already configured. No changes made.');
}else{
  const setting=`JWT_SECRET="${randomBytes(48).toString('hex')}"`;
  const updated=/^\s*(?:export\s+)?JWT_SECRET\s*=.*$/m.test(current)
    ?current.replace(/^\s*(?:export\s+)?JWT_SECRET\s*=.*$/gm,setting)
    :current+(current&&!current.endsWith('\n')?'\n':'')+setting+'\n';
  writeFileSync(file,updated,{mode:0o600});
  console.log('A secure JWT_SECRET has been configured. Existing settings were preserved. Restart the API to apply it.');
}
