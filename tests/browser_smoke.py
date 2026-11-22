"""Optional Chromium verification / screenshot capture; app has no Python dependencies."""
from contextlib import contextmanager
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from pathlib import Path
from threading import Thread
import argparse
import json
import os
import re
import shutil
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

@contextmanager
def local_server():
    with ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=ROOT)) as server:
        worker = Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try: yield f"http://127.0.0.1:{server.server_port}/"
        finally:
            server.shutdown()
            worker.join()

def smoke(capture, title):
    with local_server() as url, sync_playwright() as pw:
        executable = os.environ.get("CHROMIUM_PATH") or shutil.which("chromium")
        browser = pw.chromium.launch(executable_path=executable, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width":1400,"height":900}, accept_downloads=True)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        def shot(context,filename):
            if capture:
                context.screenshot(path=ROOT / "assets" / (filename+".png"), animations="disabled", full_page=True)
        def click(label):
            page.get_by_role("button", name=label, exact=True).click()
        page.goto(url)
        expect(page.get_by_role("heading",name="夏夜展演與地方學習計畫")).to_be_visible()
        click("送交審查")
        expect(page.get_by_role("button",name="核准成果")).to_be_visible()
        click("退回補正")
        expect(page.get_by_role("status")).to_have_text("退回前請輸入補正原因")
        page.get_by_role("textbox",name="審查意見").fill("補上成果報告的佐證索引，並更正實際場次。")
        click("退回補正")
        expect(page.locator(".hero .status")).to_contain_text("已退回")
        shot(page,"04-returned")
        page.get_by_role("textbox",name=re.compile("實施場次")).fill("6")
        click("儲存草稿")
        page.reload()
        expect(page.get_by_role("textbox",name=re.compile("實施場次"))).to_have_value("6")
        click("補正後再送審")
        click("核准成果")
        click("發布示範版本")
        expect(page.get_by_role("heading",name="公開版預覽")).to_be_visible()
        assert "補上" not in page.locator(".preview").inner_text()
        with page.expect_download() as dl:
            click("匯出 JSON")
        exported = json.loads(Path(dl.value.path()).read_text())
        assert exported["fields"]["sessions"]=="6" and exported["status"]=="published" and len(exported["events"])==6
        shot(page,"01-workflow")
        click("證據檢索")
        expect(page.locator(".outcome")).to_contain_text("已找到可引用的原文")
        click("成果報告交付期限？")
        expect(page.locator(".outcome")).to_contain_text("同一問題出現多個日期")
        expect(page.locator(".value-list span")).to_have_count(3)
        assert page.locator(".hits mark").count()>0
        shot(page,"02-conflict")
        page.get_by_role("button",name="查閱原文").first.click()
        expect(page.get_by_role("dialog")).to_be_visible()
        expect(page.locator("dialog .selected")).to_have_count(1)
        page.keyboard.press("Escape")
        expect(page.get_by_role("dialog")).not_to_be_visible()
        click("個資保存年限多久？")
        expect(page.locator(".outcome")).to_contain_text("現有文件沒有足夠證據")
        expect(page.locator(".hits")).to_have_count(0)
        mobile=browser.new_page(viewport={"width":390,"height":844},device_scale_factor=1,is_mobile=True,has_touch=True)
        mobile.goto(url+"?tab=evidence")
        mobile.get_by_role("button",name="個資保存年限多久？",exact=True).click()
        assert mobile.evaluate("document.documentElement.scrollWidth")<=390
        expect(mobile.locator(".outcome")).to_contain_text("現有文件沒有足夠證據")
        shot(mobile,"03-mobile-gap")
        click("驗證紀錄")
        expect(page.locator(".score-grid")).to_contain_text("12/12")
        shot(page,"05-evaluation")
        page.locator("#template").select_option("policy")
        click("成果審核")
        expect(page.get_by_role("textbox",name="主責單位")).to_be_visible()
        expect(page.locator(".hero .status")).to_contain_text("草稿")
        click("證據檢索")
        click("成果報告交付期限？")
        expect(page.locator(".hits")).to_contain_text("2026-09-10")
        expect(page.locator(".outcome")).to_contain_text("已找到可引用的原文")
        click("來源文件")
        page.get_by_role("textbox",name="文件標題").fill("慢行問卷補記")
        page.get_by_role("textbox",name="原文段落").fill("問卷收到 40 份有效回覆，整體滿意度為 90%。")
        click("新增到本機佐證")
        click("證據檢索")
        page.get_by_role("searchbox").fill("問卷滿意度是多少？")
        click("找證據")
        expect(page.locator(".hits")).to_contain_text("90%")
        click("來源文件")
        payload=json.loads((ROOT/'examples'/'qa-evidence.json').read_text())
        page.locator('input[type=file]').set_input_files({"name":"qa-evidence.json","mimeType":"application/json",
            "buffer":json.dumps(payload).encode()})
        click("匯入彙總，建立佐證")
        click("證據檢索")
        page.get_by_role("searchbox").fill("資料品質檢查")
        click("找證據")
        expect(page.locator(".hits")).to_contain_text("共 18 筆，通過 13 筆、待覆核 1 筆、退件 4 筆")
        page.locator("#template").select_option("education")
        click("成果審核")
        expect(page.locator(".hero .status")).to_contain_text("已發布")
        assert not errors, errors
        print(title)
        browser.close()

if __name__=="__main__":
    arg=argparse.ArgumentParser()
    arg.add_argument("--capture",action="store_true")
    args=arg.parse_args()
    smoke(args.capture,"Chromium pass: full workflow, reload, export, conflict, source dialog, abstention, mobile width, template independence, new evidence, aggregate import.")
