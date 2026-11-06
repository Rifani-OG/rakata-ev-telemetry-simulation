"""Run from the extracted audit folder: python analysis/rebuild.py"""
from pathlib import Path
import subprocess, sys
import pandas as pd
R=Path(__file__).resolve().parent
root=R.parent
rows=pd.read_excel(root/'sources/Rakata/td10full.xlsx',header=None).iloc[:,0]
d=rows.str.split(',',expand=True)
d.columns=['timestamp','lat','lng','speed','sat','throttle','current_mA','voltage','power','energy','dist_km','millis']
for c in d.columns[1:]:d[c]=pd.to_numeric(d[c],errors='coerce')
d.to_pickle(R/'raw.pkl')
for command in [[sys.executable,'analysis/audit.py'],['node','analysis/detect.cjs'],[sys.executable,'analysis/prepare_model.py'],[sys.executable,'analysis/fit_model.py'],['node','analysis/validate.cjs'],['node','analysis/search.cjs'],['node','analysis/check_engine.cjs']]:
    subprocess.run(command,cwd=root,check=True)
print('Model, lap detector, validation and strategy search rebuilt in analysis/.')
