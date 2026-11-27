import base64
import hashlib
import json
import os
import sys
import time
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from zipfile import ZipFile

os.chdir(Path(__file__).resolve().parents[2])
WD = os.environ.get('VERTICE_WEBDRIVER', 'http://127.0.0.1:9518')
URL = os.environ.get('VERTICE_URL', 'http://127.0.0.1:8769/')
TAB, ENTER, SHIFT, ESC = "\ue004", "\ue007", "\ue008", "\ue00c"

def call(method, path, payload=None):
    body = json.dumps(payload).encode() if payload is not None else None
    req = Request(WD + path, data=body, method=method, headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=35) as response:
        return json.loads(response.read())["value"]

class Browser:
    def __init__(self, js=True):
        caps = {"browserName": "chrome", "goog:chromeOptions": {
            "binary": "/usr/bin/chromium",
            "args": ["--headless", "--no-sandbox", "--disable-dev-shm-usage", "--disable-background-networking", "--lang=en-US"],
            "prefs": {} if js else {"profile.managed_default_content_settings.javascript": 2}},
            "goog:loggingPrefs": {"browser": "ALL", "performance": "ALL"}}
        session = call("POST", "/session", {"capabilities":{"alwaysMatch":caps}})
        self.path = "/session/" + session["sessionId"]
        self.version = session["capabilities"]["browserVersion"]
    def __enter__(self):
        return self
    def __exit__(self, *_):
        call("DELETE", self.path)
    def post(self, route, payload):
        return call("POST", self.path + route, payload)
    def cdp(self, cmd, params=None):
        return self.post("/goog/cdp/execute", {"cmd":cmd, "params":params or {}})
    def js(self, script, *args):
        return self.post("/execute/sync", {"script":script, "args":list(args)})
    def go(self, url=URL):
        self.post("/url", {"url":url})
    def layout(self, width):
        self.cdp("Emulation.setDeviceMetricsOverride", {"width":width, "height":900, "deviceScaleFactor":1, "mobile":False})
    def reduced_motion(self):
        self.cdp("Emulation.setEmulatedMedia", {"features":[{"name":"prefers-reduced-motion","value":"reduce"}]})
    def key(self, value):
        self.post("/actions", {"actions":[{"id":"teclado","type":"key","actions":[
            {"type":"keyDown","value":value}, {"type":"keyUp","value":value}
        ]}]})
    def backtab(self):
        self.post("/actions", {"actions":[{"id":"teclado","type":"key","actions":[
            {"type":"keyDown","value":SHIFT}, {"type":"keyDown","value":TAB},
            {"type":"keyUp","value":TAB},{"type":"keyUp","value":SHIFT}
        ]}]})
    def focus(self):
        return self.js("""const el = document.activeElement;
            return [el.id || el.className || el.tagName, el.matches(':focus-visible'),
                    getComputedStyle(el).outlineStyle];""")
    def logs(self, kind):
        return self.post("/log", {"type":kind})

def until(action, timeout=5):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        value = action()
        if value:
            return value
        time.sleep(0.075)
    raise AssertionError("Tiempo agotado en verificación")

url = URL
out = Path('Auditorias/V3')
root = Path('V3-Catalog')
products = json.loads((root/'data/productos.json').read_text())
axe = os.environ.get('AXE_JS')
themes = {'claro':'light', 'oscuro':'dark'}
cart_key, theme_key = 'vertice_cart_v1', 'vertice_theme_v1'

def viewport(b, width, height=970):
    b.cdp('Emulation.setDeviceMetricsOverride',
          {'width':width,'height':height,'deviceScaleFactor':1,'mobile':width<600})

def theme(b, mode):
    b.cdp('Emulation.setEmulatedMedia',{'features':[
        {'name':'prefers-color-scheme','value':themes[mode]},
        {'name':'prefers-reduced-motion','value':'reduce'},
    ]})

def active(b):
    return b.js('return document.activeElement.id || document.activeElement.getAttribute("data-action")')

def focus(b, sel):
    b.js('document.querySelector(arguments[0]).focus({preventScroll:true})',sel)

def click(b, sel):
    eid=b.post('/element',{'using':'css selector','value':sel})['element-6066-11e4-a52e-4f735466cecf']
    b.post(f'/element/{eid}/click',{})

def text(b, selector):
    return b.js("return document.querySelector(arguments[0]).textContent.trim()",selector)

def search(b, query):
    b.js("""const field=document.querySelector('#buscar-productos'); field.value=arguments[0];
      field.dispatchEvent(new Event('input',{bubbles:true}));""",query)

def setting(b,key,value):
    b.js("localStorage.setItem(arguments[0],arguments[1])",key,value)

def ready(b):
    until(lambda: b.js("return !document.querySelector('[data-catalog-controls]').hidden"))

def go(b, route=''):
    b.go(url+route)
    ready(b)

def number_of_cards(b):
    return b.js("return document.querySelectorAll('[data-product-grid] article').length")

def open_cart(b):
    click(b,'[data-cart-trigger]')
    assert b.js("return document.querySelector('dialog').open && document.activeElement.matches('[data-cart-close]')")

def close_cart(b):
    b.key(ESC)
    until(lambda:b.js("return !document.querySelector('dialog').open && document.activeElement.matches('[data-cart-trigger]')"))

def settle_assets(b):
    return b.post('/execute/async',{'script':"""const done=arguments[0];
      const imgs=[...document.images]; imgs.forEach(img=>img.loading='eager');
      Promise.all([document.fonts.ready,...imgs.map(img=>img.decode())]).then(()=>done(
          imgs.map(i=>[i.getAttribute('src'),i.naturalWidth,i.naturalHeight])
      )).catch(err=>done(String(err)));""",'args':[]})

def capture(b, name, width, catalog):
    b.cdp('Emulation.setScrollbarsHidden',{'hidden':True})
    rect=b.js("""const catalog=document.querySelector('#catalogo');
      return arguments[0] ? {y:Math.round(catalog.offsetTop),height:Math.round(catalog.offsetHeight)}
        : {y:Math.round(scrollY),height:innerHeight};""",catalog)
    image=b.cdp('Page.captureScreenshot',{'captureBeyondViewport':catalog,'format':'png',
          'clip':{'x':0,'y':rect['y'],'width':width,'height':rect['height'],'scale':1}})
    (out/name).write_bytes(base64.b64decode(image['data']))
    b.cdp('Emulation.setScrollbarsHidden',{'hidden':False})
    return {'archivo':name,'ancho':width,'alto':rect['height']}

def measure(b):
    return b.js("""const grid=document.querySelector('[data-product-grid]'), limit=document.documentElement.clientWidth;
      return {viewport:innerWidth,visible:limit,ancho:document.documentElement.scrollWidth,
        columnas:getComputedStyle(grid).gridTemplateColumns.split(' ').length,
        fuera:[...document.querySelectorAll('header *,main *,body > footer *')].filter(node=>{
          const r=node.getBoundingClientRect(); return r.width>0 && (r.left < -1 || r.right > limit+1);
        }).map(node=>node.tagName)};""")

def traffic(b):
    events=[json.loads(e['message'])['message'] for e in b.logs('performance')]
    return [e['params']['request']['url'] for e in events if e['method']=='Network.requestWillBeSent']

def contrast(b, a, prop, bg):
    c,d=b.js("""const [a,p,b]=arguments;return [
       getComputedStyle(document.querySelector(a))[p],getComputedStyle(document.querySelector(b)).backgroundColor];""",a,prop,bg)
    def L(c):
        from re import findall
        rgb=[int(v)/255 for v in findall(r'\d+',c)[:3]]
        return sum(w*(x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4) for w,x in zip((.2126,.7152,.0722),rgb))
    high,low=sorted((L(c),L(d)),reverse=True)
    return round((high+.05)/(low+.05),2)

def responsive_and_captures(b, report):
    for mode in themes:
        theme(b,mode)
        for width, columns in [(320,1),(375,1),(768,2),(1024,3),(1280,4),(1440,4)]:
            viewport(b,width,812 if width==375 else 960)
            go(b)
            assert b.js("return document.documentElement.classList.contains('dark')") == (mode=='oscuro')
            state=measure(b)
            assert state['viewport']==width and state['ancho']==state['visible'] and not state['fuera'] and state['columnas']==columns,(mode,state)
            report['responsive'].append({'tema':mode,**state})
            if width in (375,1440):
                images=settle_assets(b)
                assert isinstance(images,list) and len(images)==15,images
                assert sum(p[1:]==[800,800] for p in images)==12,images
                layouts=b.js("""const cards=[...document.querySelectorAll('[data-product-grid] article')];
                   const rows=Map.groupBy(cards,c=>Math.round(c.getBoundingClientRect().top));
                   return [...rows.values()].every(row=>new Set(row.map(c=>Math.round(c.querySelector('button').getBoundingClientRect().bottom))).size===1);""")
                assert layouts
                report['capturas'].append(capture(b,f'catalogo-{mode}-{width}.png',width,True))
                click(b,'[data-add="vt-aud-01"]')
                click(b,'[data-add="vt-wsp-03"]')
                open_cart(b)
                assert text(b,'[data-cart-total]')=='S/ 1038.00'
                report['capturas'].append(capture(b,f'carrito-{mode}-{width}.png',width,False))
                click(b,'[data-clear-cart]')
                close_cart(b)
        for width, zoom in [(320,200),(1024,150),(1024,200),(1280,150),(1280,200)]:
            viewport(b,width)
            go(b)
            b.js("document.documentElement.style.fontSize=arguments[0]",f'{zoom}%')
            state=measure(b)
            assert state['ancho']==state['visible'] and not state['fuera'],(mode,width,zoom,state)
            b.key(TAB)
            if width==320:
                focus(b,'[data-menu-toggle]')
                b.key(ENTER)
            focus(b,'header nav a[href="#catalogo"]')
            b.key(ENTER)
            ended=b.js("""const catalog=document.querySelector('#catalogo');
              return {visible:catalog.getBoundingClientRect().top>=document.querySelector('header').getBoundingClientRect().bottom-1,
                foco:document.activeElement.id,
                indicador:getComputedStyle(document.querySelector('#catalogo-titulo')).textDecorationLine};""")
            assert ended=={'visible':True,'foco':'catalogo','indicador':'underline'},ended
            report['zoom'].append({'tema':mode,'porcentaje':zoom,**state,**ended})
            if width==320:
                open_cart(b)
                drawer=b.js("const d=document.querySelector('dialog');return [d.clientWidth,d.scrollWidth]")
                assert drawer[0]==drawer[1],drawer
                close_cart(b)
            b.js("document.documentElement.style.fontSize=''")

def cart_flow(b, report):
    viewport(b,1440)
    go(b)
    for group in ('Audio','Periféricos','Conectividad','Workspace'):
        click(b,f'[data-category="{group}"]')
        assert number_of_cards(b)==3
    click(b,'[data-category="Periféricos"]')
    search(b,'RATÓN ERGONÓMICO')
    assert number_of_cards(b)==1 and text(b,'[data-product-name]')=='VÉRTICE Ergo Pro'
    click(b,'[data-category="Audio"]')
    assert number_of_cards(b)==0 and not b.js("return document.querySelector('[data-empty-results]').hidden")
    click(b,'[data-reset-filters]')
    assert number_of_cards(b)==12 and active(b)=='buscar-productos'
    search(b,'PULSE')
    click(b,'[data-clear-search]')
    assert number_of_cards(b)==12
    traffic(b)
    for identifier in ('vt-aud-01','vt-aud-01','vt-per-01'):
        click(b,f'[data-add="{identifier}"]')
    assert text(b,'[data-cart-count]')=='3' and 'añadió' in text(b,'[data-cart-feedback]')
    assert text(b,'[data-cart-announcement]')=='VÉRTICE Tactile 75 se añadió al carrito. 3 unidades en el carrito.'
    assert json.loads(b.js("return localStorage.getItem(arguments[0])",cart_key))==[
        {'id':'vt-aud-01','quantity':2},{'id':'vt-per-01','quantity':1}]
    focus(b,'[data-cart-trigger]')
    b.key(ENTER)
    assert text(b,'[data-cart-total]')=='S/ 2287.00'
    assert b.js("return document.activeElement.matches('[data-cart-close]')")
    focus(b,'[data-theme-toggle]')
    assert b.js("return document.activeElement.closest('dialog')!==null")
    b.backtab()
    assert b.js("return document.activeElement.matches('[data-clear-cart]')")
    b.key(TAB)
    assert b.js("return document.activeElement.matches('[data-cart-close]')")
    assert b.js("""return [...document.querySelectorAll('dialog button')].filter(el=>el.getClientRects().length)
       .every(el=>el.getBoundingClientRect().height>=44)""")
    click(b,'[data-cart-id="vt-aud-01"] [data-action="decrease"]')
    assert text(b,'[data-cart-total]')=='S/ 1388.00' and active(b)=='decrease'
    click(b,'[data-cart-id="vt-aud-01"] [data-action="increase"]')
    assert text(b,'[data-cart-total]')=='S/ 2287.00' and active(b)=='increase'
    assert b.js("return document.querySelector('button[aria-describedby=whatsapp-aviso]').disabled")
    b.cdp('Browser.grantPermissions',{'origin':url.rstrip('/'),'permissions':['clipboardReadWrite','clipboardSanitizedWrite']})
    click(b,'[data-copy-order]')
    until(lambda:text(b,'[data-copy-status]')=='Resumen copiado al portapapeles.')
    copied=b.post('/execute/async',{'script':"""const done=arguments[0];
      navigator.clipboard.readText().then(done).catch(e=>done(String(e)));""",'args':[]})
    assert 'Total: S/ 2287.00' in copied,copied
    b.js("""Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
       writeText:async()=>{throw new DOMException('Denegado','NotAllowedError');}}});""")
    click(b,'[data-copy-order]')
    until(lambda:'manualmente' in text(b,'[data-copy-status]'))
    assert b.js("""const s=document.querySelector('[data-order-summary]');
       return document.activeElement===s && s.selectionEnd>s.selectionStart;""")
    assert not [x for x in traffic(b) if not x.startswith(url)]
    close_cart(b)
    b.post('/refresh',{})
    ready(b)
    assert text(b,'[data-cart-count]')=='3'
    open_cart(b)
    click(b,'[data-cart-id="vt-aud-01"] [data-action="remove"]')
    assert active(b)=='remove' and text(b,'[data-cart-total]')=='S/ 489.00'
    click(b,'[data-clear-cart]')
    assert b.js("return document.activeElement.matches('[data-cart-close]')")
    assert text(b,'[data-cart-total]')=='S/ 0.00'
    for event in ('mousePressed','mouseReleased'):
        b.cdp('Input.dispatchMouseEvent',{'type':event,'x':10,'y':200,'button':'left','clickCount':1})
    until(lambda:b.js("return !document.querySelector('dialog').open && document.activeElement.matches('[data-cart-trigger]')"))
    report['carrito']={'importe':'S/ 2287.00 verificado','crud':True,'recarga':True,'whatsapp_desactivado':True,
      'copia_real':True,'copia_denegada_manual':True,'peticiones_externas':0,'teclado_y_backdrop':True,
      'controles_44px':True,'foco_al_eliminar_y_vaciar':True}

def resilience(b, report):
    theme(b,'claro')
    setting(b,theme_key,'?')
    setting(b,cart_key,'{')
    go(b)
    assert not b.js("return document.documentElement.classList.contains('dark')")
    assert text(b,'[data-cart-count]')=='0'
    setting(b,cart_key,json.dumps([{'id':'fantasma','quantity':1},{'id':'vt-aud-01','quantity':2,'priceCents':1},
        {'id':'vt-aud-01','quantity':5},{'id':'vt-aud-02','quantity':100},{'id':'vt-aud-03','quantity':-1},
        {'id':'vt-wsp-03','quantity':1.5}]))
    go(b)
    assert text(b,'[data-cart-count]')=='2'
    open_cart(b)
    assert text(b,'[data-cart-total]')=='S/ 1798.00'
    close_cart(b)
    click(b,'[data-theme-toggle]')
    assert b.js("return document.documentElement.classList.contains('dark') && document.querySelector('[data-theme-toggle]').getAttribute('aria-pressed')==='true'")
    go(b)
    assert b.js("return document.documentElement.classList.contains('dark')")
    assert text(b,'[data-cart-count]')=='2'
    open_cart(b)
    click(b,'[data-clear-cart]')
    close_cart(b)
    assert b.js("return localStorage.getItem(arguments[0])",theme_key)=='dark'
    b.js("localStorage.clear()")
    report['almacenamiento']={'corrupto_recuperado':True,'ids_y_cantidades_invalidos_descartados':True,
        'precios_revinculados':True,'tema_recarga_e_independencia':True}

    loading_hook=b.cdp('Page.addScriptToEvaluateOnNewDocument',{'source':"""
      new MutationObserver(() => {
        const grid=document.querySelector('[data-product-grid][aria-busy=true]');
        const status=document.querySelector('[data-catalog-status]');
        if (grid && status?.textContent.includes('Cargando')) {
          window.__loadingCards=grid.querySelectorAll('article').length;
        }
      }).observe(document,{subtree:true,attributes:true,childList:true,characterData:true});
    """})['identifier']
    b.go(url+'lento/')
    ready(b)
    assert b.js('return window.__loadingCards')==12
    assert text(b,'[data-catalog-status]')==''
    b.cdp('Page.removeScriptToEvaluateOnNewDocument',{'identifier':loading_hook})
    report['carga_lenta_con_respaldo']=True
    report['fallback']={}
    for scenario,status in [('http404',404),('http500',500),('json-roto',200),('esquema',200)]:
        try:
            with urlopen(url+scenario+'/data/productos.json') as response: actual=response.status
        except HTTPError as error: actual=error.code
        assert actual==status
        go(b,scenario+'/')
        assert 'respaldo' in text(b,'[data-catalog-status]') and number_of_cards(b)==12
        search(b,'Halo')
        assert number_of_cards(b)==1
        click(b,'[data-add="vt-wsp-02"]')
        open_cart(b)
        assert text(b,'[data-cart-total]')=='S/ 279.00'
        click(b,'[data-clear-cart]')
        close_cart(b)
        report['fallback'][scenario]={'http':actual,'catalogo_busqueda_carrito':True}
    b.cdp('Page.addScriptToEvaluateOnNewDocument',{'source':"""Object.defineProperty(window,'localStorage',{
        get(){throw new DOMException('Storage bloqueado','SecurityError');}
    });"""})
    go(b)
    click(b,'[data-add="vt-aud-01"]')
    open_cart(b)
    assert text(b,'[data-cart-total]')=='S/ 899.00'
    assert b.js("return !document.querySelector('[data-storage-note]').hidden")
    close_cart(b)
    click(b,'[data-theme-toggle]')
    assert b.js("return document.documentElement.classList.contains('dark')")
    report['almacenamiento']['bloqueado_carrito_y_tema_en_memoria']=True

def inherited(b, report):
    for mode in themes:
        theme(b,mode)
        viewport(b,375,812)
        go(b)
        b.key(TAB)
        assert b.js("return document.activeElement.hash==='#contenido'")
        b.key(ENTER)
        assert b.js("return document.activeElement.id==='contenido' && getComputedStyle(document.querySelector('h1')).textDecorationLine==='underline'")
        focus(b,'[data-menu-toggle]')
        b.key(ENTER)
        b.key(TAB)
        assert b.js("return document.activeElement.hash==='#catalogo'")
        b.key(ESC)
        assert b.js("return document.activeElement.matches('[data-menu-toggle]') && document.activeElement.getAttribute('aria-expanded')==='false'")
        assert b.js("""return ['[data-menu-toggle]','[data-theme-toggle]','[data-cart-trigger]'].every(s=>
             document.querySelector(s).getBoundingClientRect().width>=44);""")
        wait = b.post('/execute/async',{'script':'const done=arguments[0];document.fonts.ready.then(()=>done());','args':[]})
        traffic(b)
        click(b,'[data-demo-form] button[type=submit]')
        assert active(b)=='nombre' and b.js("return document.querySelectorAll('form [aria-invalid=true]').length") == 4
        b.js("""for(const [id,value] of Object.entries({nombre:'Nombre Ejemplo',correo:'demo@example.test',categoria:'Audio',mensaje:'Datos ficticios.'})) {
           const field=document.getElementById(id);field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));
         }""")
        click(b,'[data-demo-form] button[type=submit]')
        assert 'No se envió' in text(b,'form [role=status]') and traffic(b)==[]
        form=b.js("""const box=document.querySelector('#contacto > div').getBoundingClientRect();
          return [box.width,parseFloat(getComputedStyle(document.querySelector('#contacto > div')).maxWidth)];""")
        assert form==[375,864],form
        colors={
          'texto tarjeta':contrast(b,'[data-product-name]','color','[data-product-grid] article'),
          'acento tarjeta':contrast(b,'[data-product-category]','color','[data-product-grid] article'),
          'texto filtro activo':contrast(b,'[data-category][aria-pressed=true]','color','[data-category][aria-pressed=true]'),
          'límite buscador':contrast(b,'#buscar-productos','borderTopColor','#buscar-productos'),
          'cta tarjeta':contrast(b,'[data-add]','color','[data-add]'),
        }
        assert all(score>=(3 if key=='límite buscador' else 4.5) for key,score in colors.items()),colors
        report['contrastes'][mode]=colors
    report['herencia_V2']={'formulario_centrado':True,'cero_peticiones_formulario':True,'foco':True,
        'tema_y_menu_y_carrito':True}

def independent_menu(b, report):
    report['navegacion_sin_modulo'] = {}
    for mode in themes:
        viewport(b,375,812)
        theme(b,mode)
        for route in ('sin-modulo', 'sin-importacion', 'file'):
            address = (root/'index.html').resolve().as_uri() if route == 'file' else url+route+'/'
            b.go(address)
            assert number_of_cards(b) == 12
            assert b.js("""return ['[data-theme-toggle]', '[data-cart-trigger]'].every(s => {
              const control = document.querySelector(s);
              return control.disabled && getComputedStyle(control).visibility === 'hidden';
            }) && document.querySelector('fieldset').disabled &&
              document.querySelector('[data-catalog-controls]').hidden""")
            focus(b,'[data-menu-toggle]')
            b.key(ENTER)
            b.key(TAB)
            assert b.js("return document.activeElement.hash==='#catalogo'")
            b.key(ESC)
            assert b.js("""return document.activeElement.matches('[data-menu-toggle]') &&
              document.activeElement.getAttribute('aria-expanded')==='false'""")
            b.key(ENTER)
            b.key(TAB)
            b.key(ENTER)
            assert active(b)=='catalogo'
            report['navegacion_sin_modulo'][mode+'-'+route] = {
                'productos':12, 'teclado_y_escape':True, 'foco_destino':True, 'controles_pendientes_inactivos':True}


def reserved_cart(b, report):
    records = []
    go(b)
    shape = """const header=document.querySelector('body > header');
      const cart=header.querySelector('[data-cart-trigger]');
      const badge=cart.querySelector('[data-cart-count]'), icon=cart.querySelector('svg');
      const rect=cart.getBoundingClientRect();
      return {alto:header.offsetHeight, ancho:rect.width, x:rect.x, y:rect.y,
        desactivado:cart.disabled, visibilidad:getComputedStyle(cart).visibility,
        unidades:badge.textContent, cabe:badge.getBoundingClientRect().right<=rect.right &&
          icon.getBoundingClientRect().right<=badge.getBoundingClientRect().left};"""
    source = '(() => { const read = () => {' + shape + """};
      function sample() {
        const cart = document.querySelector('[data-cart-trigger]');
        if (cart && !cart.disabled) return;
        if (cart && cart.getBoundingClientRect().width && document.fonts.status === 'loaded') {
          window.__pendingCart = read();
        }
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    })();"""
    hook=b.cdp('Page.addScriptToEvaluateOnNewDocument',{'source':source})['identifier']
    for width in (375,1440):
        viewport(b,width)
        setting(b,cart_key,json.dumps([{'id':product['id'],'quantity':99} for product in products]))
        b.go(url+'lento/')
        ready(b)
        early=b.js('return window.__pendingCart')
        late=b.js(shape)
        assert early and early['desactivado'] and early['visibilidad']=='hidden' and early['unidades']=='0',early
        assert not late['desactivado'] and late['visibilidad']=='visible' and late['unidades']=='1188' and late['cabe'],late
        assert all(abs(early[k]-late[k])<1 for k in ('alto','ancho','x','y')),(early,late)
        records.append({'ancho':width,'antes':early,'despues':late})
    b.cdp('Page.removeScriptToEvaluateOnNewDocument',{'identifier':hook})
    b.js("localStorage.removeItem(arguments[0])",cart_key)
    report['espacio_reservado_carrito']=records


def tall_header(b, report):
    checks=[]
    for mode in themes:
        theme(b,mode)
        for width,height in ((320,568),(320,780),(1024,800),(1280,800)):
            viewport(b,width,height)
            go(b)
            b.js("document.documentElement.style.fontSize='200%'")
            closed=b.js("return document.querySelector('body > header').offsetHeight")
            position=b.js("return getComputedStyle(document.querySelector('body > header')).position")
            exposed=[]
            if width==320:
                focus(b,'[data-menu-toggle]')
                b.key(ENTER)
                for _ in range(6):
                    b.key(TAB)
                    link=b.js("""const el=document.activeElement;
                      const rect=el.getBoundingClientRect(), nav=el.closest('header nav')?.getBoundingClientRect();
                      return {destino:el.hash, visible:!!nav && rect.top>=nav.top-1 &&
                        rect.bottom<=Math.min(nav.bottom,innerHeight)+1};""")
                    exposed.append(link)
            else:
                focus(b,'header nav a:last-child')
            b.key(ENTER)
            destination=b.js("""const target=document.getElementById('contacto');
              const title=target.querySelector('h2').getBoundingClientRect();
              const header=document.querySelector('body > header').getBoundingClientRect();
              return {foco:document.activeElement.id, visible:title.top>=Math.max(0,header.bottom)-1 &&
                title.bottom<=innerHeight+1};""")
            row={'tema':mode,'ancho':width,'alto':height,'texto':200,'cabecera':closed,
              'posicion':position,'opciones_menu':exposed,'destino_contacto':destination}
            checks.append(row)
            assert destination=={'foco':'contacto','visible':True} and all(item['visible'] for item in exposed),row
            b.js("document.documentElement.style.fontSize=''")
    report['cabecera_al_200_por_ciento']=checks


def functional():
    report={'responsive':[],'zoom':[],'capturas':[],'contrastes':{},'url':url}
    with Browser() as b:
        report['chromium']=b.version
        responsive_and_captures(b,report)
        severe=[log for log in b.logs('browser') if log['level'] in ('SEVERE','WARNING')]
        assert not severe,severe
        report['consola_flujo_normal']=severe
        inherited(b,report)
        cart_flow(b,report)
        independent_menu(b,report)
        reserved_cart(b,report)
        tall_header(b,report)
        resilience(b,report)
    with Browser(js=False) as b:
        viewport(b,320,780)
        b.go(url)
        raw=b.cdp('Runtime.evaluate',{'expression':"""JSON.stringify({
          productos:document.querySelectorAll('[data-product-grid] article').length,
          precios:document.querySelectorAll('[data-product-price]').length,
          controles:document.querySelector('[data-catalog-controls]').hidden,
          carrito:document.querySelector('[data-cart-trigger]').disabled &&
            getComputedStyle(document.querySelector('[data-cart-trigger]')).visibility==='hidden',
          menu:document.querySelector('[data-menu-toggle]').disabled,
          formulario:document.querySelector('fieldset').disabled,
          navegacion:getComputedStyle(document.querySelector('#navegacion')).display})""",'returnByValue':True})
        report['sin_js']=json.loads(raw['result']['value'])
        assert report['sin_js']=={'productos':12,'precios':12,'controles':True,'carrito':True,'menu':True,'formulario':True,'navegacion':'flex'}
    paths={'','index.html','assets/img/og-vertice.jpg','assets/img/favicon.svg','assets/fonts/space-grotesk-latin.woff2',
      'assets/fonts/inter-latin.woff2','css/styles.css','data/productos.json'}
    paths.update(x.relative_to(root).as_posix() for x in (root/'js').glob('*.js'))
    paths.update(x.relative_to(root).as_posix() for x in (root/'assets/img').glob('*.webp'))
    report['rutas_http']={}
    for ident in sorted(paths):
        with urlopen(url+ident,timeout=6) as response:
            assert response.status==200
            report['rutas_http']['/'+ident]=response.status
    source_zip = os.environ.get('VERTICE_IMAGENES_ORIGINALES')
    report['imagenes_sha256'] = {}
    for product in products:
        path = product['image']
        local = (root / path).read_bytes()
        if source_zip:
            with ZipFile(source_zip) as package:
                if path in package.namelist():
                    assert local == package.read(path)
                elif (Path('V2-Professional') / path).is_file():
                    assert local == (Path('V2-Professional') / path).read_bytes()
        report['imagenes_sha256'][path] = hashlib.sha256(local).hexdigest()
    (out/'pruebas-funcionales.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print('Regresión funcional V3 completa en Chromium', report['chromium'],len(report['rutas_http']),'rutas HTTP')

def accessibility():
    if not axe:
        raise SystemExit('Indica la ruta de axe.min.js en AXE_JS.')
    axe_code=Path(axe).read_text()
    results=[]
    with Browser() as b:
        for mode in themes:
            theme(b,mode)
            for width in (375,1440):
                viewport(b,width)
                go(b)
                for state in ('catalogo','carrito abierto'):
                    if state=='carrito abierto':
                        click(b,'[data-add="vt-aud-01"]')
                        open_cart(b)
                    b.js(axe_code)
                    info=b.post('/execute/async',{'script':"""const done=arguments[0];
                        axe.run({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}})
                        .then(r=>done({version:r.testEngine.version,pasadas:r.passes.length,
                          infracciones:r.violations.map(v=>[v.id,v.nodes.map(n=>n.target)]),
                          revision_manual:r.incomplete.map(v=>[v.id,v.nodes.map(n=>n.target)])}));""",'args':[]})
                    assert not info['infracciones'],(mode,width,state,info)
                    results.append({'tema':mode,'ancho':width,'estado':state,**info})
                click(b,'[data-clear-cart]')
                close_cart(b)
    (out/'axe.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
    print('Axe completo,',len(results),'estados de catálogo y carrito')

if __name__ == '__main__':
    {'funcional':functional,'axe':accessibility}[sys.argv[1]]()
