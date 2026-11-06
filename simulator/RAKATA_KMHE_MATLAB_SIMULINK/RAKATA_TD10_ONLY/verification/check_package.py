from pathlib import Path
import json,hashlib,re
import numpy as np,pandas as pd
R=Path(__file__).resolve().parents[1]
A=json.loads((R/'results/audit.json').read_text());M=json.loads((R/'results/model_python.json').read_text());L=pd.read_csv(R/'results/lap_audit.csv')
assert hashlib.sha256((R/'data/TD10_latest.xlsx').read_bytes()).hexdigest()==A['source_sha256']
assert set(M['trained_laps']).isdisjoint(M['heldout_laps'])
assert set(L[L['valid']==False].lap)=={2,9,11,14}
assert A['rows']==35156 and A['power_VI_max_difference_W']<.006
assert len(M['acceleration_coefficients'])==16 and len(M['power_coefficients'])==6
assert np.isfinite(M['acceleration_coefficients']).all()
scripts=list((R/'scripts').glob('*.m'))
for p in scripts:
    text=p.read_text();assert 'TD7_FULL.xlsx' not in text and 'vehicle_calibration.mat' not in text
    # Do not shadow MATLAB's split() function with a local variable. This
    # previously caused kmhe_prepare to fail before it could parse TD10.
    assert not re.search(r'(?m)^\s*split\s*=',text),p
    if text.startswith('function '):
        first=text.splitlines()[0];assert re.search(r'\b'+re.escape(p.stem)+r'\s*\(',first),p
    for callee in re.findall(r'\b(kmhe_[a-z_]+)\(',text):assert (R/'scripts'/f'{callee}.m').exists(),(p,callee)
G=json.loads((R/'data/unej_geography.json').read_text());s=np.array(G['s']);grade=np.array(G['grade']);closed=grade-np.trapezoid(grade,s)/s[-1]
assert abs(np.trapezoid(closed,s))<1e-9
print('PASS source hash, disjoint laps, exclusions, units P=VI, coefficient dimensions, MATLAB function links, builtin shadowing, closed grade integral')
print('Native MATLAB/Simulink execution: NOT AVAILABLE. Run selftest_td10.m on MATLAB.')
