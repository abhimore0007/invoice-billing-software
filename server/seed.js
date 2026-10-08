import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import bcrypt from 'bcryptjs';
const db=new PrismaClient();
if(!process.env.SEED_ADMIN_PASSWORD||process.env.SEED_ADMIN_PASSWORD.length<8)throw new Error('Set SEED_ADMIN_PASSWORD (8+ characters).');
try{await db.user.upsert({where:{username:'admin'},update:{},create:{name:'Alex Morgan',username:'admin',password:await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD,12),role:'Admin'}});console.log('Admin ready. Username: admin');}finally{await db.$disconnect();}
