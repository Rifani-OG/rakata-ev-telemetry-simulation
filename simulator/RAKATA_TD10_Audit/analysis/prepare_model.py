from pathlib import Path
import json, numpy as np,pandas as pd
from scipy.ndimage import gaussian_filter1d
from scipy.interpolate import CubicSpline
from scipy.spatial import cKDTree
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

R=Path(__file__).resolve().parent
raw=pd.read_pickle(R/'raw.pkl');lapmeta=json.loads((R/'detected.json').read_text())['laps']
old=pd.read_csv(R.parent/'sources/Rakata/rakata_track_centerline_actual_v1.csv')
elev=pd.read_csv(R.parent/'sources/Rakata/sport_jabar_google_earth_profile_v8_1.csv')
grid=np.arange(0,1441,5,dtype=float)
eh=np.interp(np.arange(0,1440,5),elev.distance_m,elev.elevation_m)
eh=gaussian_filter1d(eh,2,mode='wrap');eh=np.r_[eh,eh[0]]
grade=np.gradient(eh,5);grade[0]=grade[-1]=(eh[1]-eh[-2])/10
track=dict(s=grid.tolist(),lat=np.interp(grid,old.distance_m,old.lat).tolist(),lng=np.interp(grid,old.distance_m,old.lng).tolist(),elevation=eh.tolist(),grade=grade.tolist())
(R/'track.json').write_text(json.dumps(track))
allrows=[];traces=[];summary=[]
for l in lapmeta:
    w=raw.iloc[l['startIdx']:l['endIdx']+1].copy()
    t=(w.millis.to_numpy()-w.millis.iloc[0])/1000
    # Device millis, 0.2 s uniform; preserve logger boundary and 1 s start spare.
    tt=np.arange(0,t[-1],.2)
    dd={k:np.interp(tt,t,w[k]) for k in ['speed','throttle','power','energy','dist_km','lat','lng']}
    # Physical lap coordinate uses logger distance scaled to one common 1440 m circuit.
    s=(dd['dist_km']-w.dist_km.iloc[0])/(w.dist_km.iloc[-1]-w.dist_km.iloc[0])*1440
    v=gaussian_filter1d(dd['speed']/3.6,3,mode='nearest')
    a=np.gradient(v,.2)
    u=dd['throttle']/100
    # Ignore transients: delayed GPS-derived speed and held GPS samples are not force measurements.
    stead=np.abs(np.gradient(gaussian_filter1d(u,3),.2))<.05
    coast=(u<=.01)&(s>20)&(s<1415)&(v>2)&(a>-.45)&stead
    drive=(u>=.99)&stead&(s<1300)&(v>1)&(a>-.25)&(a<2.0)
    fr=pd.DataFrame(dict(lap=l['lapCounter'],t=tt,s=s,v=v,a=a,u=u,p=dd['power'],steady=stead,coast=coast,drive=drive))
    allrows.append(fr)
    traces.append(dict(lap=l['lapCounter'],t=tt.tolist(),s=s.tolist(),v=(v*3.6).tolist(),u=(u*100).tolist(),p=dd['power'].tolist(),e=(dd['energy']-w.energy.iloc[0]).tolist()))
    phases=[]
    for ph in l['phases']['throttle']:
        a0,b0=ph['startIdx'],ph['endIdx']
        phases.append(dict(start_m=round((raw.dist_km.iloc[a0]-w.dist_km.iloc[0])*1000,1),end_m=round((raw.dist_km.iloc[b0]-w.dist_km.iloc[0])*1000,1),start_s=round((raw.millis.iloc[a0]-w.millis.iloc[0])/1000,2),end_s=round((raw.millis.iloc[b0]-w.millis.iloc[0])/1000,2),v_start=raw.speed.iloc[a0],v_end=raw.speed.iloc[b0],energy=ph['energy']))
    dt=np.diff(t);ei=np.sum((w.power.to_numpy()[1:]+w.power.to_numpy()[:-1])*.5*dt)/3600
    summary.append(dict(lap=l['lapCounter'],time=l['lapTimeMs']/1000,energy=l['lapEnergy'],energy_integrated=ei,distance=l['lapDistance']*1000,quality=l['endQuality'],end_speed=w.speed.iloc[-1],pulses=len(phases),max_speed=l['maxSpeed'],phases=phases))
pd.concat(allrows).to_pickle(R/'training.pkl')
(R/'traces.json').write_text(json.dumps(traces,separators=(',',':')))
(R/'lap_summary.json').write_text(json.dumps(summary,indent=2))
fig,axs=plt.subplots(3,1,figsize=(13,9),sharex=True)
for tr in traces:
    color='#dc2626' if tr['lap'] in [3,4,5] else '#059669' if tr['lap'] in [7,8,12] else '#cbd5e1'
    axs[0].plot(tr['s'],tr['v'],lw=.8,color=color,alpha=.75)
    f=allrows[tr['lap']-1];axs[1].plot(f.s,gaussian_filter1d(f.a,7),lw=.5,color=color,alpha=.7)
axs[0].set_ylabel('Kecepatan (km/h)');axs[1].set_ylabel('Percepatan (m/s²)');axs[2].plot(grid,eh);axs[2].set_ylabel('Elevasi GE (m)');axs[2].set_xlabel('Jarak dari start, dinormalisasi 1440 m')
for ax in axs:ax.grid(alpha=.2)
fig.tight_layout();fig.savefig(R/'diagnostic.png',dpi=140)
print('Samples',len(pd.concat(allrows)),'coast',sum(x.coast.sum() for x in allrows),'drive',sum(x.drive.sum() for x in allrows),'GE',min(eh),max(eh),'grade',min(grade),max(grade))
