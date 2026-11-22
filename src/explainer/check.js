const RH = require('./lib.js');
const zeros = require('./zeros.json');
const o=[0,0];
console.log('zeta(2)', RH.zeta(2,0,o)[0], Math.PI**2/6);
console.log('zeta(.5+10i)', RH.zeta(.5,10,[0,0]));
console.log('zeta(.5)', RH.zeta(.5,0,[0,0]));
let worst=0; for (const g of zeros) { if (g>60) break; RH.zeta(.5,g,o); worst=Math.max(worst,Math.hypot(o[0],o[1])); }
console.log('max |zeta| at zeros<60:', worst);
console.log('zeta(.5+60i)', RH.zeta(.5,60,[0,0]), 'zeta(.3+47i)', RH.zeta(.3,47,[0,0]), 'zeta(.9+33i)', RH.zeta(.9,33,[0,0]));
const T = RH.tables(1e6);
console.log('pi(1e6)', T.pi[1e6], 'psi(1e6)', T.psi[1e6], 'psi(10)', T.psi[10], Math.log(2520));
console.log('li(1e6)', RH.li(1e6), 'Li', RH.li(1e6)-RH.LI2, 'x/lnx', 1e6/Math.log(1e6));
// explicit formula check
function psi0(x,K){ const u=Math.log(x), r=Math.sqrt(x); let s=x-Math.log(2*Math.PI)-0.5*Math.log(1-1/(x*x)); for(let k=0;k<K;k++){const g=zeros[k]; s-=2*r*(0.5*Math.cos(g*u)+g*Math.sin(g*u))/(0.25+g*g);} return s; }
for (const x of [10.5, 20.5, 50.5, 99.5]) console.log('x',x,'psi',T.psi[Math.floor(x)].toFixed(4),'K=100',psi0(x,100).toFixed(4),'K=600',psi0(x,600).toFixed(4));
// normalized error extremes
let mx=-9,mn=9,ax=0,an=0; for(let n=100;n<1e6;n++){ const r=Math.sqrt(n); const hi=(T.psi[n]-n)/r, lo=(T.psi[n]-(n+1))/r; if(hi>mx){mx=hi;ax=n} if(lo<mn){mn=lo;an=n} }
console.log('E range on [100,1e6]:', mn, an, mx, ax);
// path bounds
for (const sg of [0.3,0.5,0.8]) { let a=[9,-9,9,-9], m=0; for(let t=0;t<=60;t+=0.02){ RH.zeta(sg,t,o); if(t>=0){a[0]=Math.min(a[0],o[0]);a[1]=Math.max(a[1],o[0]);a[2]=Math.min(a[2],o[1]);a[3]=Math.max(a[3],o[1]);} } console.log('sigma',sg,'bounds t>=0',a.map(v=>v.toFixed(2)).join(' ')); let b=[9,-9,9,-9]; for(let t=4;t<=60;t+=0.02){ RH.zeta(sg,t,o); b[0]=Math.min(b[0],o[0]);b[1]=Math.max(b[1],o[0]);b[2]=Math.min(b[2],o[1]);b[3]=Math.max(b[3],o[1]);} console.log('   t>=4',b.map(v=>v.toFixed(2)).join(' ')); }
// min |zeta| for sigma=0.6 over t in [0,60]
for (const sg of [0.45,0.55,0.6,0.7]) { let m=9,tm=0; for(let t=5;t<=60;t+=0.005){ RH.zeta(sg,t,o); const h=Math.hypot(o[0],o[1]); if(h<m){m=h;tm=t;} } console.log('min|zeta| sigma',sg,m.toFixed(4),'at',tm.toFixed(2)); }
console.log('EC y^2=x^3-x over F5', RH.ecCount(-1,0,5,true));
console.log('EC y^2=x^3+x+1 over F97', (r=>({N:r.N,ap:r.ap}))(RH.ecCount(1,1,97,false)), 2*Math.sqrt(97));
let vb=[]; for(const p of RH.sieve(30).primes){const v=RH.vBinom(15,p); if(v)vb.push(p+'^'+v);} console.log('C(30,15)=',vb.join(' '));
// gaps
const w=zeros.map(g=>g/(2*Math.PI)*(Math.log(g/(2*Math.PI))-1)+7/8); const gaps=[]; for(let i=1;i<w.length;i++)gaps.push(w[i]-w[i-1]);
console.log('mean gap',gaps.reduce((a,b)=>a+b)/gaps.length,'min',Math.min(...gaps),'max',Math.max(...gaps));
let t0=Date.now(); for(let i=0;i<3001;i++)RH.zeta(.5,i*.02,o); console.log('path ms',Date.now()-t0);
