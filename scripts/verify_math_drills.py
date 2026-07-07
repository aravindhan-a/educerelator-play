#!/usr/bin/env python3
"""Independent verifier for the generated math banks (classes 1-12).

Re-derives every generated answer from the prompt string using logic written
separately from the generator (exact Fraction arithmetic + independently
written fact tables), and checks:
  - the marked answerIndex is the correct answer
  - exactly one of the four choices is correct
  - all 13 languages present and identical (language-neutral drills)
  - 4 unique choices, no duplicate ids

Curated questions (id suffix <= 010, or inside the original class-1 levels)
are structure-checked but not recomputed (they were human-audited).

Usage: python3 scripts/verify_math_drills.py [classes...]
"""
import json, math, re, sys
from fractions import Fraction as F
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LANGS = ["en","hi","ta","te","bn","mr","gu","kn","ml","pa","ur","or","ne"]

SUP = {"⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9"}
SUB = {"₀":"0","₁":"1","₂":"2","₃":"3","₄":"4","₅":"5","₆":"6","₇":"7","₈":"8","₉":"9"}
def unsup(s): return "".join(SUP.get(c, c) for c in s)
def unsub(s): return "".join(SUB.get(c, c) for c in s)

# ---- independently written fact tables ----
TRIG = {
    ("sin", 0): "0", ("sin", 30): "1/2", ("sin", 45): "1/√2", ("sin", 60): "√3/2", ("sin", 90): "1",
    ("cos", 0): "1", ("cos", 30): "√3/2", ("cos", 45): "1/√2", ("cos", 60): "1/2", ("cos", 90): "0",
    ("tan", 0): "0", ("tan", 30): "1/√3", ("tan", 45): "1", ("tan", 60): "√3",
}
DERIV = {"x²":"2x","x³":"3x²","x⁴":"4x³","x⁵":"5x⁴","sin x":"cos x","cos x":"−sin x",
         "eˣ":"eˣ","ln x":"1/x","tan x":"sec² x"}
INTEG = {"2x":"x² + C","3x²":"x³ + C","4x³":"x⁴ + C","cos x":"sin x + C","sin x":"−cos x + C",
         "eˣ":"eˣ + C","1/x":"ln|x| + C","sec² x":"tan x + C"}
LIMITS = {"sin x/x":"1","tan x/x":"1","(eˣ − 1)/x":"1","(1 − cos x)/x":"0"}
IPOW = {"i²":"−1","i³":"−i","i⁴":"1","i⁵":"i"}

def parse_num(s):
    s = s.strip().replace("−", "-")
    if "/" in s:
        n, d = s.split("/"); return F(int(n), int(d))
    return F(s)

def icbrt(n):
    r = round(n ** (1/3))
    for k in (r-1, r, r+1):
        if k**3 == n: return k
    return None

def compute(prompt):
    """Returns ('num', Fraction) | ('str', exact) | ('set', frozenset) | None."""
    e = prompt.strip()
    body = e[:-3].strip() if e.endswith("= ?") else e

    # sequences: "a, b, c, ?"
    m = re.fullmatch(r"(\d+), (\d+), (\d+), \?", e)
    if m:
        a, b, c = map(int, m.groups())
        if b - a != c - b: raise ValueError("inconsistent sequence")
        return ("num", F(c + (b - a)))
    # trig identity sin² θ + cos² θ
    if re.fullmatch(r"sin² \d+° \+ cos² \d+° = \?", e):
        return ("num", F(1))
    # trig values
    m = re.fullmatch(r"(sin|cos|tan) (\d+)° = \?", e)
    if m:
        key = (m.group(1), int(m.group(2)))
        if key not in TRIG: raise ValueError("unknown trig angle")
        return ("str", TRIG[key])
    # derivatives / integrals / limits / i-powers
    m = re.fullmatch(r"d/dx\((.+)\) = \?", e)
    if m: return ("str", DERIV[m.group(1)])
    m = re.fullmatch(r"∫ (.+) dx = \?", e)
    if m: return ("str", INTEG[m.group(1)])
    m = re.fullmatch(r"lim\(x→0\) (.+) = \?", e)
    if m: return ("str", LIMITS[m.group(1)])
    if body in IPOW: return ("str", IPOW[body])
    # definite integrals ∫₀^b 2x dx = b², ∫₀^b 3x² dx = b³
    m = re.fullmatch(r"∫₀([⁰¹²³⁴⁵⁶⁷⁸⁹]+) 2x dx = \?", e)
    if m: b = int(unsup(m.group(1))); return ("num", F(b*b))
    m = re.fullmatch(r"∫₀([⁰¹²³⁴⁵⁶⁷⁸⁹]+) 3x² dx = \?", e)
    if m: b = int(unsup(m.group(1))); return ("num", F(b**3))
    # determinant 2x2
    m = re.fullmatch(r"det\[\[(−?\d+), (−?\d+)\], \[(−?\d+), (−?\d+)\]\] = \?", e)
    if m:
        a, b, c, d = (int(x.replace("−","-")) for x in m.groups())
        return ("num", F(a*d - b*c))
    # combinatorics / factorial / log
    m = re.fullmatch(r"C\((\d+), (\d+)\) = \?", e)
    if m: return ("num", F(math.comb(int(m.group(1)), int(m.group(2)))))
    m = re.fullmatch(r"P\((\d+), (\d+)\) = \?", e)
    if m: return ("num", F(math.perm(int(m.group(1)), int(m.group(2)))))
    m = re.fullmatch(r"(\d+)! = \?", e)
    if m: return ("num", F(math.factorial(int(m.group(1)))))
    m = re.fullmatch(r"log([₀-₉]+)\((\d+)\) = \?", e)
    if m:
        base, argn = int(unsub(m.group(1))), int(m.group(2))
        ans = round(math.log(argn, base))
        if base ** ans != argn: raise ValueError("non-exact log")
        return ("num", F(ans))
    # AP / GP nth term
    m = re.fullmatch(r"AP: (\d+), (\d+), (\d+), … → a([₀-₉]+) = \?", e)
    if m:
        a, b, c = int(m.group(1)), int(m.group(2)), int(m.group(3)); n = int(unsub(m.group(4)))
        d = b - a
        if c - b != d: raise ValueError("bad AP")
        return ("num", F(a + (n-1)*d))
    m = re.fullmatch(r"GP: (\d+), (\d+), (\d+), … → a([₀-₉]+) = \?", e)
    if m:
        a, b, c = int(m.group(1)), int(m.group(2)), int(m.group(3)); n = int(unsub(m.group(4)))
        if a == 0 or b % a or c % b or b//a != c//b: raise ValueError("bad GP")
        return ("num", F(a * (b//a) ** (n-1)))
    # linear equations  Ax ± B = C ⇒ x = ?
    m = re.fullmatch(r"(\d+)x ([+−]) (\d+) = (\d+) ⇒ x = \?", e)
    if m:
        A, s, B, C = int(m.group(1)), m.group(2), int(m.group(3)), int(m.group(4))
        num = C - B if s == "+" else C + B
        if num % A: raise ValueError("non-integer x")
        return ("num", F(num // A))
    # quadratic  x² ± Bx ± C = 0 ⇒ x = ?
    m = re.fullmatch(r"x² ([+−]) (\d+)x ([+−]) (\d+) = 0 ⇒ x = \?", e)
    if m:
        B = int(m.group(2)) * (1 if m.group(1) == "+" else -1)
        C = int(m.group(4)) * (1 if m.group(3) == "+" else -1)
        disc = B*B - 4*C
        r = math.isqrt(disc)
        if r*r != disc or (-B + r) % 2 or (-B - r) % 2: raise ValueError("non-integer roots")
        return ("set", frozenset(((-B + r)//2, (-B - r)//2)))
    # negative exponents a^−n
    m = re.fullmatch(r"(\d+)\^−(\d+) = \?", e)
    if m: return ("num", F(1, int(m.group(1)) ** int(m.group(2))))
    # LCM / HCF / √ / ∛ / percent
    m = re.fullmatch(r"LCM\((\d+), (\d+)\) = \?", e)
    if m: a, b = int(m.group(1)), int(m.group(2)); return ("num", F(a*b // math.gcd(a, b)))
    m = re.fullmatch(r"HCF\((\d+), (\d+)\) = \?", e)
    if m: return ("num", F(math.gcd(int(m.group(1)), int(m.group(2)))))
    m = re.fullmatch(r"√(\d+) = \?", e)
    if m:
        n = int(m.group(1)); r = math.isqrt(n)
        if r*r != n: raise ValueError("non-square")
        return ("num", F(r))
    m = re.fullmatch(r"∛(\d+) = \?", e)
    if m:
        r = icbrt(int(m.group(1)))
        if r is None: raise ValueError("non-cube")
        return ("num", F(r))
    m = re.fullmatch(r"(\d+)% × (\d+) = \?", e)
    if m: return ("num", F(int(m.group(1)), 100) * int(m.group(2)))
    # generic arithmetic (digits, + − × ÷, parens, ², ³, ^, decimals, fractions)
    if re.fullmatch(r"[\d\s()+×÷/.²³^−-]+= \?", e.replace(" ", " ")):
        expr = body.replace("−", "-").replace("×", "*").replace("÷", "/")
        expr = expr.replace("²", "**2").replace("³", "**3").replace("^", "**")
        expr = re.sub(r"\d+\.\d+|\d+", lambda mm: f"F('{mm.group(0)}')", expr)
        expr = re.sub(r"\*\*F\('(\d+)'\)", r"**\1", expr)
        return ("num", eval(expr, {"F": F, "__builtins__": {}}))
    return None

def choice_matches(kind, expected, choice):
    c = choice.strip()
    if kind == "str":
        return c == expected
    if kind == "set":
        m = re.fullmatch(r"\{(−?\d+), (−?\d+)\}", c)
        if not m: return False
        return frozenset(int(x.replace("−","-")) for x in m.groups()) == expected
    try:
        return parse_num(c) == expected
    except Exception:
        return False

def main():
    classes = [int(c) for c in sys.argv[1:]] or list(range(1, 13))
    problems, total, checked = [], 0, 0
    all_ids = set()
    for cls in classes:
        f = ROOT / "content" / "levels" / f"{cls}-math.json"
        if not f.exists(): continue
        data = json.loads(f.read_text())
        if "levels" in data:
            qs = [q for l in data["levels"] for q in l.get("questions", [])]
        else:
            qs = data.get("questions", [])
        for q in qs:
            total += 1
            qid = q.get("id", "?")
            if qid in all_ids: problems.append(f"{qid}: duplicate id")
            all_ids.add(qid)
            for field in [q["prompt"]] + q["choices"]:
                missing = [l for l in LANGS if l not in field]
                if missing: problems.append(f"{qid}: missing langs {missing}")
            en = [ch["en"] for ch in q["choices"]]
            # class 1 uses 3 age-appropriate choices; everything else uses 4
            if len(en) not in (3, 4) or len(set(en)) != len(en):
                problems.append(f"{qid}: choices not unique/valid count {en}")
            if not (0 <= q["answerIndex"] < len(en)): problems.append(f"{qid}: bad answerIndex")
            num = int(re.search(r"(\d+)$", qid).group(1)) if re.search(r"(\d+)$", qid) else 0
            if num <= 10: continue  # curated originals: human-audited
            # generated drills must be language-neutral
            if any(len(set(field.values())) != 1 for field in [q["prompt"]] + q["choices"]):
                problems.append(f"{qid}: generated drill not language-neutral")
            try:
                res = compute(q["prompt"]["en"])
            except Exception as ex:
                problems.append(f"{qid}: compute error '{q['prompt']['en']}' -> {ex}"); continue
            if res is None:
                problems.append(f"{qid}: unrecognised prompt form '{q['prompt']['en']}'"); continue
            kind, expected = res
            checked += 1
            n_correct = sum(1 for ch in en if choice_matches(kind, expected, ch))
            if not choice_matches(kind, expected, en[q["answerIndex"]]):
                problems.append(f"{qid}: '{q['prompt']['en']}' marked '{en[q['answerIndex']]}' but expected {expected}")
            if n_correct != 1:
                problems.append(f"{qid}: {n_correct} choices match the correct value ({en})")
    print(f"Scanned {total} questions; independently recomputed {checked} generated drills.")
    if problems:
        print(f"PROBLEMS ({len(problems)}):")
        for p in problems[:50]: print("  -", p)
        sys.exit(1)
    print("ALL CORRECT ✓  (every generated answer recomputed; one correct option each; 13 languages; unique ids)")

if __name__ == "__main__":
    main()
