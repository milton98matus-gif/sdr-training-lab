import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import readline from 'node:readline';

const PY_WORKER_SCRIPT = `
import sys
import json
import sqlite3

db_path = sys.argv[1]
conn = sqlite3.connect(db_path, isolation_level=None)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

in_transaction = False

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    req = json.loads(line)
    cmd = req.get('cmd')
    req_id = req.get('id')
    args = req.get('args', [])
    try:
        if cmd == 'exec':
            sql = req['sql'].strip()
            if sql.upper() == 'BEGIN':
                cur.execute('BEGIN')
                in_transaction = True
            elif sql.upper() == 'COMMIT':
                cur.execute('COMMIT')
                in_transaction = False
            elif sql.upper() == 'ROLLBACK':
                cur.execute('ROLLBACK')
                in_transaction = False
            else:
                cur.executescript(sql)
            print(json.dumps({'id': req_id, 'ok': True}))
        elif cmd == 'run':
            sql = req['sql']
            cur.execute(sql, args)
            if not in_transaction and not sql.strip().upper().startswith('SELECT'):
                # In autocommit mode (isolation_level=None), DML automatically commits
                pass
            print(json.dumps({'id': req_id, 'ok': True, 'changes': cur.rowcount}))
        elif cmd == 'get':
            sql = req['sql']
            cur.execute(sql, args)
            row = cur.fetchone()
            print(json.dumps({'id': req_id, 'ok': True, 'row': dict(row) if row else None}))
        elif cmd == 'all':
            sql = req['sql']
            cur.execute(sql, args)
            rows = [dict(r) for r in cur.fetchall()]
            print(json.dumps({'id': req_id, 'ok': True, 'rows': rows}))
        elif cmd == 'batch':
            cur.execute('BEGIN')
            try:
                for s in req['stmts']:
                    cur.execute(s['sql'], s.get('args', []))
                cur.execute('COMMIT')
                print(json.dumps({'id': req_id, 'ok': True}))
            except Exception as e:
                cur.execute('ROLLBACK')
                raise e
        else:
            print(json.dumps({'id': req_id, 'ok': False, 'error': f'Unknown command {cmd}'}))
    except Exception as e:
        print(json.dumps({'id': req_id, 'ok': False, 'error': str(e)}))
    sys.stdout.flush()
`;

export class DatabaseSync {
  constructor(dbPath = ':memory:') {
    this.dbPath = dbPath;
    this.diskFile = dbPath === ':memory:'
      ? `/tmp/sdr_mem_${Date.now()}_${Math.random().toString(36).slice(2)}.sqlite`
      : dbPath;

    // Start persistent Python SQLite worker
    this.worker = spawn('python3', ['-u', '-c', PY_WORKER_SCRIPT, this.diskFile], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    this.pendingCallbacks = new Map();
    this.nextReqId = 1;

    const rl = readline.createInterface({ input: this.worker.stdout });
    rl.on('line', (line) => {
      if (!line.trim()) return;
      try {
        const res = JSON.parse(line);
        const cb = this.pendingCallbacks.get(res.id);
        if (cb) {
          this.pendingCallbacks.delete(res.id);
          cb(res);
        }
      } catch (e) {
        console.error('[SQLite Bridge Worker Error]', e, line);
      }
    });

    this.worker.on('exit', (code) => {
      for (const [id, cb] of this.pendingCallbacks.entries()) {
        cb({ ok: false, error: `Worker exited with code ${code}` });
      }
      this.pendingCallbacks.clear();
    });
  }

  _send(cmd, payload) {
    return new Promise((resolve, reject) => {
      const id = this.nextReqId++;
      this.pendingCallbacks.set(id, (res) => {
        if (!res.ok) {
          reject(new Error(res.error || 'SQLite error'));
        } else {
          resolve(res);
        }
      });
      const data = JSON.stringify({ id, cmd, ...payload }) + '\n';
      this.worker.stdin.write(data);
    });
  }

  // Synchronous-like bridge for DatabaseSync interface:
  // Since db.mjs wraps in async functions, we can provide async methods directly!
  exec(sql) {
    // For DDL execution on startup, use sync child_process
    const py = `
import sqlite3
conn = sqlite3.connect('${this.diskFile}')
conn.executescript('''${sql.replace(/'/g, "\\'")}''')
conn.close()
`;
    const res = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
    if (res.error) throw res.error;
    if (res.status !== 0 && !res.stderr.includes('already exists')) {
      throw new Error(res.stderr);
    }
  }

  prepare(sql) {
    const self = this;
    return {
      run(...args) {
        const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return self._send('run', { sql, args: flat }).then(r => ({ changes: r.changes }));
      },
      get(...args) {
        const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return self._send('get', { sql, args: flat }).then(r => r.row);
      },
      all(...args) {
        const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return self._send('all', { sql, args: flat }).then(r => r.rows);
      }
    };
  }

  async batch(stmts) {
    return this._send('batch', { stmts });
  }

  close() {
    try {
      this.worker.kill();
      if (this.dbPath === ':memory:' && fs.existsSync(this.diskFile)) {
        fs.unlinkSync(this.diskFile);
      }
    } catch {}
  }
}

import { spawnSync } from 'node:child_process';
