"""Optional Qt WebEngine screenshot harness, executed inside Slicer's installed PythonQt.

The actual app is served over localhost, using its own JS, CSS and form handlers.
No static mock data is painted by the harness. Standard reruns are in browser_smoke.py.
"""
import json
import os
from pathlib import Path
import qt
import slicer

root = Path(os.environ['ANJI_PROJECT_ROOT'])
url = os.environ.get('ANJI_LOCAL_URL','http://127.0.0.1:8765/')
view = slicer.qSlicerWebWidget()
view.resize(1400, 1100)
view.show()
view.url = qt.QUrl(url)
i = 0
aggregate = json.loads((root/'examples'/'qa-evidence.json').read_text(encoding='utf8'))
checks = [
 ('首頁載入', "eq('.hero h1','夏夜展演與地方學習計畫')", None),
 ('送交審查', "click('[value=submit]'); eq('.hero .status','審查中')", None),
 ('退回意見必填', "click('[value=return]'); eq('.notice','退回前請輸入補正原因')", None),
 ('退回與稽核', """set('[name=note]','補上成果報告的佐證索引，並更正實際場次。');
 click('[value=return]'); if (!eq('.log','更正實際場次')) throw '缺退回理由'; eq('.hero .status','已退回')""", '04-returned'),
 ('寫入本機', """set('[name=sessions]','6');click('[value=save]');
 if (document.querySelector('[name=sessions]').value!=='6') throw '場次未儲存'; eq('.notice','草稿已儲存')""", None),
 ('重整回復', 'RELOAD', None),
 ('重整驗證', "document.querySelector('[name=sessions]').value==='6' && eq('.hero .status','已退回')", None),
 ('核准發布及白名單', """click('[value=submit]');click('[value=approve]');click('[value=publish]');
 eq('.preview','實施場次') && eq('.preview','6') && !eq('.preview','佐證索引') && eq('.hero .status','已發布')""", '01-workflow'),
 ('JSON 下載內容', """window.__export=null;
 const create=URL.createObjectURL;
 URL.createObjectURL=function(blob){blob.text().then(s=>window.__export=JSON.parse(s));return create.call(this,blob)};
 const clickOrig=HTMLAnchorElement.prototype.click;
 HTMLAnchorElement.prototype.click=function(){window.__dl=this.download};
 click('#download'); HTMLAnchorElement.prototype.click=clickOrig;URL.createObjectURL=create;
 window.__dl==='anji-education-published.json'""", None),
 ('匯出六筆軌跡', """window.__export.status==='published'&&window.__export.fields.sessions==='6'&&
 window.__export.events.length===6""", None),
 ('日期衝突保留與高亮', """nav('evidence'); pill('成果報告交付期限？');
 eq('.outcome','同一問題出現多個日期') && document.querySelectorAll('.value-list span').length===3 &&
 document.querySelectorAll('.hits mark').length>0""", '02-conflict'),
 ('來源原文定位', "click('.hits .src-link'); document.querySelector('dialog').open && !!document.querySelector('dialog section.selected')", None),
 ('關閉原文與拒答', "document.querySelector('dialog').close();pill('個資保存年限多久？');eq('.outcome','沒有足夠證據')&&!document.querySelector('.hits')", None),
 ('手機寬度', 'MOBILE', None),
 ('手機拒答無橫向溢位', "eq('.outcome','沒有足夠證據') && document.documentElement.scrollWidth <= 390", '03-mobile-gap'),
 ('回到桌面', 'DESKTOP', None),
 ('評估分數可驗', "nav('quality');eq('.score-grid','12/12') && eq('.score-grid','9/9')", '05-evaluation'),
 ('模板切換與文件獨立', """set('#template','policy','change');nav('report');
 if (!document.querySelector('[name=unit]')||document.querySelector('[name=sessions]')) throw '模板欄位錯誤';
 nav('evidence');pill('成果報告交付期限？');eq('.hits','2026-09-10')&&!eq('.outcome','多個日期')""", None),
 ('新增佐證後可找', """nav('sources');set('#source-add [name=title]','新的一份補充紀錄');
 set('#source-add [name=body]','問卷收到 40 份有效回覆，整體滿意度為 90%。');click('#source-add button');
 nav('evidence');ask('問卷滿意度是多少？');eq('.hits','90%')""", None),
 ('品管摘要開始匯入', """nav('sources'); const f=document.querySelector('#source-import input');
 const data=new DataTransfer();data.items.add(new File([JSON.stringify("""+json.dumps(aggregate)+""")],'qa-evidence.json',{type:'application/json'}));
 f.files=data.files;click('#source-import button');true""", None),
 ('彙總進入索引並有來源段落', """if(!eq('.notice','文件已新增'))throw document.querySelector('.notice').textContent;
 nav('evidence');ask('資料品質檢查');eq('.hits','共 18 筆')&&eq('.hits','通過 13 筆')&&eq('.hits','待覆核 1 筆')&&eq('.hits','退件 4 筆')&&eq('.hits','品管彙總')""", '06-integrated'),
 ('各模板狀態保持獨立', "set('#template','education','change');nav('report');eq('.hero .status','已發布')", None),
]
helper = """
 const q=s=>document.querySelector(s);
 const eq=(s,t)=>q(s) && q(s).textContent.includes(t);
 const click=s=>q(s).click();
 const set=(s,v,event='input')=>{q(s).value=v;q(s).dispatchEvent(new Event(event,{bubbles:true}));};
 const nav=id=>click('#nav [data-view='+id+']');
 const pill=value=>[...document.querySelectorAll('[data-query]')].find(x=>x.dataset.query===value).click();
 const ask=value=>{set('#ask input',value);click('#ask button');};
 """
def finish(ok):
    (root/'assets'/'qt-smoke-status.json').write_text(json.dumps({'pass':ok,'steps':i,'total':len(checks)},ensure_ascii=False),encoding='utf8')
    slicer.app.quit()

def runner():
    global i
    if i == len(checks):
        print('QT PASS',i,'scenarios',flush=True)
        finish(True)
        return
    title, js, capture = checks[i]
    if js in ('RELOAD','MOBILE','DESKTOP'):
        i += 1
        if js=='RELOAD': view.webView().reload()
        if js=='MOBILE': view.resize(390, 844)
        if js=='DESKTOP': view.resize(1400,900)
        qt.QTimer.singleShot(820,runner)
        return
    expressions=js.strip().split(';')
    # Return the last expression; earlier statements run on the same real page.
    while not expressions[-1].strip(): expressions.pop()
    prefix=';'.join(expressions[:-1])
    final=expressions[-1]
    view.evalJS("(()=>{try{"+helper+prefix+";return ("+final+")?'PASS':'FAIL false';}catch(e){return 'FAIL '+e;}})()")

def done(evalId, result):
    global i
    title, _, capture = checks[i]
    print(title, '=>', result, flush=True)
    if str(result).strip('"') != 'PASS':
        finish(False)
        return
    if capture:
        def grab():
            global i
            name=root/'assets'/(capture+'.png')
            if not view.webView().grab().save(str(name)):
                print('Failed to save',name,flush=True)
                finish(False)
                return
            i+=1
            if capture=='01-workflow': view.resize(1400,900)
            runner()
        qt.QTimer.singleShot(270,grab)
    else:
        i+=1
        qt.QTimer.singleShot(170,runner)

view.connect('evalResult(QString,QString)',done)
qt.QTimer.singleShot(1400,runner)
