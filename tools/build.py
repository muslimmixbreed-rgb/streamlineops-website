"""Generate the StreamlineOps static pages into site/.
Run from the repository root:  python3 tools/build.py
Article and privacy text lives in tools/content/. The analyser itself
(site/analyser/tool.html) is edited directly and is not touched by this script.
"""
import math, pathlib, re, textwrap

HERE = pathlib.Path(__file__).resolve().parent.parent
OUT = HERE / "site"
CONTENT = HERE / "tools" / "content"
SITE = "https://www.streamlineops.co.uk"
EMAIL = "hello@streamlineops.co.uk"

NAV = [("Services", "services.html"), ("Insights", "blog/index.html"),
       ("Business Analyser", "analyser.html"), ("About", "about.html")]
WORDMARK = 'StreamlineOps<i aria-hidden="true"></i>'

# ------------------------------------------------------------------ artwork (generated SVG, no photos)
LINE, ACC, ACC2 = "#263040", "#14b8a6", "#0b7d71"

def hero_art(seed=1, n=34):
    """Tangled lines on the left converging into a tight, ordered bundle on the right."""
    paths = []
    for i in range(n):
        y0 = 40 + ((i * 97 + seed * 31) % 620)
        c1y = 40 + ((i * 53 + 211) % 620)
        y1 = 300 + (i - n / 2) * 6
        hi = i in (n // 2 - 1, n // 2 + 3, n // 2 + 7)
        col, w, op = (ACC, 1.6, 1) if hi else (LINE, 1, 1)
        paths.append(f'<path d="M-20 {y0} C 200 {c1y}, 330 {y1 + (i % 5 - 2) * 30}, 520 {y1} L 820 {y1}" stroke="{col}" stroke-width="{w}" fill="none" opacity="{op}"/>')
    nodes = "".join(f'<circle cx="520" cy="{300 + (i - n/2) * 6}" r="1.6" fill="#3a4658"/>' for i in range(n))
    return f'<svg viewBox="0 0 800 700" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">{"".join(paths)}{nodes}<circle cx="520" cy="{300 + (n//2 - 1 - n/2) * 6}" r="4" fill="{ACC}"/></svg>'

def art_signs():
    dots = []
    for r in range(9):
        for c in range(16):
            x, y = 40 + c * 45, 40 + r * 45
            hot = (r, c) in {(2, 4), (5, 11), (6, 3), (3, 13), (7, 8), (1, 9), (4, 6)}
            dots.append(f'<circle cx="{x}" cy="{y}" r="{9 if hot else 3}" fill="{ACC if hot else "#2c3747"}"/>')
            if hot: dots.append(f'<circle cx="{x}" cy="{y}" r="18" fill="none" stroke="{ACC}" stroke-opacity=".45"/>')
    return f'<svg viewBox="0 0 760 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="760" height="420" fill="#0a0e14"/>{"".join(dots)}</svg>'

def art_excel():
    cells = []
    for r in range(10):
        for c in range(8):
            x, y = 30 + c * 90, 24 + r * 38
            fill = "#121823"
            if r == 0: fill = "#1c2532"
            if r in (3, 7) and c > 0: fill = ACC2
            if r in (3, 7) and c == 6: fill = ACC
            cells.append(f'<rect x="{x}" y="{y}" width="86" height="34" fill="{fill}"/>')
            if r and c in (1, 2, 4) and r not in (3, 7):
                cells.append(f'<rect x="{x + 10}" y="{y + 15}" width="{30 + (r * c * 7) % 40}" height="4" fill="#2f3b4d"/>')
    return f'<svg viewBox="0 0 760 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="760" height="420" fill="#0a0e14"/>{"".join(cells)}</svg>'

def art_sop():
    rows = []
    for i in range(7):
        y = 40 + i * 52
        done = i < 4
        rows.append(f'<rect x="80" y="{y}" width="30" height="30" fill="none" stroke="{ACC if done else "#3a4658"}" stroke-width="2"/>')
        if done:
            rows.append(f'<path d="M87 {y + 15} l6 6 l11 -13" stroke="{ACC}" stroke-width="3" fill="none"/>')
        rows.append(f'<rect x="135" y="{y + 9}" width="{260 + (i * 83) % 260}" height="12" fill="{"#2f3b4d" if done else "#1c2532"}"/>')
    rows.append(f'<rect x="40" y="20" width="4" height="380" fill="{ACC}"/>')
    return f'<svg viewBox="0 0 760 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="760" height="420" fill="#0a0e14"/>{"".join(rows)}</svg>'

def page_art():
    """Quieter version of the hero lines for inner pages."""
    return hero_art(seed=4, n=22)

# ------------------------------------------------------------------ shell
def header(active, P):
    links = "\n      ".join(f'<a href="{P}{h}"{" aria-current=\"page\"" if n == active else ""}>{n}</a>' for n, h in NAV)
    return f'''<a class="skip" href="#main">Skip to content</a>
<header class="masthead">
  <div class="wrap">
    <a class="wordmark" href="{P}index.html">{WORDMARK}</a>
    <button class="menu-btn" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav class="nav" id="site-nav" aria-label="Main">
      {links}
      <a class="nav-cta" href="{P}contact.html">Contact</a>
    </nav>
  </div>
</header>'''

def footer(P):
    return f'''<footer class="foot">
  <div class="wrap">
    <div class="foot-top">
      <div>
        <a class="wordmark" href="{P}index.html">{WORDMARK}</a>
        <p>Operations consultancy for small and growing UK businesses: clearer processes, better tools and routines that hold up on the busy days.</p>
      </div>
      <div><h4>Services</h4><ul>
        <li><a href="{P}services.html#process">Process mapping</a></li>
        <li><a href="{P}services.html#excel">Excel &amp; tools</a></li>
        <li><a href="{P}services.html#sops">SOPs &amp; checklists</a></li>
        <li><a href="{P}services.html#kpis">KPIs</a></li>
      </ul></div>
      <div><h4>Explore</h4><ul>
        <li><a href="{P}blog/index.html">Insights</a></li>
        <li><a href="{P}analyser.html">Business Analyser</a></li>
        <li><a href="{P}about.html">About</a></li>
      </ul></div>
      <div><h4>Contact</h4><ul>
        <li><a href="mailto:{EMAIL}">{EMAIL}</a></li>
        <li><a href="#">LinkedIn</a></li>
        <li><a href="{P}contact.html">Send a message</a></li>
      </ul></div>
    </div>
    <div class="foot-base"><span>© <span data-year>2026</span> StreamlineOps. All rights reserved.</span><span><a href="{P}privacy.html">Privacy policy</a></span></div>
  </div>
</footer>
<script src="{P}js/main.js"></script>'''

PAGES = []
def page(path, title, desc, active, body, ogtype="website", scripts=(), noindex=False):
    if not noindex:
        PAGES.append(path)
    P = "../" * path.count("/")
    url = SITE + "/" + path.replace("index.html", "")
    html = f'''<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="{ogtype}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:site_name" content="StreamlineOps">
<meta name="theme-color" content="#0a0e14">{"<meta name=\"robots\" content=\"noindex\">" if noindex else ""}
<link rel="icon" href="{P}img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="{P}fonts/public-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{P}css/style.css">
</head>
<body>
{header(active, P)}
<main id="main">
{textwrap.dedent(body).strip()}
</main>
{footer(P)}{"".join(f'<script src="{P}js/{x}"></script>' for x in scripts)}
</body>
</html>
'''
    f = OUT / path
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(html.replace("{P}", P).replace("{EMAIL}", EMAIL), encoding="utf-8")

def page_hero(title, lede, kicker, crumb=None):
    c = f'<p class="crumbs"><a href="{{P}}index.html">Home</a><span>/</span>{crumb}</p>' if crumb else ""
    return f'''<section class="page-hero">
  <div class="hero-art">{page_art()}</div>
  <div class="wrap">
    {c}
    <p class="kicker">{kicker}</p>
    <h1>{title}</h1>
    <p class="lede">{lede}</p>
  </div>
</section>'''

# ------------------------------------------------------------------ shared content
POSTS = [
    ("blog/signs-your-processes-need-streamlining.html", "7 signs your business processes need streamlining",
     "Operations", "Seven everyday warning signs that your processes are costing you time, and a practical first step for each.", art_signs),
    ("blog/excel-job-tracker.html", "Build a simple job tracker in Excel in an afternoon",
     "Excel & tools", "A one-sheet tracker that shows every job, who owns it and what is running late.", art_excel),
    ("blog/write-an-sop-people-use.html", "How to write an SOP your team will actually use",
     "Procedures", "Procedures that sit unread in a folder help nobody. A one-page format that gets used.", art_sop),
]

def tile(post, P="{P}"):
    h, t, tag, d, art = post
    return f'''<a class="tile" href="{P}{h}">
  <div class="art">{art()}</div>
  <div class="body"><span class="tag">{tag}</span><h3>{t}</h3><p>{d}</p><span class="more">Read insight</span></div>
</a>'''

CAPS = [
    ("process", "Process review &amp; mapping", "Follow a piece of work from first request to finished job, and see every step, hand-off and wait.", "Quoting, order handling, onboarding"),
    ("excel", "Excel trackers &amp; dashboards", "Trackers, logs and one-page summaries with drop-downs, sound formulas and clear warnings.", "Job tracker, stock log, weekly summary"),
    ("sops", "SOPs &amp; checklists", "One-page procedures in plain English, tested on someone new and kept where the work happens.", "Month-end, refunds, new starters"),
    ("kpis", "KPIs &amp; performance", "A small set of measures that show whether things are on track, and a short routine to review them.", "Jobs overdue, response time, first-time fix"),
    ("projects", "Change projects", "A PRINCE2-informed approach, scaled for small businesses: clear stages, owners and checkpoints.", "New system, team restructure"),
    ("routines", "Team routines", "Handovers, short huddles and weekly check-ins that keep everyone aligned without filling the diary.", "Shift handover, 10-minute stand-up"),
]

def caps(link=True):
    out = []
    for i, (anchor, t, d, eg) in enumerate(CAPS, 1):
        tagname = "a" if link else "div"
        href = f' href="{{P}}services.html#{anchor}"' if link else f' id="{anchor}"'
        out.append(f'<{tagname} class="cap"{href}><span class="num">0{i}</span><h3>{t}</h3><p>{d}</p><span class="eg"><b>For example:</b> {eg}</span></{tagname}>')
    return '<div class="caps">\n' + "\n".join(out) + "\n</div>"

STEPS = '''<section class="band night">
  <div class="wrap">
    <div class="band-head">
      <div><p class="kicker">Our approach</p><h2>How an engagement works</h2></div>
      <p>Straightforward, practical and sized for a small business. You keep everything that's built.</p>
    </div>
    <ol class="steps">
      <li><h3>Discover</h3><p>An informal conversation about what's frustrating you and what "better" would look like.</p></li>
      <li><h3>Diagnose</h3><p>I see the process as it really runs and talk with the people who do the work.</p></li>
      <li><h3>Design</h3><p>A short, prioritised plan, with the quick wins first and bigger changes where they pay off.</p></li>
      <li><h3>Embed</h3><p>Tools, procedures and measures handed over so your team owns them.</p></li>
    </ol>
  </div>
</section>'''

PROMO = '''<section class="band accent-band">
  <div class="wrap promo">
    <div>
      <p class="kicker">Free tool</p>
      <h2>Find out where your operations are losing time</h2>
      <p class="lede">The free StreamlineOps Business Analyser scores how your business runs today and shows your three biggest operational gaps and what they are costing you.</p>
      <div class="actions"><a class="button" href="{P}analyser.html">Start the free analysis</a></div>
    </div>
    <ul class="promo-list">
      <li><span>01</span>Rate 20 statements about how you work</li>
      <li><span>02</span>See a score for each area of the business</li>
      <li><span>03</span>See your top three gaps and why they matter</li>
    </ul>
  </div>
</section>'''

def box(x, y, w, lines, cls=""):
    t = "".join(f'<tspan x="{x + w/2}" dy="{0 if i == 0 else 12.5}">{l}</tspan>' for i, l in enumerate(lines))
    ty = y + 22 - (len(lines) - 1) * 6.25 + 3.5
    return f'<g class="step {cls}"><rect x="{x}" y="{y}" width="{w}" height="44"/><text x="{x + w/2}" y="{ty}" text-anchor="middle">{t}</text></g>'

def arrow(x, y, gap):
    return f'<path class="line" d="M{x-gap} {y} H{x-3}"/><path class="line" d="M{x-7} {y-4} L{x-3} {y} L{x-7} {y+4}"/>'

def process_figure():
    w, gap = 80, 16
    before = [(["Email", "arrives"], ""), (["Typed into", "spreadsheet"], ""), (["Copied to", "job sheet"], "waste"),
              (["Manager", "checks"], ""), (["Re-typed", "into invoice"], "waste"), (["Customer", "chases"], "waste")]
    after = [(["Request", "form"], "clean"), (["One shared", "tracker"], "clean"), (["Job", "done"], "clean"), (["Invoice from", "tracker"], "clean")]
    y1, y2 = 34, 150
    parts = ['<text class="row-label" x="0" y="20">BEFORE</text>', f'<text class="row-label" x="0" y="{y2-14}">AFTER</text>']
    for i, (l, c) in enumerate(before):
        x = i * (w + gap); parts.append(box(x, y1, w, l, c))
        if i: parts.append(arrow(x, y1 + 22, gap))
    xa, xb = 3 * (w + gap) + w / 2, 1 * (w + gap) + w / 2
    parts.append(f'<path class="loop" d="M{xa} {y1+44} V{y1+68} H{xb} V{y1+48}"/><path class="loop" d="M{xb-4} {y1+53} L{xb} {y1+47} L{xb+4} {y1+53}"/>')
    parts.append(f'<text class="loop-label" x="{(xa+xb)/2}" y="{y1+84}" text-anchor="middle">sent back to fix errors</text>')
    for i, (l, c) in enumerate(after):
        x = i * (w + gap); parts.append(box(x, y2, w, l, c))
        if i: parts.append(arrow(x, y2 + 22, gap))
    W = 6 * w + 5 * gap
    return f'''<figure class="figure">
  <div class="figure-frame">
    <svg class="proc" viewBox="-1 0 {W+2} {y2+50}" role="img" aria-label="Before: six steps, with information typed in three times and a loop back to fix errors. After: four steps using one shared tracker.">{"".join(parts)}</svg>
  </div>
  <figcaption><b>Illustrative example: an order process, before and after.</b> Dashed steps are re-keying and chasing. They add work without adding anything for the customer.</figcaption>
</figure>'''

CREDS = '''<div class="creds">
  <div><b>10+ years</b><span>Hands-on operations experience</span></div>
  <div><b>PRINCE2</b><span>Qualified in structured project management</span></div>
  <div><b>Energy &amp; telecoms</b><span>Complex operations at British Gas (Centrica) and BT</span></div>
  <div><b>Hospitality</b><span>Supervisory leadership as a head bartender</span></div>
</div>'''

# ------------------------------------------------------------------ HOME
page("index.html", "StreamlineOps | Operations consultancy for small businesses",
     "StreamlineOps helps UK small businesses streamline their operations: process mapping, Excel tools, SOPs and KPIs. Try the free Business Analyser.",
     "", f'''
<section class="hero">
  <div class="hero-art">{hero_art()}</div>
  <div class="wrap hero-main">
    <p class="kicker">Operations consultancy for small businesses</p>
    <h1>Build a business that runs <span class="accent">smoothly</span>, even on the busy days.</h1>
    <p class="lede">StreamlineOps helps small and growing businesses bring structure to the way work gets done, with clear processes, practical tools and routines your team will actually use.</p>
    <div class="actions">
      <a class="button" href="{{P}}analyser.html">Try the free Business Analyser</a>
      <a class="more" href="{{P}}services.html">Explore our services</a>
    </div>
  </div>
  <div class="hero-foot">
    <div class="wrap">
      <div><b>10+ years</b><span>in operations</span></div>
      <div><b>PRINCE2</b><span>qualified</span></div>
      <div><b>Energy &amp; telecoms</b><span>large-scale operations</span></div>
      <div><b>University</b><span>graduate</span></div>
    </div>
  </div>
</section>

<section class="band mist">
  <div class="wrap">
    <div class="band-head">
      <div><p class="kicker">Insights</p><h2>Practical thinking on operations</h2></div>
      <p>Free, actionable guides for owners and managers. <a class="more" href="{{P}}blog/index.html">View all insights</a></p>
    </div>
    <div class="tiles feature">
      {"".join(tile(p) for p in POSTS)}
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <div class="band-head">
      <div><p class="kicker">Services</p><h2>How StreamlineOps can help</h2></div>
      <p>Practical support across the areas where small businesses most often lose time, money and patience.</p>
    </div>
    {caps()}
  </div>
</section>

<section class="band mist">
  <div class="wrap">
    <p class="kicker">Why it matters</p>
    <p class="statement">Most operational problems aren't people problems. They're <span style="color:var(--accent-ink)">process</span> problems.</p>
    <div style="margin-top:3rem">{process_figure()}</div>
  </div>
</section>

{STEPS}

<section class="band">
  <div class="wrap two-col wide-left">
    <div>
      <p class="kicker">About StreamlineOps</p>
      <h2>Big-organisation discipline, sized for small business</h2>
      <div class="prose">
        <p>StreamlineOps draws on more than ten years in operations, from supervising busy hospitality teams to working inside complex operations at major UK energy and telecoms businesses, including British Gas (Centrica) and BT.</p>
        <p>The common thread is creating structure: finding where work gets stuck, and designing processes that people can follow.</p>
      </div>
      <div class="actions"><a class="button dark" href="{{P}}about.html">More about us</a></div>
    </div>
    <div>{CREDS.replace('class="creds"', 'class="creds" style="grid-template-columns:1fr 1fr"')}</div>
  </div>
</section>

{PROMO}
''')

# ------------------------------------------------------------------ SERVICES
page("services.html", "Services | StreamlineOps",
     "Process mapping, Excel trackers, SOPs, KPIs, change projects and team routines for UK small businesses.",
     "Services", f'''
{page_hero("Services built around how your business really works", "Every engagement starts with how your business runs today. These are the areas where StreamlineOps most often helps.", "Services", "Services")}
<section class="band">
  <div class="wrap">
    {caps(link=False)}
  </div>
</section>
{STEPS}
<section class="band mist">
  <div class="wrap">
    <div class="band-head">
      <div><p class="kicker">What changes</p><h2>From re-keying and chasing to one clear flow</h2></div>
      <p>A simple example of what process work looks like in practice.</p>
    </div>
    {process_figure()}
  </div>
</section>
{PROMO}
''')

# ------------------------------------------------------------------ ABOUT
page("about.html", "About | StreamlineOps",
     "More than ten years in operations, from hospitality supervision to complex energy and telecoms operations. PRINCE2 qualified.",
     "About", f'''
{page_hero("Structure that large organisations rely on, sized for small business", "StreamlineOps was set up to bring practical operational discipline to businesses that don't have an operations department.", "About", "About")}
<section class="band">
  <div class="wrap two-col wide-left">
    <div class="prose">
      <h2 style="margin-top:0">Experience</h2>
      <p>StreamlineOps is built on more than ten years of hands-on operations experience in very different settings.</p>
      <p>As a head bartender in a supervisory role, I ran busy shifts where a good routine is the difference between a smooth night and a chaotic one. I've also worked inside large, complex operations at British Gas (part of Centrica) and BT, where a single process can pass through several teams and systems before it's finished.</p>
      <p>What connects those roles is the part I've always been good at: seeing where work gets stuck, and creating the structure and processes that let people do their jobs well.</p>
      <h2>Qualifications</h2>
      <p>I'm a university graduate and PRINCE2 qualified, and I'm currently studying business management, covering marketing, digital marketing and sales management. That gives a rounded view of how operations connect to the rest of a business.</p>
      <h2>How we work</h2>
      <ul class="ticks">
        <li>Plain English, always</li>
        <li>Use what you already have before buying anything new</li>
        <li>Honest about what will and won't make a difference</li>
        <li>Useful insights and tools shared freely</li>
      </ul>
      <div class="actions"><a class="button dark" href="{{P}}contact.html">Start a conversation</a></div>
    </div>
    <aside>
      <p class="kicker">At a glance</p>
      {CREDS.replace('class="creds"', 'class="creds" style="grid-template-columns:1fr"')}
    </aside>
  </div>
</section>
''')

# ------------------------------------------------------------------ ANALYSER
page("analyser.html", "Business Analyser | StreamlineOps",
     "A free operations health check for small businesses: score your processes, tools, procedures and customer handling, and see your biggest gaps. Two free analyses.",
     "Business Analyser", f'''
{page_hero("The Business Analyser", "A free operations health check for businesses that are already trading. Rate 20 statements about how your business runs and get a score for each area plus your three biggest gaps and what they are likely costing you. About 5 minutes, free to use twice.", "Free tool", "Business Analyser")}
<section class="band mist">
  <div class="wrap two-col wide-left">
    <div class="panel tool" id="analyser-gate">
      <form class="form" id="gate-form" name="analyser-signup" method="POST" data-netlify="true" netlify-honeypot="bot-field">
        <input type="hidden" name="form-name" value="analyser-signup">
        <p hidden><label>Leave this empty: <input name="bot-field"></label></p>
        <h2 style="font-size:1.6rem">Where should we send your results?</h2>
        <div><label for="g-name">First name</label><input id="g-name" name="name" type="text" autocomplete="given-name" required></div>
        <div><label for="g-email">Work email</label><input id="g-email" name="email" type="email" autocomplete="email" required></div>
        <div><label for="g-biz">Business name <span class="muted">(optional)</span></label><input id="g-biz" name="business" type="text" autocomplete="organization"></div>
        <div class="check"><input id="g-terms" name="consent_terms" type="checkbox" value="yes" required><label for="g-terms">I agree to StreamlineOps storing these details to provide the analyser, as set out in the <a href="{{P}}privacy.html">privacy policy</a>.</label></div>
        <div class="check"><input id="g-mkt" name="consent_marketing" type="checkbox" value="yes"><label for="g-mkt">Send me occasional insights, tips and offers by email. <span class="muted">(Optional. Unsubscribe any time.)</span></label></div>
        <div><button class="button dark" type="submit">Continue to the analyser</button></div>
        <p class="form-result" hidden></p>
      </form>
      <div id="analyser-used-up" hidden>
        <h2 style="font-size:1.6rem">You've used both free analyses</h2>
        <p>Thanks for trying it. If you'd like to talk through what it found, we're happy to have a no-obligation conversation.</p>
        <a class="button dark" href="{{P}}contact.html">Get in touch</a>
      </div>
    </div>
    <aside>
      <p class="kicker">What you get</p>
      <ul class="ticks">
        <li>A score for processes, tools, procedures and customers</li>
        <li>Your three biggest gaps, and why each one matters</li>
        <li>What good looks like, and which service fits</li>
        <li>Two free analyses, with no obligation</li>
      </ul>
      <p class="muted small">Your details are used to provide the analyser. Marketing emails are optional.</p>
    </aside>
  </div>
</section>
''')

# ------------------------------------------------------------------ CONTACT
page("contact.html", "Contact | StreamlineOps", "Get in touch with StreamlineOps about your business operations.", "", f'''
{page_hero("Let's talk about your operations", "A question about an insight, or a process that's slowing you down? Send a message and you'll get a personal reply.", "Contact", "Contact")}
<section class="band">
  <div class="wrap two-col wide-left">
    <form class="form" name="contact" method="POST" action="/thanks.html" data-netlify="true" netlify-honeypot="bot-field">
      <input type="hidden" name="form-name" value="contact">
      <p hidden><label>Leave this empty: <input name="bot-field"></label></p>
      <div><label for="c-name">Name</label><input id="c-name" name="name" type="text" autocomplete="name" required></div>
      <div><label for="c-email">Email</label><input id="c-email" name="email" type="email" autocomplete="email" required></div>
      <div><label for="c-biz">Business <span class="muted">(optional)</span></label><input id="c-biz" name="business" type="text" autocomplete="organization"></div>
      <div><label for="c-msg">How can we help?</label><textarea id="c-msg" name="message" required></textarea></div>
      <div class="check"><input id="c-ok" name="consent" type="checkbox" value="yes" required><label for="c-ok">I'm happy for StreamlineOps to use these details to reply to me (see the <a href="{{P}}privacy.html">privacy policy</a>).</label></div>
      <div><button class="button dark" type="submit">Send message</button></div>
      <p class="form-result" hidden></p>
    </form>
    <aside class="side">
      <h3>Email</h3><p><a href="mailto:{{EMAIL}}">{{EMAIL}}</a></p>
      <h3>LinkedIn</h3><p class="muted">Practical operations insights, shared regularly. <a href="#">Follow StreamlineOps</a></p>
      <h3>Based in</h3><p class="muted">The UK, working with small businesses.</p>
    </aside>
  </div>
</section>
''')

# ------------------------------------------------------------------ PRIVACY, INSIGHTS, POSTS (bodies reused from v1)
def content(name):
    return (CONTENT / name).read_text(encoding="utf-8").strip()

priv = content("privacy.html")
page("privacy.html", "Privacy policy | StreamlineOps", "How StreamlineOps collects, uses and protects your personal information.", "",
     f'{page_hero("Privacy policy", "How StreamlineOps collects, uses and protects your personal information.", "Legal")}\n<article class="article">\n{priv}\n</article>')

page("blog/index.html", "Insights | StreamlineOps",
     "Practical insights on processes, Excel, SOPs and running smoother operations in a small business.", "Insights", f'''
{page_hero("Insights", "Practical, plain-English thinking on processes, tools and the routines that keep a business running well.", "Insights", "Insights")}
<section class="band mist">
  <div class="wrap">
    <div class="tiles three">
      {"".join(tile(p) for p in POSTS)}
    </div>
  </div>
</section>
{PROMO}
''')

for post in POSTS:
    href, title, tag, desc, art = post
    body = content(href.split("/")[-1])
    others = [p for p in POSTS if p[0] != href]
    page(href, f"{title} | StreamlineOps", desc, "Insights", f'''
<section class="post-hero">
  <div class="wrap">
    <div>
      <p class="crumbs"><a href="{{P}}index.html">Home</a><span>/</span><a href="{{P}}blog/index.html">Insights</a></p>
      <span class="tag">{tag}</span>
      <h1>{title}</h1>
      <p class="meta">StreamlineOps · [publish date]</p>
    </div>
    <div class="art">{art()}</div>
  </div>
</section>
<article class="article">
  {body}
  <div class="endnote"><p>Want a quick view of where your own operations could be smoother? Try the free <a href="{{P}}analyser.html">Business Analyser</a>.</p></div>
</article>
<section class="band mist">
  <div class="wrap">
    <div class="band-head"><div><p class="kicker">More insights</p><h2>Keep reading</h2></div></div>
    <div class="tiles two">{"".join(tile(p) for p in others)}</div>
  </div>
</section>
''', "article")

page("analyser/tool.html", "Operations health check | StreamlineOps",
     "StreamlineOps Business Analyser: operations health check.", "Business Analyser", f'''
{page_hero("Operations health check", "Answer honestly: the more accurate your answers, the more useful your report. Nothing is shared unless you choose to send it.", "Business Analyser", '<a href="{{P}}analyser.html">Business Analyser</a><span>/</span>Health check')}
<section class="band mist">
  <div class="wrap">
    <div class="panel hc-panel" id="hc-app"><noscript>This tool needs JavaScript switched on.</noscript></div>
    <form class="panel hc-panel hc-noprint" id="results-form" name="analyser-results" method="POST" data-netlify="true" netlify-honeypot="bot-field" hidden>
      <input type="hidden" name="form-name" value="analyser-results">
      <p hidden><label>Leave this empty: <input name="bot-field"></label></p>
      <input type="hidden" name="name"><input type="hidden" name="email"><input type="hidden" name="business">
      <input type="hidden" name="profile"><input type="hidden" name="scores"><input type="hidden" name="gaps"><input type="hidden" name="frustration">
      <p class="kicker">Next step</p>
      <h2 style="font-size:1.7rem">Want to know how to close these gaps?</h2>
      <p class="muted">The right fix depends on how your business actually runs. Send your results to StreamlineOps and request a free, no-obligation chat about what would make the biggest difference for you.</p>
      <div class="form">
        <div><label for="r-phone">Phone number <span class="muted">(optional)</span></label><input id="r-phone" name="phone" type="text" autocomplete="tel"></div>
        <div><label for="r-msg">Anything you'd like to add? <span class="muted">(optional)</span></label><textarea id="r-msg" name="message"></textarea></div>
        <div class="check"><input id="r-ok" name="contact_consent" type="checkbox" value="yes" required><label for="r-ok">Please contact me about my results. I agree to StreamlineOps using these details as set out in the <a href="{{P}}privacy.html">privacy policy</a>.</label></div>
        <div><button class="button dark" type="submit">Send my results and request a chat</button></div>
      </div>
    </form>
  </div>
</section>
''', scripts=("analyser-questions.js", "analyser.js"), noindex=True)

page("thanks.html", "Message sent | StreamlineOps", "Thanks for getting in touch.", "",
     page_hero("Thanks, your message is on its way", 'You will get a personal reply. In the meantime, have a look at our <a href="/blog/">insights</a>.', "Message sent"))

page("404.html", "Page not found | StreamlineOps", "Page not found.", "",
     page_hero("Page not found", 'It may have moved. Try the <a href="/">home page</a> or our <a href="/blog/">insights</a>.', "404"))

(OUT / "img").mkdir(exist_ok=True)
(OUT / "img/favicon.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0a0e14"/><text x="14" y="23" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="800" fill="#fff">S</text><circle cx="25" cy="21" r="3" fill="#14b8a6"/></svg>')
urls = "\n".join(f"  <url><loc>{SITE}/{p.replace('index.html', '')}</loc></url>" for p in PAGES if p not in ("404.html", "thanks.html"))
(OUT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n')
(OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
print("built", len(PAGES), "pages")
