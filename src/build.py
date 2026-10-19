# Builds ../index.html (single self-contained file) from the pieces in this folder.
import base64, json, os, glob
here = os.path.dirname(os.path.abspath(__file__))
imgs = {os.path.splitext(os.path.basename(p))[0]: 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
        for p in sorted(glob.glob(os.path.join(here, 'q*.png')))}
parts = ['const IMG = ' + json.dumps(imgs) + ';']
for f in ['bank.js', 'sample.js', 'gen.js', 'app.js']:
    parts.append(open(os.path.join(here, f), encoding='utf-8').read())
html = open(os.path.join(here, 'template.html'), encoding='utf-8').read()
html = html.replace('<!--DATA-->', '<script>\n' + '\n'.join(parts).replace('</script', '<\\/script') + '\n</script>')
out = os.path.join(here, '..', 'index.html')
open(out, 'w', encoding='utf-8').write(html)
print(os.path.abspath(out), round(len(html) / 1024), 'KB')
