from pathlib import Path
import json, numpy as np, pandas as pd
from scipy.spatial import cKDTree
from scipy.ndimage import median_filter, gaussian_filter1d

ROOT=Path(__file__).resolve().parent
d=pd.read_pickle(ROOT/'raw.pkl')
js=(ROOT/'prior_lap_logic.js').read_text().split('function getLapInfoHTML')[0]
rows=[]
for r in d.itertuples(index=False):
    rows.append(dict(timestamp=r.timestamp,lat=r.lat,lng=r.lng,speed=r.speed,sat=r.sat,throttle=r.throttle,current=r.current_mA,voltage=r.voltage,power=r.power,energy=r.energy,rawDistance=r.dist_km,millis=r.millis))
(ROOT/'raw.json').write_text(json.dumps(rows,separators=(',',':')))
(ROOT/'detect.cjs').write_text("const fs=require('fs');\n"+js+"\nconst tele=prepareTelemetry(JSON.parse(fs.readFileSync(__dirname+'/raw.json','utf8')));const laps=detectLaps(tele);fs.writeFileSync(__dirname+'/detected.json',JSON.stringify({thresholds:state.thresholds,laps},null,2));console.log(JSON.stringify({count:laps.length,thresholds:state.thresholds}));")
print('Raw parsed; detector ready')
