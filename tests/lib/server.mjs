import { spawn } from "node:child_process";
import net from "node:net";

function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server at ${url} did not become ready in time`);
}

export async function startServer() {
  await run("npx", ["next", "build"]);

  const port = await findFreePort();
  const url = `http://localhost:${port}`;
  const child = spawn("npx", ["next", "start", "-p", String(port)], {
    stdio: "inherit",
  });

  await waitForServer(url);

  return {
    url,
    async close() {
      child.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 200));
    },
  };
}
