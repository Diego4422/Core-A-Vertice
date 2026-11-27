import importlib.util
import json
from pathlib import Path
import sys


directory = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('vertice_qa', directory / 'qa-chromium.py')
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
widths = (320, 375, 412, 768, 1023, 1024, 1280, 1440)
scenarios = ('normal', 'modulo-lento', 'carga-lenta')
observe = """
window.shifts = [];
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) if (!entry.hadRecentInput) {
    shifts.push({ time: entry.startTime, score: entry.value,
      nodes: entry.sources.map(({node}) => node?.id || node?.nodeName || '') });
  }
}).observe({type:'layout-shift', buffered:true});
"""


def cls(shifts):
    start = previous = -6000
    session = peak = 0
    for shift in sorted(shifts, key=lambda item: item['time']):
        current = shift['time']
        if current - previous > 1000 or current - start > 5000:
            start, session = current, 0
        session += shift['score']
        peak = max(peak, session)
        previous = current
    return round(peak, 6)


def main():
    run = sys.argv[1]
    if run not in ('antes', 'despues'):
        raise SystemExit('Usa antes o despues.')
    prefix = 'base-' if run == 'antes' else ''
    results = []
    with qa.Browser() as browser:
        browser.cdp('Network.enable')
        browser.cdp('Network.setCacheDisabled', {'cacheDisabled': True})
        browser.cdp('Page.addScriptToEvaluateOnNewDocument', {'source': observe})
        for scenario in scenarios:
            for mode in qa.themes:
                qa.theme(browser, mode)
                for width in widths:
                    qa.viewport(browser, width, 823)
                    qa.go(browser, f'{prefix}{scenario}/')
                    browser.post('/execute/async', {'script': '''
                        const done = arguments[0];
                        document.fonts.ready.then(() => requestAnimationFrame(() =>
                          requestAnimationFrame(() => setTimeout(done, 120))));
                    ''', 'args': []})
                    samples = browser.js('return window.shifts')
                    actual = browser.js('return innerWidth')
                    assert actual == width, (width, actual)
                    row = {'ancho': width, 'tema': mode, 'carga': scenario, 'cls': cls(samples),
                           'desplazamientos': samples}
                    results.append(row)
                    if run == 'despues':
                        assert row['cls'] <= 0.1, row
    report = {'chromium': browser.version, 'repeticiones': len(results),
              'demoras_ms': {'modulo-lento': [850,0], 'carga-lenta': [850,1200]}, 'mediciones': results}
    (directory / f'cls-{run}.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(run, len(results), 'mediciones CLS', {w: max(x['cls'] for x in results if x['ancho']==w) for w in widths})


if __name__ == '__main__':
    main()
