from pathlib import Path
import json,numpy as np,pandas as pd
from scipy.optimize import lsq_linear
from scipy.ndimage import gaussian_filter1d

R=Path(__file__).resolve().parent
f=pd.read_pickle(R/'training.pkl');track=json.loads((R/'track.json').read_text())
sn=np.arange(0,1441,40,dtype=float);vn=np.array([0,4,8,12,16,20,24,28,30,32,34,35,36,38],float)/3.6

def basis(x,nodes):
    x=np.clip(np.asarray(x),nodes[0],nodes[-1]);k=np.clip(np.searchsorted(nodes,x)-1,0,len(nodes)-2);r=(x-nodes[k])/(nodes[k+1]-nodes[k]);B=np.zeros((len(x),len(nodes)));B[np.arange(len(x)),k]=1-r;B[np.arange(len(x)),k+1]=r;return B

def fit(exclude=None):
    ff=f if exclude is None else f[f.lap!=exclude]
    # Coasting after the electrical tail: no throttle and low observed power.
    co=ff[(ff.coast)&(ff.p<180)&(ff.s<1415)].copy()
    # Fit net coasting loss from repeated real passes. Geography is already present
    # in these observations: GE gravity is decomposed for audit, never added twice.
    co['bin']=(co.s/10).astype(int);co['v2']=co.v**2
    centered=co[['a','v2']]-co.groupby('bin')[['a','v2']].transform('median')
    k=float(np.clip(-(centered.a*centered.v2).sum()/(centered.v2.pow(2).sum()+1e-9),0,.003))
    co['base']=co.a+k*co.v2
    b=co.groupby('bin').agg(s=('s','median'),base=('base','median'),n=('s','size'));b=b[b.n>=4]
    ss=np.array(track['s']);base=gaussian_filter1d(np.interp(ss,b.s,b.base),2.2,mode='nearest')
    first=float(b.s.min());left=ss<first
    base[left]-=9.81*(np.interp(ss[left],track['s'],track['grade'])-np.interp(first,track['s'],track['grade']))
    # Below 2 m/s and beyond the final coast observation are an extension, flagged in the app.
    def coast(v,s):return np.interp(s,ss,base)-k*np.asarray(v)**2
    residual=base+9.81*np.array(track['grade'])
    dr=ff[ff.drive].copy();Y=dr.a.to_numpy()-coast(dr.v,dr.s);X=basis(dr.v,vn)
    # Full-throttle traction table: smooth, positive; no extra power-to-force efficiency guess.
    Dv=np.diff(np.eye(len(vn)),2,axis=0)*2
    xp=np.zeros((2,len(vn)));xp[0,0]=3;xp[1,-1]=12
    tp=lsq_linear(np.r_[X,Dv,xp],np.r_[Y,np.zeros(len(Dv)),4.8,0.0],bounds=(np.zeros(len(vn)),np.ones(len(vn))*2.5)).x
    # Identify power lag from release tails; tail is a signal property, not claimed regeneration.
    coasttail=ff[(ff.u<.01)&(ff.p>35)].copy()
    pder=np.concatenate([np.gradient(g.p.to_numpy(),.2) for _,g in ff.groupby('lap',sort=False)])
    ff=ff.copy();ff['dp']=pder
    tail=ff[(ff.u<.01)&(ff.p>50)&(ff.dp< -5)]
    tau=float(np.clip(np.median(-(tail.p-8.6)/tail.dp),.2,5))
    power=ff[ff.u>.99].copy();target=np.clip(power.p+tau*power.dp,10,950)
    X=basis(power.v,vn);pp=lsq_linear(np.r_[X,2*np.diff(np.eye(len(vn)),2,axis=0)],np.r_[target,np.zeros(len(vn)-2)],bounds=(np.ones(len(vn))*10,np.ones(len(vn))*950)).x
    # Partial throttle is limited by available no-load speed, then interpolated.
    partial=ff[(ff.u>.1)&(ff.u<.98)&(ff.v>.5)&(ff.steady)]
    best=None
    for exponent in np.linspace(.7,3.0,24):
        z=(np.clip(partial.v/(35.7/3.6),0,.999))**exponent
        q=np.clip((partial.u-z)/(1-z),0,1)
        pred=coast(partial.v,partial.s)+np.interp(partial.v,vn,tp)*q
        err=np.median(np.abs(pred-partial.a))
        if best is None or err<best[0]:best=(err,exponent)
    # Calibrate the electrical throttle map on whole training laps, not held-out laps.
    vv=ff.v.to_numpy();uu=ff.u.to_numpy();z=np.clip(vv/(35.7/3.6),0,.999)**best[1]
    qq=np.clip((uu-z)/(1-z),0,1);pf=np.interp(vv,vn,pp)-8.6
    groups=ff.lap.to_numpy();actual=np.array([ff.loc[ff.lap==li,'p'].sum()*.2/3600-8.6*sum(groups==li)*.2/3600 for li in np.unique(groups)])
    pbest=None
    for pe in np.linspace(.15,1.2,43):
        xx=np.array([np.sum(pf[groups==li]*qq[groups==li]**pe)*.2/3600 for li in np.unique(groups)])
        scale=float(np.clip(xx@actual/(xx@xx),.7,1.4));err=np.mean((xx*scale-actual)**2)
        if pbest is None or err<pbest[0]:pbest=(err,pe,scale)
    coastgrid=coast(0,np.asarray(track['s']))
    model=dict(v_nodes=(vn*3.6).tolist(),traction=tp.tolist(),coast0=coastgrid.tolist(),drag_v2=k,spatial_residual=residual.tolist(),s_nodes=ss.tolist(),power_full=pp.tolist(),power_tau=tau,partial_exponent=float(best[1]),idle_power=8.6,v_noload=35.7,throttle_tau=.35,mass=141,length=1440,target_time=220,brake_decel=.43)
    aa=coast(co.v,co.s);ad=coast(dr.v,dr.s)+np.interp(dr.v,vn,tp)
    model['fit_mae_coast']=float(np.mean(np.abs(aa-co.a)));model['fit_mae_drive']=float(np.mean(np.abs(ad-dr.a)))
    model['power_exponent']=float(pbest[1]);model['power_scale']=float(pbest[2])
    return model

if __name__=='__main__':
    m=fit();models=[fit(i) for i in range(1,16)]
    (R/'model.json').write_text(json.dumps(m,indent=2));(R/'fold_models.json').write_text(json.dumps(models))
    print(json.dumps({k:v for k,v in m.items() if k not in ['coast0','spatial_residual','s_nodes']},indent=2))
