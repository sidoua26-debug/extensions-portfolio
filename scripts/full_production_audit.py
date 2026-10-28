import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import html.parser
import json
import re
import sys

BASE_URL = "https://extensionguy.me"

class AssetLinkParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.internal_links = set()
        self.external_links = set()
        self.local_assets = set()
        self.cloudflare_endpoints = set()

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "a" and "href" in attrs_dict:
            href = attrs_dict["href"].strip()
            if href and not href.startswith("#") and not href.startswith("javascript:") and not href.startswith("mailto:"):
                # Check for Cloudflare email protection links
                if "/cdn-cgi/l/email-protection" in href:
                    self.cloudflare_endpoints.add(href)
                elif href.startswith("http://") or href.startswith("https://"):
                    if href.startswith(BASE_URL):
                        self.internal_links.add(href)
                    else:
                        self.external_links.add(href)
                else:
                    self.internal_links.add(href)

        # Local assets from img, script, link, source
        if tag in ["img", "script"] and "src" in attrs_dict:
            src = attrs_dict["src"].strip()
            if src and not src.startswith("data:"):
                self.local_assets.add(src)
        if tag == "link" and "href" in attrs_dict:
            href = attrs_dict["href"].strip()
            rel = attrs_dict.get("rel", "")
            if rel in ["stylesheet", "icon", "apple-touch-icon"]:
                self.local_assets.add(href)
        if tag == "source" and "srcset" in attrs_dict:
            srcset = attrs_dict["srcset"].strip()
            for part in srcset.split(","):
                src = part.strip().split(" ")[0]
                if src:
                    self.local_assets.add(src)

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def fetch_single_hop(url, method="GET"):
    opener = urllib.request.build_opener(NoRedirectHandler)
    req = urllib.request.Request(
        url,
        method=method,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"}
    )
    try:
        with opener.open(req, timeout=12) as resp:
            content = resp.read() if method == "GET" else b""
            return {
                "status": resp.getcode(),
                "headers": dict(resp.info().items()),
                "body": content,
                "location": None,
                "error": None
            }
    except urllib.error.HTTPError as e:
        location = e.headers.get("Location")
        return {
            "status": e.code,
            "headers": dict(e.headers.items()) if e.headers else {},
            "body": b"",
            "location": location,
            "error": str(e)
        }
    except Exception as e:
        return {
            "status": 0,
            "headers": {},
            "body": b"",
            "location": None,
            "error": str(e)
        }

def trace_url(url, max_hops=5, method="GET"):
    current_url = url
    hops = []
    final_body = b""
    final_headers = {}

    for _ in range(max_hops):
        res = fetch_single_hop(current_url, method=method)
        status = res["status"]
        location = res["location"]
        hops.append({
            "url": current_url,
            "status": status,
            "location": location
        })
        final_headers = res["headers"]
        final_body = res["body"]

        if status in [301, 302, 303, 307, 308] and location:
            # Resolve relative redirect locations
            current_url = urllib.parse.urljoin(current_url, location)
        else:
            break

    return {
        "requested_url": url,
        "final_url": current_url,
        "final_status": hops[-1]["status"] if hops else 0,
        "redirect_chain": hops[:-1] if len(hops) > 1 else [],
        "hops": hops,
        "headers": final_headers,
        "body": final_body,
        "is_redirected": len(hops) > 1,
        "error": hops[-1].get("error") if hops else None
    }

def main():
    print("=== Step 1: Discovering Sitemap URLs from Live robots.txt and sitemap.xml ===")
    robots_res = trace_url(f"{BASE_URL}/robots.txt")
    print(f"robots.txt status: {robots_res['final_status']}")

    sitemap_res = trace_url(f"{BASE_URL}/sitemap.xml")
    print(f"sitemap.xml status: {sitemap_res['final_status']}")

    if sitemap_res["final_status"] != 200:
        print("CRITICAL: sitemap.xml could not be fetched!")
        sys.exit(1)

    root = ET.fromstring(sitemap_res["body"].decode("utf-8"))
    ns = {"ns": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    sitemap_urls = [e.text.strip() for e in root.findall(".//ns:loc", ns)]
    print(f"Discovered sitemap URL count: {len(sitemap_urls)}")

    all_internal_links = set()
    all_external_links = set()
    all_local_assets = set()
    all_cloudflare_endpoints = set()

    page_audits = []

    print("\n=== Step 2: Crawling & Extracting Assets from All Sitemap URLs ===")
    for idx, u in enumerate(sitemap_urls):
        res = trace_url(u, method="GET")
        html_text = res["body"].decode("utf-8", errors="replace") if res["body"] else ""

        parser = AssetLinkParser()
        if html_text:
            parser.feed(html_text)

        # Canonical
        can_m = re.search(r'<link\s+rel=[\"\']canonical[\"\']\s+href=[\"\'](.*?)[\"\']', html_text, re.DOTALL)
        canonical = can_m.group(1).strip() if can_m else "MISSING"

        # Title
        title_m = re.search(r'<title>(.*?)</title>', html_text, re.DOTALL)
        title = " ".join(title_m.group(1).split()) if title_m else "MISSING"

        # Meta description
        desc_m = re.search(r'<meta\s+name=[\"\']description[\"\']\s+content=[\"\'](.*?)[\"\']', html_text, re.DOTALL)
        desc = desc_m.group(1).strip() if desc_m else "MISSING"

        # H1 count and text
        h1s = re.findall(r'<h1[^>]*>(.*?)</h1>', html_text, re.DOTALL)
        h1_clean = [" ".join(h.split()) for h in h1s]

        # Robots
        rob_m = re.search(r'<meta\s+name=[\"\']robots[\"\']\s+content=[\"\'](.*?)[\"\']', html_text, re.DOTALL)
        robots_meta = rob_m.group(1).strip() if rob_m else "none"
        x_robots = res["headers"].get("x-robots-tag", "none")

        # JSON-LD
        json_lds = re.findall(r'<script\s+type=[\"\']application/ld\+json[\"\']>(.*?)</script>', html_text, re.DOTALL)
        json_parsed = []
        for j in json_lds:
            try:
                obj = json.loads(j)
                json_parsed.append(obj.get("@type", "VALID_JSON"))
            except Exception as e:
                json_parsed.append(f"INVALID_JSON: {e}")

        # Resolve internal links and local assets relative to current page
        resolved_page_links = set()
        for l in parser.internal_links:
            abs_url = urllib.parse.urljoin(u, l)
            clean_url = abs_url.split("#")[0]
            if clean_url:
                all_internal_links.add(clean_url)
                resolved_page_links.add(clean_url)

        resolved_page_assets = set()
        for a in parser.local_assets:
            abs_asset = urllib.parse.urljoin(u, a)
            all_local_assets.add(abs_asset)
            resolved_page_assets.add(abs_asset)

        all_external_links.update(parser.external_links)
        all_cloudflare_endpoints.update(parser.cloudflare_endpoints)

        page_audits.append({
            "requested_url": u,
            "final_url": res["final_url"],
            "status": res["final_status"],
            "redirect_chain": res["redirect_chain"],
            "canonical": canonical,
            "canonical_match": (u == canonical),
            "title": title,
            "title_len": len(title),
            "desc": desc,
            "desc_len": len(desc) if desc != "MISSING" else 0,
            "h1_count": len(h1_clean),
            "h1": h1_clean[0] if h1_clean else "MISSING",
            "robots_meta": robots_meta,
            "x_robots_tag": x_robots,
            "json_ld_types": json_parsed,
            "internal_links_count": len(resolved_page_links),
            "local_assets_count": len(resolved_page_assets)
        })
        print(f"[{idx+1}/{len(sitemap_urls)}] {res['final_status']} {u} (Links: {len(resolved_page_links)}, Assets: {len(resolved_page_assets)})")

    print(f"\n=== Step 3: Verifying Internal Destination URLs (Total unique: {len(all_internal_links)}) ===")
    broken_internal = []
    redirected_internal = []
    for idx, iu in enumerate(sorted(all_internal_links)):
        chk = trace_url(iu, method="HEAD")
        if chk["final_status"] not in [200, 204]:
            # retry GET if HEAD is not allowed
            if chk["final_status"] in [405, 403]:
                chk = trace_url(iu, method="GET")

        if chk["final_status"] != 200:
            broken_internal.append({
                "requested_url": iu,
                "final_url": chk["final_url"],
                "final_status": chk["final_status"],
                "redirect_chain": chk["redirect_chain"],
                "error": chk["error"]
            })
        elif chk["is_redirected"]:
            redirected_internal.append({
                "requested_url": iu,
                "final_url": chk["final_url"],
                "redirect_chain": chk["redirect_chain"]
            })
        print(f"  [Link {idx+1}/{len(all_internal_links)}] {chk['final_status']} {iu} (Redirects: {len(chk['redirect_chain'])})")

    print(f"\n=== Step 4: Classifying Cloudflare-Managed Endpoints (Found: {len(all_cloudflare_endpoints)}) ===")
    cloudflare_managed_report = []
    for ep in sorted(all_cloudflare_endpoints):
        cloudflare_managed_report.append({
            "raw_endpoint": ep,
            "type": "Cloudflare Email Protection Token",
            "note": "Edge-injected obfuscation wrapper around contact email mailto link. Decoded client-side by Cloudflare script."
        })
        print(f"  [Cloudflare Endpoint] {ep[:70]}...")

    print(f"\n=== Step 5: Verifying Local Referenced Assets (Total unique: {len(all_local_assets)}) ===")
    broken_assets = []
    for idx, au in enumerate(sorted(all_local_assets)):
        chk = trace_url(au, method="HEAD")
        if chk["final_status"] != 200:
            if chk["final_status"] in [405, 403]:
                chk = trace_url(au, method="GET")
            if chk["final_status"] != 200:
                broken_assets.append({
                    "requested_url": au,
                    "final_url": chk["final_url"],
                    "status": chk["final_status"],
                    "error": chk["error"]
                })
        print(f"  [Asset {idx+1}/{len(all_local_assets)}] {chk['final_status']} {au}")

    print(f"\n=== Step 6: Auditing External Outbound Links (Total unique: {len(all_external_links)}) ===")
    external_link_results = []
    for idx, eu in enumerate(sorted(all_external_links)):
        chk = trace_url(eu, method="HEAD")
        if chk["final_status"] not in [200, 301, 302, 307, 308]:
            chk = trace_url(eu, method="GET")

        is_bot_blocked = chk["final_status"] in [403, 429] and any(
            store in eu for store in ["chromewebstore.google.com", "microsoftedge.microsoft.com"]
        )
        external_link_results.append({
            "requested_url": eu,
            "final_url": chk["final_url"],
            "status": chk["final_status"],
            "is_bot_blocked": is_bot_blocked
        })
        print(f"  [External {idx+1}/{len(all_external_links)}] {chk['final_status']} {eu} (Bot blocked: {is_bot_blocked})")

    summary = {
        "sitemap_url_count": len(sitemap_urls),
        "total_internal_links_checked": len(all_internal_links),
        "total_local_assets_checked": len(all_local_assets),
        "total_cloudflare_endpoints_found": len(all_cloudflare_endpoints),
        "total_external_links_checked": len(all_external_links),
        "broken_internal_links_count": len(broken_internal),
        "broken_internal_links": broken_internal,
        "redirected_internal_links_count": len(redirected_internal),
        "redirected_internal_links": redirected_internal,
        "cloudflare_managed_endpoints": cloudflare_managed_report,
        "broken_local_assets_count": len(broken_assets),
        "broken_local_assets": broken_assets,
        "external_links_blocked_by_anti_bot": [e for e in external_link_results if e["is_bot_blocked"]],
        "page_audits": page_audits
    }

    with open("full_crawl_results.json", "w") as f:
        json.dump(summary, f, indent=2)

    print("\n=== Audit Completed Successfully! Results written to full_crawl_results.json ===")
    print(f"Sitemap URLs Checked: {len(sitemap_urls)} (All HTTP 200: {all(p['status'] == 200 for p in page_audits)})")
    print(f"Internal Links Checked: {len(all_internal_links)} | Genuine Broken: {len(broken_internal)} | Redirected: {len(redirected_internal)}")
    print(f"Cloudflare Endpoints Classified: {len(all_cloudflare_endpoints)}")
    print(f"Local Assets Checked: {len(all_local_assets)} | Broken: {len(broken_assets)}")
    print(f"Canonical Matches: {sum(1 for p in page_audits if p['canonical_match'])}/{len(page_audits)}")
    print(f"Single H1 Matches: {sum(1 for p in page_audits if p['h1_count'] == 1)}/{len(page_audits)}")
    print(f"JSON-LD Valid: {sum(1 for p in page_audits if all(not str(t).startswith('INVALID') for t in p['json_ld_types']))}/{len(page_audits)}")

if __name__ == "__main__":
    main()
