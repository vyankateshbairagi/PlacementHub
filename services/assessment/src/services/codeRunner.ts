import vm from 'vm';
import { spawn } from 'child_process';

export interface TestCase {
  input: string;
  output: string;
  isHidden?: boolean;
}

export interface TestCaseResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
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
  memoryMb: string;
  results: TestCaseResult[];
  message: string;
  error?: string;
}

function normalizeOutput(val: any): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') {
    return val.trim().replace(/^['"]|['"]$/g, '');
  }
  try {
    return JSON.stringify(val);
  } catch {
    return String(val).trim();
  }
}

/**
 * Execute JavaScript code in an isolated Node.js VM context with strict timeouts
 */
export async function executeJavaScript(
  code: string,
  testCases: TestCase[] = [],
  timeoutMs: number = 2000
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const results: TestCaseResult[] = [];
  let passedCount = 0;

  if (!testCases || testCases.length === 0) {
    try {
      const sandbox: Record<string, any> = {
        console: {
          log: (...args: any[]) => sandbox.__logs.push(args.map((a) => String(a)).join(' ')),
        },
        __logs: [],
      };
      const context = vm.createContext(sandbox);
      const script = new vm.Script(code);
      const evalStart = Date.now();
      script.runInContext(context, { timeout: timeoutMs });
      const elapsed = Date.now() - evalStart;

      return {
        success: true,
        passed: true,
        passedCount: 1,
        totalCount: 1,
        runtimeMs: elapsed,
        memoryMb: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
        results: [
          {
            input: 'N/A',
            expectedOutput: 'Clean Execution',
            actualOutput: sandbox.__logs.join('\n') || 'Execution completed without output',
            passed: true,
            runtimeMs: elapsed,
          },
        ],
        message: 'Code executed successfully without runtime errors.',
      };
    } catch (err: any) {
      return {
        success: false,
        passed: false,
        passedCount: 0,
        totalCount: 1,
        runtimeMs: Date.now() - startTime,
        memoryMb: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
        results: [
          {
            input: 'N/A',
            expectedOutput: 'Success',
            actualOutput: 'Runtime Error',
            passed: false,
            runtimeMs: Date.now() - startTime,
            error: err.message,
          },
        ],
        message: `Runtime Error: ${err.message}`,
      };
    }
  }

  for (const tc of testCases) {
    const tcStart = Date.now();
    try {
      const harness = `
        ${code}
        ;(() => {
          try {
            let __inputStr = ${JSON.stringify(tc.input)};
            let __out = undefined;

            if (typeof twoSum === 'function') {
              const numsMatch = __inputStr.match(/nums\\s*=\\s*(\\[[^\\]]*\\])/);
              const targetMatch = __inputStr.match(/target\\s*=\\s*(-?\\d+)/);
              if (numsMatch && targetMatch) {
                const nums = JSON.parse(numsMatch[1]);
                const target = parseInt(targetMatch[1], 10);
                __out = twoSum(nums, target);
              } else {
                __out = twoSum(__inputStr);
              }
            } else if (typeof lengthOfLongestSubstring === 'function') {
              const sMatch = __inputStr.match(/s\\s*=\\s*["']([^"']*)["']/);
              __out = lengthOfLongestSubstring(sMatch ? sMatch[1] : __inputStr);
            } else if (typeof solution === 'function') {
              __out = solution(__inputStr);
            } else if (typeof solve === 'function') {
              __out = solve(__inputStr);
            }

            return __out !== undefined ? JSON.stringify(__out) : '__UNDEFINED_FUNCTION__';
          } catch(e) {
            return '__ERROR__' + e.message;
          }
        })();
      `;

      const sandbox: Record<string, any> = { console };
      const context = vm.createContext(sandbox);
      const script = new vm.Script(harness);
      const rawResult = script.runInContext(context, { timeout: timeoutMs });
      const tcDuration = Date.now() - tcStart;

      if (typeof rawResult === 'string' && rawResult.startsWith('__ERROR__')) {
        results.push({
          input: tc.input,
          expectedOutput: tc.output,
          actualOutput: 'Runtime Error',
          passed: false,
          runtimeMs: tcDuration,
          error: rawResult.replace('__ERROR__', ''),
        });
        continue;
      }

      if (rawResult === '__UNDEFINED_FUNCTION__') {
        results.push({
          input: tc.input,
          expectedOutput: tc.output,
          actualOutput: 'Function not found or returned undefined',
          passed: false,
          runtimeMs: tcDuration,
          error: 'No valid solution function found or returned undefined',
        });
        continue;
      }

      const normalizedExpected = normalizeOutput(tc.output);
      const normalizedActual = normalizeOutput(rawResult);

      // Strict equality check: Never pass on null when expected is non-null
      const isMatch = normalizedActual === normalizedExpected;

      if (isMatch) passedCount++;

      results.push({
        input: tc.input,
        expectedOutput: tc.output,
        actualOutput: String(rawResult),
        passed: isMatch,
        runtimeMs: tcDuration,
      });
    } catch (err: any) {
      results.push({
        input: tc.input,
        expectedOutput: tc.output,
        actualOutput: 'Exception',
        passed: false,
        runtimeMs: Date.now() - tcStart,
        error: err.message,
      });
    }
  }

  const allPassed = passedCount === testCases.length;
  const totalDuration = Date.now() - startTime;

  return {
    success: true,
    passed: allPassed,
    passedCount,
    totalCount: testCases.length,
    runtimeMs: totalDuration,
    memoryMb: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
    results,
    message: allPassed
      ? `All ${testCases.length} test cases passed successfully!`
      : `${passedCount} of ${testCases.length} test cases passed.`,
  };
}

/**
 * Execute Python code in an isolated subprocess with strict timeouts
 */
export async function executePython(
  code: string,
  testCases: TestCase[] = [],
  timeoutMs: number = 3000
): Promise<ExecutionResult> {
  const startTime = Date.now();

  const pythonScript = `
import sys, json, time

user_code = ${JSON.stringify(code)}
test_cases = ${JSON.stringify(testCases)}

user_globals = {}
try:
    exec(user_code, user_globals)
except Exception as e:
    print(json.dumps({ "success": False, "error": f"{type(e).__name__}: {str(e)}" }))
    sys.exit(0)

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
            "actualOutput": "Error: No solution function found.",
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
      timeout: timeoutMs,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (d) => (stdout += d.toString()));
    py.stderr.on('data', (d) => (stderr += d.toString()));

    py.on('close', (codeExit) => {
      const runtimeMs = Date.now() - startTime;
      const memMb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

      if (codeExit !== 0 && !stdout) {
        return resolve({
          success: false,
          passed: false,
          passedCount: 0,
          totalCount: testCases.length,
          runtimeMs,
          memoryMb: memMb,
          results: testCases.map((tc) => ({
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
            totalCount: testCases.length,
            runtimeMs,
            memoryMb: memMb,
            results: testCases.map((tc) => ({
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

        const passed = parsed.passedCount === testCases.length;
        resolve({
          success: true,
          passed,
          passedCount: parsed.passedCount,
          totalCount: testCases.length,
          runtimeMs,
          memoryMb: memMb,
          results: parsed.results,
          message: `${parsed.passedCount}/${testCases.length} test cases passed.`,
        });
      } catch (err: any) {
        resolve({
          success: false,
          passed: false,
          passedCount: 0,
          totalCount: testCases.length,
          runtimeMs,
          memoryMb: memMb,
          results: [],
          message: 'Failed to parse execution results.',
          error: err.message,
        });
      }
    });

    py.on('error', (err) => {
      resolve({
        success: false,
        passed: false,
        passedCount: 0,
        totalCount: testCases.length,
        runtimeMs: Date.now() - startTime,
        memoryMb: '0.0',
        results: [],
        message: 'Python runtime is unavailable on the server.',
        error: err.message,
      });
    });
  });
}

/**
 * Universal runner router
 */
export async function runCode(
  code: string,
  language: string = 'javascript',
  testCases: TestCase[] = []
): Promise<ExecutionResult> {
  const lang = language.toLowerCase();

  if (lang === 'python' || lang === 'py' || lang === 'python3') {
    return executePython(code, testCases);
  }

  return executeJavaScript(code, testCases);
}
