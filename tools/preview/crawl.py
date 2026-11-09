import re, urllib.request, urllib.parse, os, html, json, shutil, sys, hmac, hashlib, base64, time
BASE='http://localhost:3100'
OUT=sys.argv[1]
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
def name_for(path):
    p=urllib.parse.urlsplit(path)
    n=p.path.strip('/').replace('/','--') or 'home'
    if p.query:
        n+='__'+'_'.join(f'{k}-{v}' for k,v in urllib.parse.parse_qsl(p.query))
    return re.sub(r'[^A-Za-z0-9_.-]','-',n)+'.html'
start=['/','/en','/seller','/en/seller','/cart','/en/cart','/admin/delivery','/en/admin/delivery']
# Pages that need a server (accounts, real orders) are not copied; the preview has its own TEST journey.
SKIP=re.compile(r'^(/en)?/(signin|account|checkout|test-order|admin(?!/delivery$))')
SECRET=os.environ.get('ASE_SESSION_SECRET','')
def admin_cookie():
    payload=f"admin-tamar.{int(time.time())+3600}"
    sig=base64.urlsafe_b64encode(hmac.new(SECRET.encode(),payload.encode(),hashlib.sha256).digest()).decode().rstrip('=')
    return f"ase_session={payload}.{sig}"
def fetch(u):
    req=urllib.request.Request(BASE+u)
    if u.endswith('/admin/delivery'): req.add_header('Cookie',admin_cookie())
    return urllib.request.urlopen(req).read().decode()
seen={}; queue=list(start); css_cache={}; assets=set()
while queue:
    u=queue.pop(0)
    if u in seen: continue
    if SKIP.match(urllib.parse.urlsplit(u).path): continue
    try: body=fetch(u)
    except Exception as e: print('fail',u,e); continue
    seen[u]=body
    for href in re.findall(r'href="(/[^"#]*)', body):
        href=html.unescape(href)
        if href.startswith('/_next'): continue
        p=urllib.parse.urlsplit(href)
        if not p.query:
            if href not in seen: queue.append(href)
        # filtered views: only the ones linked from the two home pages
        elif u in ('/','/en') and not p.path.endswith('/b2b') and href not in seen: queue.append(href)
print('pages',len(seen))
def rewrite(u, body):
    def css(m):
        h=m.group(1)
        if h not in css_cache:
            c=urllib.request.urlopen(BASE+h).read().decode()
            for a in re.findall(r'url\(\.\./media/([^)]+)\)',c): assets.add(a)
            css_cache[h]=c.replace('url(../media/','url(fonts/')
        return '<style>'+css_cache[h]+'</style>'
    body=re.sub(r'<link rel="stylesheet" href="(/_next/[^"]+)"[^>]*/?>',css,body)
    body=re.sub(r'<link[^>]+rel="preload"[^>]*/?>','',body)
    body=re.sub(r'<script\b[^>]*>.*?</script>','',body,flags=re.S)
    body=re.sub(r'<link[^>]+(?:as="script"|rel="modulepreload")[^>]*/?>','',body)
    def lnk(m):
        h=html.unescape(m.group(1)); frag=m.group(2) or ''
        if h.startswith('/_next'): return m.group(0)
        tgt = h if h in seen else (urllib.parse.urlsplit(h).path or '/')
        return 'href="'+name_for(tgt)+frag+'"'
    body=re.sub(r'href="(/[^"#]*)(#[^"]*)?"',lnk,body)
    body=re.sub(r'action="(/[^"]*)"',lambda m:'action="'+name_for(m.group(1))+'"',body)
    lang='en' if u=='/en' or u.startswith('/en/') else 'ka'
    path=u[3:] or '/' if lang=='en' else u
    inject='<script>window.__ASE='+json.dumps({'lang':lang,'path':path})+'</script><script src="islands.js" defer></script>'
    body=body.replace('</body>', inject+'</body>',1)
    return body
pages={}
for u,b in seen.items():
    out=rewrite(u,b); pages[u]=out
    open(os.path.join(OUT,name_for(u)),'w').write(out)
os.makedirs(os.path.join(OUT,'fonts'),exist_ok=True)
for a in assets:
    open(os.path.join(OUT,'fonts',a),'wb').write(urllib.request.urlopen(BASE+'/_next/static/media/'+a).read())
# Journey pages for the preview, built from the cart page with its content swapped for an island.
def journey(src_url, path, island, title):
    h=pages[src_url]
    h=re.sub(r'(<main id="main"[^>]*>).*?(</main>)', lambda m: m.group(1)+'<div data-island="'+island+'"></div>'+m.group(2), h, count=1, flags=re.S)
    h=re.sub(r'<title>.*?</title>','<title>'+title+'</title>',h,count=1,flags=re.S)
    lang='en' if src_url.startswith('/en') else 'ka'
    h=re.sub(r'window.__ASE=\{[^<]*\}','window.__ASE='+json.dumps({'lang':lang,'path':path}),h)
    open(os.path.join(OUT,name_for(('/en' if lang=='en' else '')+path)),'w').write(h)
journey('/cart','/checkout','local-checkout','შეკვეთის გაფორმება · ASE')
journey('/en/cart','/checkout','local-checkout','Checkout · ASE')
journey('/cart','/test-order','local-order','სატესტო შეკვეთა · ASE')
journey('/en/cart','/test-order','local-order','Test order · ASE')
# Main artifact page: the Georgian home page without its html/head wrapper.
h=pages['/']
styles=''.join(re.findall(r'<style>.*?</style>',h,flags=re.S))
html_cls=re.search(r'<html[^>]*class="([^"]*)"',h).group(1)
body_m=re.search(r'<body[^>]*class="([^"]*)"[^>]*>(.*)</body>',h,flags=re.S)
main='<title>ASE Marketplace</title>\n'+styles+'\n<div lang="ka" class="'+html_cls+' '+body_m.group(1)+'">'+body_m.group(2)+'</div>'
open(os.path.join(OUT,'ase-marketplace.html'),'w').write(main)
print('files',len(os.listdir(OUT)),'fonts',len(assets))
