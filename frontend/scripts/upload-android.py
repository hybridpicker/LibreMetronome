#!/usr/bin/env python3
"""Uploads a signed AAB from a build folder of dev/app-release/build-android.sh to a Google Play testing track.

Usage:
  frontend/scripts/upload-android.py --key <service account key> --status
  frontend/scripts/upload-android.py --dir ~/libremetronome-release/builds/android-<version>-<build>-<commit> \\
      --key <service account key> [--track internal|"<name of a closed test track>"] [--draft] [--run]

With --status it only lists the tracks and the version codes Play already holds, and changes nothing.

Without --run it is a dry run: it checks the build folder (SHA256SUMS, build-info.txt), signs in with the service account and opens
an edit that it throws away again, so the access is proven and nothing changes in Play. With --run it uploads the bundle, puts it on
the track (default: internal test) and commits the edit. If Play already holds a bundle with this version code (uploaded for
another track before), nothing is uploaded again: the existing bundle is put on the track, which is how a build moves from the
internal test to a closed test track.

Rules (docs/app-release.md):
  * the service account key lies OUTSIDE the repository and is never printed; only its path and the account name are shown;
  * only testing tracks: production is refused here, publishing to everybody stays a manual step of the owner in the Play Console;
  * no third-party packages: Python standard library plus the `openssl` command for the RS256 signature.
"""
import argparse
import base64
import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications"
UPLOAD = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications"
SCOPE = "https://www.googleapis.com/auth/androidpublisher"


def say(kind: str, text: str) -> None:
    print(f"{kind:<5} {text}")


def die(text: str) -> None:
    print(f"ERROR {text}", file=sys.stderr)
    sys.exit(2)


def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def access_token(key: dict) -> str:
    """OAuth token for the service account (JWT bearer grant). The private key only passes through a 0600 temp file for openssl."""
    now = int(time.time())
    head = b64(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
    claims = b64(json.dumps({"iss": key["client_email"], "scope": SCOPE, "aud": key["token_uri"], "iat": now, "exp": now + 900}).encode())
    signing_input = f"{head}.{claims}".encode()
    with tempfile.TemporaryDirectory() as tmp:
        pem = pathlib.Path(tmp) / "k.pem"
        pem.touch(mode=0o600)
        pem.write_text(key["private_key"])
        try:
            sig = subprocess.run(["openssl", "dgst", "-sha256", "-sign", str(pem)], input=signing_input, capture_output=True, check=True).stdout
        except (OSError, subprocess.CalledProcessError):
            die("could not sign the request with openssl (is the key file a service account key?)")
    body = urllib.parse.urlencode({"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": f"{head}.{claims}.{b64(sig)}"}).encode()
    reply = call("POST", key["token_uri"], None, body, "application/x-www-form-urlencoded")
    return reply["access_token"]


def call(method: str, url: str, token, body=None, content_type="application/json", timeout=120):
    headers = {"Content-Type": content_type} if body is not None else {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            raw = res.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        # Google's error text names the cause (permission, version code used, app still a draft); it holds no secrets
        try:
            message = json.loads(e.read()).get("error", {})
            message = message.get("message", message) if isinstance(message, dict) else message
        except ValueError:
            message = e.reason
        die(f"Google Play answered {e.code}: {message}")
    except urllib.error.URLError as e:
        die(f"no connection to Google Play: {e.reason}")


def read_info(folder: pathlib.Path) -> dict:
    info = {}
    for line in (folder / "build-info.txt").read_text().splitlines():
        if ": " in line:
            k, v = line.split(": ", 1)
            info[k.strip()] = v.strip()
    return info


def check_sums(folder: pathlib.Path, aab: pathlib.Path) -> None:
    sums = folder / "SHA256SUMS"
    if not sums.is_file():
        die(f"{sums} is missing: not a build folder of build-android.sh")
    want = next((line.split()[0] for line in sums.read_text().splitlines() if line.strip().endswith(aab.name)), None)
    if want is None:
        die(f"{aab.name} is not listed in SHA256SUMS")
    h = hashlib.sha256()
    with aab.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    if h.hexdigest() != want:
        die(f"{aab.name} does not match SHA256SUMS: the file changed after the build")
    say("ok", f"{aab.name} matches SHA256SUMS ({aab.stat().st_size // (1 << 20)} MB)")


def sign_in(key_path: pathlib.Path) -> str:
    try:
        key = json.loads(key_path.read_text())
        assert key["type"] == "service_account" and key["private_key"] and key["client_email"] and key["token_uri"]
    except (ValueError, KeyError, AssertionError):
        die(f"{key_path} is not a service account key")
    say("ok", f"service account {key['client_email']} (key: {key_path})")
    token = access_token(key)
    say("ok", "signed in at Google")
    return token


def show_status(token: str, package: str) -> None:
    """Lists every track with its releases and the bundles Play holds, then throws the edit away."""
    edit = call("POST", f"{API}/{package}/edits", token, b"{}")["id"]
    try:
        for t in call("GET", f"{API}/{package}/edits/{edit}/tracks", token).get("tracks", []):
            releases = [f"{r.get('name', '?')} {r.get('versionCodes', [])} {r.get('status', '?')}" for r in t.get("releases", [])]
            say("track", f"{t['track']}: {'; '.join(releases) or 'no release'}")
        codes = sorted(int(b.get("versionCode")) for b in call("GET", f"{API}/{package}/edits/{edit}/bundles", token).get("bundles", []))
        say("ok", f"bundles in Play: version codes {codes or 'none'}")
    finally:
        call("DELETE", f"{API}/{package}/edits/{edit}", token)


def main() -> None:
    p = argparse.ArgumentParser(description="Upload an AAB to a Google Play testing track (dry run without --run).")
    p.add_argument("--dir", help="build folder with the .aab, build-info.txt and SHA256SUMS")
    p.add_argument("--status", action="store_true", help="only list tracks and known version codes; changes nothing")
    p.add_argument("--package", default="com.libremetronome", help="application id for --status")
    p.add_argument("--key", required=True, help="service account key (JSON) outside the repository")
    p.add_argument("--track", default="internal", help="internal (default), alpha, beta or the name of a closed test track; never production")
    p.add_argument("--draft", action="store_true", help="save the release as a draft instead of rolling it out to the testers")
    p.add_argument("--run", action="store_true", help="really upload; without it nothing changes in Play")
    a = p.parse_args()

    if a.track.strip().lower() == "production":
        die("production is not uploaded by this script: publish to everybody by hand in the Play Console")
    key_path = pathlib.Path(a.key).expanduser().resolve()
    repo = pathlib.Path(__file__).resolve().parents[2]
    if repo in key_path.parents:
        die("the service account key lies inside the repository: move it out (for example to ~/libremetronome-release)")
    if not key_path.is_file():
        die(f"no key file at {key_path}")
    if key_path.stat().st_mode & 0o077:
        die(f"{key_path} is readable by others: chmod 600 it first")
    if a.status:
        show_status(sign_in(key_path), a.package)
        return
    if not a.dir:
        die("--dir is required unless --status is given")
    folder = pathlib.Path(a.dir).expanduser().resolve()
    aabs = sorted(folder.glob("*.aab"))
    if len(aabs) != 1:
        die(f"expected exactly one .aab in {folder}, found {len(aabs)}")
    aab = aabs[0]
    info = read_info(folder)
    package, code, name = info.get("bundle_id"), info.get("build_number"), info.get("build_name")
    if info.get("platform") != "android" or not package or not (code or "").isdigit():
        die("build-info.txt does not describe an Android build (platform, bundle_id, build_number)")
    say("ok", f"build {name} ({code}) of {package}, commit {info.get('commit', '?')[:10]}")
    check_sums(folder, aab)

    token = sign_in(key_path)

    edit = call("POST", f"{API}/{package}/edits", token, b"{}")["id"]
    say("ok", f"Play accepts edits for {package} from this account")
    names = [t["track"] for t in call("GET", f"{API}/{package}/edits/{edit}/tracks", token).get("tracks", [])]
    if a.track not in names:
        call("DELETE", f"{API}/{package}/edits/{edit}", token)
        die(f"no track {a.track!r} in Play; there are: {', '.join(names)}")
    tq = urllib.parse.quote(a.track, safe="")
    track = call("GET", f"{API}/{package}/edits/{edit}/tracks/{tq}", token)
    live = sorted(int(c) for r in track.get("releases", []) for c in r.get("versionCodes", []))
    say("ok", f"track {a.track}: version codes now {live or 'none'}")
    if live and int(code) <= max(live):
        call("DELETE", f"{API}/{package}/edits/{edit}", token)
        die(f"version code {code} is not higher than {max(live)} on track {a.track}: build with a higher --build-number")

    known = {str(b.get("versionCode")) for b in call("GET", f"{API}/{package}/edits/{edit}/bundles", token).get("bundles", [])}
    have = code in known
    if have:
        say("ok", f"Play already holds a bundle with version code {code}: it is reused, nothing is uploaded again")
    status = "draft" if a.draft else "completed"
    if not a.run:
        call("DELETE", f"{API}/{package}/edits/{edit}", token)
        what = f"put the existing bundle {code}" if have else f"upload {aab.name} and put {code}"
        say("dry", f"would {what} on track {a.track} as {status}; nothing changed in Play (add --run)")
        return

    if not have:
        say("run", f"uploading {aab.name} …")
        with aab.open("rb") as f:
            data = f.read()
        up = call("POST", f"{UPLOAD}/{package}/edits/{edit}/bundles?uploadType=media", token, data, "application/octet-stream", timeout=1800)
        if str(up.get("versionCode")) != code:
            call("DELETE", f"{API}/{package}/edits/{edit}", token)
            die(f"Play read version code {up.get('versionCode')} from the bundle, build-info.txt says {code}")
    release = {"name": f"{name} ({code})", "versionCodes": [code], "status": status}
    call("PUT", f"{API}/{package}/edits/{edit}/tracks/{tq}", token, json.dumps({"track": a.track, "releases": [release]}).encode())
    call("POST", f"{API}/{package}/edits/{edit}:commit", token, b"")
    say("ok", f"{name} ({code}) is on track {a.track} as {status}")
    if a.draft:
        say("next", "the release is a draft: roll it out in the Play Console")


if __name__ == "__main__":
    main()
