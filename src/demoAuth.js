import bcrypt from 'bcryptjs';

export async function prepareDemoUser(data,users){
  const username=data.username.trim();
  if(users.some(u=>u.id!==data.id&&u.username.toLowerCase()===username.toLowerCase()))throw Error('That username already exists. Choose a different username.');
  const previous=users.find(u=>u.id===data.id);
  if(!data.password&&!previous?.passwordHash)throw Error('Set a password of at least 8 characters for this account.');
  if(data.password&&data.password.length<8)throw Error('Password must contain at least 8 characters.');
  const {password,...user}=data;
  return {...user,username,passwordHash:password?await bcrypt.hash(password,10):previous.passwordHash};
}

export async function authenticateDemo(username,password){
  const store=JSON.parse(localStorage.getItem('ruby-demo')||'{"users":[]}');
  const user=store.users.find(u=>u.username.toLowerCase()===username.trim().toLowerCase());
  if(!user)throw Error('Invalid username or password for this browser’s demo workspace.');
  if(!user.enabled)throw Error('Your account is disabled. Ask your administrator to enable it.');
  if(!user.passwordHash)throw Error('This older demo account has no saved password. Open Explore demo, then Users → Edit, set a new password and save.');
  if(!await bcrypt.compare(password,user.passwordHash))throw Error('Invalid username or password.');
  const {passwordHash,...publicUser}=user;
  return {mode:'demo',user:publicUser};
}
