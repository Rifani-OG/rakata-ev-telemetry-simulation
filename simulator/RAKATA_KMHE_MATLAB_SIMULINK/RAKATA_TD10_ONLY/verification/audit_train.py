"""Independent executable audit and TD10-only fit. Python is optional, not needed in MATLAB."""
from pathlib import Path
import json, hashlib
import numpy as np
import pandas as pd
import openpyxl
from scipy.ndimage import uniform_filter1d
from scipy.optimize import lsq_linear
from scipy.io import savemat
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'results';OUT.mkdir(exist_ok=True)
names=['timestamp','lat','lng','speed_kmh','sat','throttle_pct','current_mA','voltage_V','power_W','energy_Wh','distance_km','millis']
raw=list(openpyxl.load_workbook(ROOT/'data/TD10_latest.xlsx',read_only=True,data_only=True).active.values)
records=[str(r[0]).split(',') if len(r)==1 else list(r) for r in raw]
D=pd.DataFrame(records,columns=names)
for n in names[1:]:D[n]=pd.to_numeric(D[n],errors='coerce')
D.insert(0,'source_row',np.arange(1,len(D)+1));D.to_csv(ROOT/'data/TD10_canonical.csv',index=False)
geo=json.loads((ROOT/'data/sport_jabar_geography.json').read_text())
cut=np.r_[0,np.flatnonzero(np.diff(D.distance_km)<-.1)+1,len(D)]
audit=[];samples=[];runs=[]
nodes=np.array([0,7,14,21,28,36.])
def hat(v):
    v=np.clip(v,0,36);j=np.minimum(np.searchsorted(nodes,v,side='right')-1,4);w=(v-nodes[j])/(nodes[j+1]-nodes[j]);X=np.zeros((len(v),6));X[np.arange(len(v)),j]=1-w;X[np.arange(len(v)),j+1]=w;return X
def design(v,u,s):
    z=np.minimum((np.maximum(v,0)/35.7)**2,.999);q=np.clip((u-z)/(1-z),0,1)
    h=hat(v);phi=np.column_stack([f(2*np.pi*k*s/1440) for k in range(1,5) for f in [np.sin,np.cos]])
    return np.column_stack([np.ones(len(v)),-(v/3.6)**2,h*q[:,None],phi]),q,h
for lap,(lo,hi) in enumerate(zip(cut[:-1],cut[1:]),1):
    z=D.iloc[lo:hi].copy();gas=np.flatnonzero(z.throttle_pct.to_numpy()>1)
    if not len(gas):continue
    first=gas[0];start=max(0,first-10);z=z.iloc[start:];tt=z.millis.to_numpy()/1000;dt=np.diff(tt)
    reason=[]
    if np.any((dt<=0)|(dt>.5)):reason.append('reset/gap>0.5s inside launch segment')
    if z.distance_km.iloc[-1]-z.distance_km.iloc[0]<1.2:reason.append('partial distance')
    if not np.isfinite(z[names[1:]].to_numpy()).all():reason.append('nonfinite')
    valid=not reason;split='test' if lap%3==0 else 'train'
    item=dict(lap=lap,first_source_row=int(z.source_row.iloc[0]),last_source_row=int(z.source_row.iloc[-1]),rows=len(z),valid=valid,split=split if valid else 'excluded',reason='; '.join(reason),time_s=float(tt[-1]-tt[0]),distance_m=float((z.distance_km.iloc[-1]-z.distance_km.iloc[0])*1000),end_speed=float(z.speed_kmh.iloc[-1]),max_speed=float(z.speed_kmh.max()),energy_counter_Wh=float(z.energy_Wh.iloc[-1]-z.energy_Wh.iloc[0]))
    if valid:
        t=np.arange(0,tt[-1]-tt[0],.1);t0=tt-tt[0];v=np.interp(t,t0,z.speed_kmh);u=z.throttle_pct.to_numpy()[np.maximum(0,np.searchsorted(t0,t,side='right')-1)]/100
        s=np.interp(t,t0,z.distance_km)*1000;s=(s-s[0])*1440/max(s[-1]-s[0],1)
        p=np.interp(t,t0,z.power_W);vs=uniform_filter1d(v,11,mode='nearest');ps=uniform_filter1d(p,11,mode='nearest');a=np.gradient(vs/3.6,.1);dp=np.gradient(ps,.1)
        ue=np.empty(len(t));ue[0]=u[0]
        for i in range(1,len(t)):ue[i]=ue[i-1]+(u[i-1]-ue[i-1])*(1-np.exp(-.1/.3))
        grade=np.interp(s,geo['s'],geo['grade']);X,q,H=design(vs,ue,s)
        # Smooth derivatives are training targets only; speed/power are recursively predicted in validation.
        keep=(vs>=1)&(vs<=35.3)&(np.abs(a)<1.8)&(t>1)&(t<t[-1]-1)
        pack=dict(lap=lap,t=t,v=v,u=u,s=s,p=p,grade=grade)
        runs.append(pack)
        samples.append(dict(lap=lap,train=split=='train',X=X[keep],y=(a+9.81*grade)[keep],q=q[keep],H=H[keep],p=ps[keep],dp=dp[keep]))
        item['energy_integral_Wh']=float(np.trapezoid(z.power_W,tt)/3600)
    audit.append(item)
pd.DataFrame(audit).to_csv(OUT/'lap_audit.csv',index=False)
tr=[x for x in samples if x['train']];X=np.vstack([x['X'] for x in tr]);y=np.concatenate([x['y'] for x in tr]);w=np.ones(len(y));ridge=1e-2
lo=np.r_[-.8,0,np.zeros(6),np.full(8,-.6)];hi=np.r_[.2,.03,np.full(6,3),np.full(8,.6)]
for k in range(5):
    b=lsq_linear(np.vstack([X*np.sqrt(w[:,None]),np.eye(16)*np.sqrt(ridge)]),np.r_[y*np.sqrt(w),np.zeros(16)],bounds=(lo,hi),tol=1e-10).x
    res=y-X@b;scale=1.4826*np.median(np.abs(res-np.median(res)))+.001;w=np.minimum(1,1.5*scale/np.maximum(np.abs(res),1e-9))
idle=float(np.quantile(np.concatenate([r['p'] for r in runs if r['lap']%3]),.03))
q=np.concatenate([x['q'] for x in tr]);H=np.vstack([x['H'] for x in tr]);p=np.concatenate([x['p'] for x in tr]);dp=np.concatenate([x['dp'] for x in tr]);XP=H*q[:,None]
power_bound=float(max(np.max(r['p']) for r in runs if r['lap']%3)-idle)
bp=lsq_linear(np.vstack([XP,np.eye(6)*.01]),np.r_[p+2*dp-idle,np.zeros(6)],bounds=(np.zeros(6),np.full(6,power_bound))).x
model=dict(acceleration_coefficients=b.tolist(),power_coefficients=bp.tolist(),nodes=nodes.tolist(),idle_W=idle,power_tau_s=2.,throttle_tau_s=.3,q_exponent=2.,no_load_kmh=35.7,voltage_V=float(D.voltage_V.median()),mass_kg=141,ratio=11,source_sha256=hashlib.sha256((ROOT/'data/TD10_latest.xlsx').read_bytes()).hexdigest(),trained_laps=[x['lap'] for x in tr],heldout_laps=[x['lap'] for x in samples if not x['train']],notes='Constant voltage cannot identify battery sag; spatial nuisance is NOT transferred to UNEJ.')
(OUT/'model_python.json').write_text(json.dumps(model,indent=2));savemat(OUT/'model_pretrained.mat',{'model':model})
checks=[]
for r in runs:
    if r['lap']%3:continue
    v=np.zeros(len(r['t']));pout=v.copy();ee=v.copy();v[0]=r['v'][0];pout[0]=r['p'][0];uu=r['u'][0]
    for k in range(len(v)-1):
        xx,qq,hh=design(np.array([v[k]]),np.array([uu]),np.array([r['s'][k]]));acc=float((xx@b)[0]-9.81*r['grade'][k]);v[k+1]=max(0,v[k]+acc*.1*3.6)
        desired=idle+float((hh@bp)[0]*qq[0]);pout[k+1]=pout[k]+(desired-pout[k])*(1-np.exp(-.1/2));ee[k+1]=ee[k]+(pout[k]+pout[k+1])*.05/3600;uu+= (r['u'][k]-uu)*(1-np.exp(-.1/.3))
    fs=np.zeros(len(v));fv=r['v'][0];fu=r['u'][0]
    for k in range(len(v)-1):
        ss=min(1440,fs[k]);g=np.interp(ss,geo['s'],geo['grade']);xx,_,_=design(np.array([fv]),np.array([fu]),np.array([ss]));aa=float((xx@b)[0]-9.81*g);vn=max(0,fv+aa*.1*3.6);fs[k+1]=fs[k]+(fv+vn)/3.6*.05;fv=vn;fu+=(r['u'][k]-fu)*(1-np.exp(-.1/.3))
    crossing=np.flatnonzero(fs>=1440)
    er=np.trapezoid(r['p'],r['t'])/3600;checks.append(dict(lap=r['lap'],speed_RMSE_kmh=float(np.sqrt(np.mean((v-r['v'])**2))),energy_real_Wh=er,energy_pred_Wh=float(ee[-1]),energy_error_Wh=float(ee[-1]-er),free_distance_error_m=float(fs[-1]-1440),free_finish_time_error_s=float(r['t'][crossing[0]]-r['t'][-1]) if len(crossing) else None))
    pd.DataFrame(dict(time_s=r['t'],real_speed_kmh=r['v'],model_speed_kmh=v,real_power_W=r['p'],model_power_W=pout,throttle_pct=r['u']*100,real_station_m=r['s'],model_energy_Wh=ee,free_station_m=fs)).to_csv(OUT/f'holdout_lap_{r["lap"]}.csv',index=False)
pd.DataFrame(checks).to_csv(OUT/'validation_python.csv',index=False)
auditmeta=dict(rows=len(D),millis_resets=int(np.sum(np.diff(D.millis)<=0)),gaps_over_05s=int(np.sum(np.diff(D.millis)>500)),voltage_unique=D.voltage_V.nunique(),satellite_unique=D.sat.nunique(),speed_max=float(D.speed_kmh.max()),current_max_A=float(D.current_mA.max()/1000),power_max_W=float(D.power_W.max()),power_VI_max_difference_W=float(np.max(np.abs(D.power_W-D.current_mA/1000*D.voltage_V))),train_rows=len(y),source_sha256=model['source_sha256'],validation=checks)
(OUT/'audit.json').write_text(json.dumps(auditmeta,indent=2));print(json.dumps(auditmeta,indent=2));print('train',model['trained_laps'],'test',model['heldout_laps']);print('coeff',b,'power',bp)
