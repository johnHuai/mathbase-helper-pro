"""Constrained SymPy worker: JSON expression tree only, no eval/sympify strings."""
import json
import re
import sys
import sympy as sp

MAX_NODES = 100
count = 0

def expr(node):
    global count
    count += 1
    if count > MAX_NODES or not isinstance(node, dict):
        raise ValueError("Invalid or oversized expression")
    kind = node.get("type")
    if kind == "integer":
        value = node.get("value")
        if not isinstance(value, int) or isinstance(value, bool) or abs(value) > 10**12:
            raise ValueError("Invalid integer")
        return sp.Integer(value)
    if kind == "rational":
        p, q = node.get("numerator"), node.get("denominator")
        if not all(isinstance(v, int) and not isinstance(v, bool) and abs(v) <= 10**12 for v in (p, q)) or q == 0:
            raise ValueError("Invalid rational")
        return sp.Rational(p, q)
    if kind == "symbol":
        name = node.get("name")
        if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]{0,31}", name):
            raise ValueError("Invalid symbol")
        return sp.Symbol(name)
    if kind in ("add", "mul"):
        args = node.get("args")
        if not isinstance(args, list) or not 2 <= len(args) <= 20:
            raise ValueError("Invalid arguments")
        values = [expr(arg) for arg in args]
        return sp.Add(*values) if kind == "add" else sp.Mul(*values)
    if kind == "pow":
        exponent = node.get("exponent")
        if not isinstance(exponent, int) or isinstance(exponent, bool) or not -20 <= exponent <= 20:
            raise ValueError("Invalid exponent")
        return expr(node.get("base")) ** exponent
    raise ValueError("Unsupported expression node")

def main():
    data = json.load(sys.stdin)
    value = expr(data["expression"])
    op = data["operation"]
    if op == "factor": result = sp.factor(value)
    elif op == "expand": result = sp.expand(value)
    elif op == "simplify": result = sp.simplify(value)
    elif op in ("diff", "integrate"):
        name = data.get("variable")
        if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]{0,31}", name):
            raise ValueError("Invalid variable")
        symbol = sp.Symbol(name)
        result = sp.diff(value, symbol) if op == "diff" else sp.integrate(value, symbol)
    else: raise ValueError("Unsupported operation")
    print(json.dumps({"status": "ok", "tool": "SymPy", "version": sp.__version__, "operation": op, "input": str(value), "result": str(result), "exact": True}))

if __name__ == "__main__":
    try: main()
    except Exception as e:
        print(json.dumps({"status": "error", "reason": str(e)}))
        sys.exit(1)
