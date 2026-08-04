#!/usr/bin/env node

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

const REQUIRED_ENV_VALUE = '1'
const HOST = '127.0.0.1'

function fail(message) {
  throw new Error(`phase120 image probe: ${message}`)
}

function parseArgs(argv) {
  const parsed = { nextPort: 3100, fixturePort: 3101, verifier: '', verifierArgs: [] }
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--next-port' || token === '--fixture-port' || token === '--verifier') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) fail(`${token} requires a value`)
      index += 1
      if (token === '--next-port') parsed.nextPort = Number(value)
      else if (token === '--fixture-port') parsed.fixturePort = Number(value)
      else parsed.verifier = value
      continue
    }
    parsed.verifierArgs.push(token)
  }
  if (parsed.nextPort !== 3100 || parsed.fixturePort !== 3101) {
    fail('isolated ports must be exactly 3100 and 3101')
  }
  if (!parsed.verifier) fail('--verifier is required')
  return parsed
}

async function listen(server, port) {
  await new Promise((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(port, HOST, resolveListen)
  })
}

async function closeServer(server) {
  if (!server.listening) return
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()))
}

async function waitForNext(baseURL, child) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) fail(`Next exited before health check with code ${child.exitCode}`)
    try {
      const response = await fetch(`${baseURL}/__phase120-image-probe/alpha-badge.png`)
      if (response.ok) return
    } catch {
      // The server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 200))
  }
  fail('Next health check timed out after 30 seconds')
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return
  child.kill('SIGTERM')
  await Promise.race([
    new Promise((resolveExit) => child.once('exit', resolveExit)),
    new Promise((resolveTimeout) => setTimeout(resolveTimeout, 5_000)),
  ])
  if (child.exitCode === null) child.kill('SIGKILL')
}

async function main() {
  if (process.env.PHASE120_IMAGE_PROBE !== REQUIRED_ENV_VALUE) {
    fail('refusing to run unless PHASE120_IMAGE_PROBE=1')
  }

  const args = parseArgs(process.argv.slice(2))
  const requiredInternalURL = `http://${HOST}:${args.fixturePort}`
  if (process.env.API_INTERNAL_URL !== requiredInternalURL) {
    fail(`API_INTERNAL_URL must be exactly ${requiredInternalURL}`)
  }

  const projectFixturePath = resolve('test/fixtures/phase120-image-probe/project-cover.png')
  const groupFixturePath = resolve('test/fixtures/phase120-image-probe/group-logo.png')
  const fixtureServer = createServer(async (request, response) => {
    const requestURL = new URL(request.url ?? '/', requiredInternalURL)
    const fixturePath = requestURL.pathname === '/api/v1/media/phase120-project-cover.png'
      ? projectFixturePath
      : requestURL.pathname === '/api/v1/media/phase120-group-logo.png'
        ? groupFixturePath
        : undefined
    if (request.method !== 'GET' || requestURL.search || !fixturePath) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('Not Found')
      return
    }
    try {
      const body = await readFile(fixturePath)
      response.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': String(body.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      })
      response.end(body)
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end(error instanceof Error ? error.message : 'Fixture read failed')
    }
  })

  let nextChild
  const terminate = async (signal) => {
    await stopChild(nextChild)
    await closeServer(fixtureServer)
    process.exit(signal === 'SIGINT' ? 130 : 143)
  }
  process.once('SIGINT', () => { void terminate('SIGINT') })
  process.once('SIGTERM', () => { void terminate('SIGTERM') })

  try {
    await listen(fixtureServer, args.fixturePort)
    nextChild = spawn(
      process.execPath,
      ['node_modules/next/dist/bin/next', 'start', '--hostname', HOST, '--port', String(args.nextPort)],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          HOSTNAME: HOST,
          PORT: String(args.nextPort),
          API_INTERNAL_URL: requiredInternalURL,
        },
        stdio: ['ignore', 'inherit', 'inherit'],
      },
    )
    await waitForNext(`http://${HOST}:${args.nextPort}`, nextChild)

    const verifierPath = resolve(args.verifier)
    const scriptsRoot = `${resolve('scripts')}/`
    if (!verifierPath.startsWith(scriptsRoot)) fail('verifier must resolve inside scripts/')
    const verifier = spawn(process.execPath, [
      verifierPath,
      '--base-url', `http://${HOST}:${args.nextPort}`,
      '--fixture-origin', requiredInternalURL,
      ...args.verifierArgs,
    ], { cwd: process.cwd(), env: process.env, stdio: 'inherit' })
    const verifierCode = await new Promise((resolveExit, reject) => {
      verifier.once('error', reject)
      verifier.once('exit', (code) => resolveExit(code ?? 1))
    })
    if (verifierCode !== 0) fail(`verifier exited with code ${verifierCode}`)
  } finally {
    await stopChild(nextChild)
    await closeServer(fixtureServer)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
