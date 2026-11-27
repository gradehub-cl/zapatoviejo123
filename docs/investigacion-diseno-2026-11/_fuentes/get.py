import sys,re,subprocess,html
def text(url):
    h=subprocess.run(["curl","-sL","--max-time","25","-A","Mozilla/5.0",url],capture_output=True).stdout.decode("utf8","ignore")
    h=re.sub(r"(?is)<(script|style|nav|footer|svg|noscript).*?</\1>"," ",h)
    t=re.sub(r"(?s)<[^>]+>"," ",h); t=html.unescape(t); t=re.sub(r"\s+"," ",t)
    return t
url=sys.argv[1]; kws=sys.argv[2:]
t=text(url); print("LEN",len(t))
for k in kws:
    for m in list(re.finditer(re.escape(k),t,re.I))[:2]:
        print("--",k,":",t[max(0,m.start()-200):m.start()+450]); 
