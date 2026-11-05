import "server-only";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { validation } from "@/lib/errors";

/**
 * Fetches one public web page on a staff member's click (P1.5). The URL comes
 * from the browser, so the server must not be talked into reading its own
 * network: only http(s), only hosts that resolve to public addresses, every
 * redirect re-checked, a short timeout and a size cap.
 */

const PRIVATE = new BlockList();
for (const [net, bits] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 3],
] as const) PRIVATE.addSubnet(net, bits, "ipv4");
for (const [net, bits] of [["::", 127], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8]] as const) PRIVATE.addSubnet(net, bits, "ipv6");

export function isPublicAddress(ip: string): boolean {
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  if (mapped) return isPublicAddress(mapped);
  const family = isIP(ip);
  if (family === 0) return false;
  return !PRIVATE.check(ip, family === 4 ? "ipv4" : "ipv6");
}

const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;

const unreadable = (why: string) => validation(`That page couldn't be read: ${why}. You can paste its text instead.`);

async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw unreadable("the address isn't valid");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw unreadable("only http and https pages can be read");
  if (url.username || url.password) throw unreadable("addresses with a login aren't supported");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw unreadable("the site wasn't found");
  // shortcut: checks the name's addresses before fetch, which resolves again (DNS rebinding window); pin the address with a custom agent if this ever runs unattended.
  if (!addresses.every((a) => isPublicAddress(a.address))) throw unreadable("it isn't a public website");
  return url;
}

export async function fetchPublicPage(raw: string): Promise<{ url: string; html: string }> {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; ; hop++) {
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
        headers: { "user-agent": "AalmaramProfileDraft/1.0", accept: "text/html,text/plain;q=0.9" },
      });
    } catch {
      throw unreadable("the site didn't answer in time");
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      if (hop >= MAX_REDIRECTS) throw unreadable("it redirects too many times");
      url = await assertPublicUrl(new URL(res.headers.get("location")!, url).toString());
      continue;
    }
    if (!res.ok) throw unreadable(`the site answered ${res.status}`);
    if (!/text\/(html|plain)|application\/xhtml/i.test(res.headers.get("content-type") ?? "")) throw unreadable("it isn't a web page");
    if (!res.body) throw unreadable("it was empty");

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        break; // the top of a page holds what a profile needs; keep what arrived
      }
      chunks.push(value);
    }
    return { url: url.toString(), html: new TextDecoder().decode(Buffer.concat(chunks)) };
  }
}
