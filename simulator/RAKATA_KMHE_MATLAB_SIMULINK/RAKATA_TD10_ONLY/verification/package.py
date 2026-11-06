from pathlib import Path
import hashlib,json,zipfile,shutil
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT.parent/'output';OUT.mkdir(exist_ok=True)
manifest={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in ROOT.rglob('*') if p.is_file() and p.name!='manifest.json' and '__pycache__' not in str(p)}
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2))
archive=OUT/'RAKATA_KMHE_MATLAB_SIMULINK.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(ROOT.rglob('*')):
        if p.is_file() and '__pycache__' not in str(p):z.write(p,'RAKATA_TD10_ONLY/'+str(p.relative_to(ROOT)))
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert not any('TD7' in n for n in z.namelist())
    assert len([n for n in z.namelist() if n.endswith('.xlsx')])==1
for name in ['TD10_Audit_Validation.html','TD10_Validation.png','TD10_Input_Audit.png']:shutil.copy(ROOT/'results'/name,OUT/name)
print('Package ZIP verified:',archive,archive.stat().st_size,'bytes;',len(manifest),'files')
