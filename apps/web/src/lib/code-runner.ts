import vm from 'node:vm';
import { spawn } from 'node:child_process';

export interface RunnerTestCase {
  input: string;
  output: string;
  isHidden?: boolean;
}

export interface TestCaseResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  stdout?: string;
  passed: boolean;
  runtimeMs: number;
  memoryMb?: string;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  passed: boolean;
  passedCount: number;
  totalCount: number;
  runtimeMs: number;
  memoryMb?: string;
  stdout: string;
  output: string;
  results: TestCaseResult[];
  message: string;
  error?: string;
}

function normalize(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return value.trim().replace(/^['"]|['"]$/g, '');
  try {
    return JSON.stringify(value);
  } catch {
    return String(value).trim();
  }
}

function splitTopLevel(value: string) {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let quote = '';
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      current += char;
      if (char === quote && value[index - 1] !== '\\') quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if ('[{('.includes(char)) depth += 1;
    if (']})'.includes(char)) depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseInputValue(value: string): unknown {
  const trimmed = value.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* accept friendly assignment syntax */
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  const quoted = trimmed.match(/^(['"])([\s\S]*)\1$/);
  return quoted ? quoted[2] : trimmed;
}

function testArguments(input: string) {
  const assignments = splitTopLevel(input);
  if (assignments.length && assignments.every((part) => /^[A-Za-z_$][\w$]*\s*=/.test(part))) {
    return assignments.map((part) => parseInputValue(part.slice(part.indexOf('=') + 1)));
  }
  const parsed = parseInputValue(input);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function callableName(code: string): string | null {
  if (/\bfunction\s+solution\s*\(/.test(code) || /\b(?:const|let|var)\s+solution\s*=/.test(code)) return 'solution';
  if (/\bfunction\s+twoSum\s*\(/.test(code) || /\b(?:const|let|var)\s+twoSum\s*=/.test(code)) return 'twoSum';
  if (/\bfunction\s+lengthOfLongestSubstring\s*\(/.test(code) || /\b(?:const|let|var)\s+lengthOfLongestSubstring\s*=/.test(code))
    return 'lengthOfLongestSubstring';
  if (/\bfunction\s+main\s*\(/.test(code) || /\b(?:const|let|var)\s+main\s*=/.test(code)) return 'main';
  const declaration = code.match(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/);
  if (declaration) return declaration[1];
  const expression = code.match(
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/
  );
  return expression?.[1] || null;
}

function execute(code: string, input?: string) {
  const functionName = callableName(code);
  const args = input === undefined ? [] : testArguments(input);
  const invocation = functionName
    ? `(typeof ${functionName} === 'function' ? (${functionName}.length === 1 && __runnerArgs.length !== 1 ? ${functionName}(__runnerArgs) : ${functionName}(...__runnerArgs)) : undefined)`
    : 'undefined';
  const harness = `
    const __runnerLogs = [];
    const __runnerFormat = (value) => {
      if (typeof value === 'string') return value;
      if (value === undefined) return 'undefined';
      try { return JSON.stringify(value); } catch { return String(value); }
    };
    const console = Object.freeze({
      log: (...values) => __runnerLogs.push(values.map(__runnerFormat).join(' ')),
      info: (...values) => __runnerLogs.push(values.map(__runnerFormat).join(' ')),
      warn: (...values) => __runnerLogs.push(values.map(__runnerFormat).join(' ')),
      error: (...values) => __runnerLogs.push(values.map(__runnerFormat).join(' ')),
    });
    const __runnerArgs = ${JSON.stringify(args)};
    ${code}
    ;({ value: ${invocation}, logs: __runnerLogs });
  `;
  const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
  return new vm.Script(harness).runInContext(context, { timeout: 2000 }) as { value: unknown; logs: string[] };
}

/**
 * Executes JavaScript code in an isolated VM
 */
export async function runJavaScript(
  code: string,
  testCases: RunnerTestCase[],
  revealHidden = false
): Promise<ExecutionResult> {
  if (code.length > 50_000) throw new Error('Code exceeds the 50KB execution limit.');
  const cases = testCases.slice(0, 30);
  const results: TestCaseResult[] = [];
  let passedCount = 0;
  const started = Date.now();

  if (!cases.length) {
    const caseStart = Date.now();
    try {
      const execution = execute(code);
      const returned = normalize(execution.value);
      const stdout = execution.logs.join('\n');
      return {
        success: true,
        passed: true,
        passedCount: 0,
        totalCount: 0,
        runtimeMs: Date.now() - started,
        stdout,
        output: stdout || (returned === 'undefined' ? '' : returned),
        results: [{ input: 'N/A', expectedOutput: 'Clean Execution', actualOutput: stdout || returned, stdout, passed: true, runtimeMs: Date.now() - caseStart }],
        message: stdout || returned !== 'undefined' ? 'Code executed successfully.' : 'Code executed successfully with no output.',
      };
    } catch (error: any) {
      return {
        success: true,
        passed: false,
        passedCount: 0,
        totalCount: 0,
        runtimeMs: Date.now() - started,
        stdout: '',
        output: '',
        results: [],
        message: 'Execution failed.',
        error: error instanceof Error ? error.message : 'Runtime error',
      };
    }
  }

  const allLogs: string[] = [];
  for (const testCase of cases) {
    const caseStart = Date.now();
    const hidden = Boolean(testCase.isHidden && !revealHidden);
    try {
      const execution = execute(code, testCase.input);
      const stdout = execution.logs.join('\n');
      if (stdout) allLogs.push(stdout);
      const returned = normalize(execution.value);
      const actualOutput =
        returned === 'undefined' && execution.logs.length
          ? execution.logs[execution.logs.length - 1]
          : returned;

      // Strict matching: NEVER treat undefined/null as passed if expected is not undefined/null!
      const normActual = normalize(actualOutput);
      const normExpected = normalize(testCase.output);
      const passed = normActual === normExpected && normActual !== 'undefined';

      if (passed) passedCount += 1;
      results.push({
        input: hidden ? 'Hidden test case' : testCase.input,
        expectedOutput: hidden ? 'Hidden' : testCase.output,
        actualOutput: hidden ? (passed ? 'Passed' : 'Failed') : actualOutput,
        stdout: hidden ? '' : stdout,
        passed,
        runtimeMs: Date.now() - caseStart,
      });
    } catch (error: any) {
      results.push({
        input: hidden ? 'Hidden test case' : testCase.input,
        expectedOutput: hidden ? 'Hidden' : testCase.output,
        actualOutput: hidden ? 'Failed' : 'Runtime error',
        stdout: '',
        passed: false,
        runtimeMs: Date.now() - caseStart,
        error: error instanceof Error ? error.message : 'Execution failed',
      });
    }
  }

  return {
    success: true,
    passed: passedCount === cases.length,
    passedCount,
    totalCount: cases.length,
    runtimeMs: Date.now() - started,
    stdout: allLogs.join('\n'),
    output: allLogs.join('\n'),
    results,
    message: `${passedCount}/${cases.length} test cases passed.`,
  };
}

/**
 * Executes real Python code in an isolated subprocess with strict timeouts
 */
export async function runPython(
  code: string,
  testCases: RunnerTestCase[],
  revealHidden = false
): Promise<ExecutionResult> {
  if (code.length > 50_000) throw new Error('Code exceeds the 50KB execution limit.');
  const cases = testCases.slice(0, 30);
  const started = Date.now();

  const pythonScript = `
import sys, json, time

user_code = ${JSON.stringify(code)}
test_cases = ${JSON.stringify(cases)}

# Execute user code in a dedicated clean dict
user_globals = {}
try:
    exec(user_code, user_globals)
except Exception as e:
    print(json.dumps({
        "success": False,
        "error": f"{type(e).__name__}: {str(e)}"
    }))
    sys.exit(0)

# Discover entry callable
candidate_names = ['solution', 'solve', 'twoSum', 'two_sum', 'lengthOfLongestSubstring', 'length_of_longest_substring', 'main']
entry_func = None
for name in candidate_names:
    if name in user_globals and callable(user_globals[name]):
        entry_func = user_globals[name]
        break

if not entry_func:
    for k, v in list(user_globals.items()):
        if callable(v) and not k.startswith('_'):
            entry_func = v
            break

def parse_val(v):
    v = v.strip()
    try:
        return json.loads(v)
    except Exception:
        pass
    if v.lower() == 'true': return True
    if v.lower() == 'false': return False
    if v.lower() == 'none' or v.lower() == 'null': return None
    try:
        return int(v) if '.' not in v else float(v)
    except Exception:
        pass
    return v

def split_top_level(s):
    parts = []
    current = []
    depth = 0
    quote = None
    for i, c in enumerate(s):
        if quote:
            current.append(c)
            if c == quote and (i == 0 or s[i-1] != '\\\\'):
                quote = None
            continue
        if c == '"' or c == "'":
            quote = c
            current.append(c)
            continue
        if c in '[{(':
            depth += 1
        elif c in ']})':
            depth -= 1
        elif c == ',' and depth == 0:
            parts.append(''.join(current).strip())
            current = []
            continue
        current.append(c)
    if current:
        parts.append(''.join(current).strip())
    return [p for p in parts if p]

def parse_args(inp_str):
    parts = split_top_level(inp_str)
    assignments = []
    for p in parts:
        if '=' in p:
            val = p.split('=', 1)[1].strip()
            assignments.append(parse_val(val))
    if len(assignments) == len(parts) and len(assignments) > 0:
        return assignments
    try:
        j = json.loads(inp_str)
        if isinstance(j, list): return j
        return [j]
    except Exception:
        return [inp_str]

results = []
passed_count = 0

for tc in test_cases:
    t0 = time.perf_counter()
    inp = tc.get('input', '')
    exp = tc.get('output', '')
    if not entry_func:
        results.append({
            "input": inp,
            "expectedOutput": exp,
            "actualOutput": "Error: No solution function defined in Python submission.",
            "passed": False,
            "runtimeMs": 0,
            "error": "Missing entry function"
        })
        continue

    try:
        args = parse_args(inp)
        try:
            actual = entry_func(*args)
        except TypeError:
            actual = entry_func(args)
        
        elapsed = round((time.perf_counter() - t0) * 1000, 2)
        norm_actual = json.dumps(actual, sort_keys=True) if not isinstance(actual, str) else actual.strip()
        try:
            exp_parsed = json.loads(exp)
            norm_exp = json.dumps(exp_parsed, sort_keys=True)
        except Exception:
            norm_exp = exp.strip()

        passed = (norm_actual == norm_exp)
        if passed: passed_count += 1
        results.append({
            "input": inp,
            "expectedOutput": exp,
            "actualOutput": norm_actual,
            "passed": passed,
            "runtimeMs": elapsed
        })
    except Exception as e:
        elapsed = round((time.perf_counter() - t0) * 1000, 2)
        results.append({
            "input": inp,
            "expectedOutput": exp,
            "actualOutput": f"{type(e).__name__}: {str(e)}",
            "passed": False,
            "runtimeMs": elapsed,
            "error": str(e)
        })

print(json.dumps({
    "success": True,
    "passedCount": passed_count,
    "totalCount": len(test_cases),
    "results": results
}))
`.trim();

  return new Promise((resolve) => {
    const py = spawn('python', ['-c', pythonScript], {
      timeout: 4000,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    py.on('close', (exitCode) => {
      const runtimeMs = Date.now() - started;
      if (exitCode !== 0 && !stdout) {
        return resolve({
          success: false,
          passed: false,
          passedCount: 0,
          totalCount: cases.length,
          runtimeMs,
          stdout: '',
          output: stderr || 'Python execution timed out or failed.',
          results: cases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.output,
            actualOutput: stderr || 'Execution error',
            passed: false,
            runtimeMs,
            error: stderr,
          })),
          message: stderr || 'Python execution failed.',
          error: stderr,
        });
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        if (!parsed.success) {
          return resolve({
            success: false,
            passed: false,
            passedCount: 0,
            totalCount: cases.length,
            runtimeMs,
            stdout: '',
            output: parsed.error || 'Execution failed',
            results: cases.map((tc) => ({
              input: tc.input,
              expectedOutput: tc.output,
              actualOutput: parsed.error,
              passed: false,
              runtimeMs,
              error: parsed.error,
            })),
            message: parsed.error || 'Execution failed',
            error: parsed.error,
          });
        }

        const maskedResults = parsed.results.map((r: TestCaseResult, idx: number) => {
          const isHidden = cases[idx]?.isHidden && !revealHidden;
          return {
            ...r,
            input: isHidden ? 'Hidden test case' : r.input,
            expectedOutput: isHidden ? 'Hidden' : r.expectedOutput,
            actualOutput: isHidden ? (r.passed ? 'Passed' : 'Failed') : r.actualOutput,
          };
        });

        const passed = parsed.passedCount === cases.length;
        resolve({
          success: true,
          passed,
          passedCount: parsed.passedCount,
          totalCount: cases.length,
          runtimeMs,
          stdout,
          output: `${parsed.passedCount}/${cases.length} test cases passed.`,
          results: maskedResults,
          message: `${parsed.passedCount}/${cases.length} test cases passed.`,
        });
      } catch (e: any) {
        resolve({
          success: false,
          passed: false,
          passedCount: 0,
          totalCount: cases.length,
          runtimeMs,
          stdout,
          output: stderr || stdout,
          results: [],
          message: 'Failed to parse execution results.',
          error: e.message,
        });
      }
    });

    py.on('error', (err) => {
      resolve({
        success: false,
        passed: false,
        passedCount: 0,
        totalCount: cases.length,
        runtimeMs: Date.now() - started,
        stdout: '',
        output: `Python runner unavailable: ${err.message}`,
        results: [],
        message: 'Python runtime is not accessible on the server.',
        error: err.message,
      });
    });
  });
}

/**
 * Universal Sandbox Router for JavaScript/TypeScript & Python
 */
export async function runCodeInSandbox(params: {
  code: string;
  language?: string;
  testCases: RunnerTestCase[];
  revealHidden?: boolean;
}): Promise<ExecutionResult> {
  const { code, language = 'javascript', testCases, revealHidden = false } = params;
  const lang = language.toLowerCase();

  if (lang === 'python' || lang === 'py' || lang === 'python3') {
    return runPython(code, testCases, revealHidden);
  }

  return runJavaScript(code, testCases, revealHidden);
}
