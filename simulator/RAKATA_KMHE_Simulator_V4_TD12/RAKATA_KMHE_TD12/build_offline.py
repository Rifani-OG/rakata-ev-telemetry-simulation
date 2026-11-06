from pathlib import Path
import re
import base64
root=Path(__file__).resolve().parent
d=root
s=(d/'index.html').read_text()
s=s.replace('<link rel="stylesheet" href="style.css">','<style>'+(d/'style.css').read_text()+'</style>')
s=s.replace('assets/logo-itb.png','data:image/png;base64,'+base64.b64encode((d/'assets/logo-itb.png').read_bytes()).decode())
s=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>'+(d/m[1]).read_text().replace('</script','<\\/script')+'</script>',s)
(d/'RAKATA_TD10_Trainer.html').write_text(s)
print('Standalone HTML built with embedded data, physics, controls and scene.')

page=(d/"attempt.html").read_text()
page=page.replace('<link rel="stylesheet" href="style.css">','<style>'+(d/"style.css").read_text()+'</style>')
page=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>'+(d/m[1]).read_text().replace('</script','<\\/script')+'</script>',page)
(d/"RAKATA_KMHE_Attempt.html").write_text(page)
