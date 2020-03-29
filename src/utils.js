import { exec as nodeExec } from 'child_process'
import { request as httpsRequest } from 'https'
import { request as httpRequest } from 'http'
import { existsSync, readdirSync, writeFileSync, readFileSync } from 'fs'
import { sep, join, basename, dirname } from 'path'
import { createRequire } from 'module'
import ArgParser from './lib/ArgParser.js'

const require = createRequire(import.meta.url)
export const pkgInfo = require('../package.json')

export const cwd = process.cwd()
export const currentDir = basename(cwd)
export const scriptDir = dirname(dirname(import.meta.url).split('file://')[1])
export const helpFile = readFileSync(join(scriptDir, 'src', 'resource', 'help.txt'), 'utf8')

export const directoryExist = (dirName) => {
  return existsSync(join(cwd, dirName, sep))
}

export const reduceStr = (...args) => {
  if (args.length === 1) {
    return args[0]
  }
  return args.join('')
}

export const argv = new ArgParser({
  flag: {
    verbose: 'V',
    help: 'h',
    version: 'v',
  },
  name: '',
  desc: '',
})

export const listDir = (dir = cwd) => {
  const list = readdirSync(dir, { withFileTypes: true })
  return list.map((elem) => (elem.isDirectory() ? `${elem.name}${sep}` : elem.name))
}

export const debug = (...args) => {
  if (argv.flag.verbose) {
    console.debug()
    console.debug(...args)
  }
}

export const addGitIgnore = (filesName) => {
  if (filesName.length) {
    writeFileSync('.gitignore', filesName.map((name) => `${name}\n`).join(''), { flag: 'a' })
  }
}

export const exec = (command) => {
  return new Promise((resolve, reject) => {
    nodeExec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err)
      }
      if (stdout || stderr) {
        debug('command:', command, '\n', stdout, '\n', stderr)
      }
      resolve({ command, stdout, stderr })
    })
  })
}

export const request = (url, body, options = {}) => {
  return new Promise((resolve, reject) => {
    const nodeRequest = url.startsWith('https') ? httpsRequest : httpRequest
    const request = nodeRequest(url, options, (response) => {
      let responseBody = ''

      response.on('data', (chunk) => {
        responseBody += chunk.toString()
      })

      response.on('end', () => {
        response.body = responseBody
        resolve(response)
      })
      response.on('error', (error) => {
        reject(error)
      })
    })
    request.on('error', (error) => {
      reject(error)
    })

    if (body) {
      body = JSON.stringify(body)
      request.setHeader('Content-Type', 'application/json')
      request.setHeader('Content-Length', body.length)
    }

    request.end(body)
    debug(request.outputData[0].data)
  })
}

export const noNew = (_class) => {
  const decoratedClass = new Proxy(_class, {
    apply(target, _thisArg, argumentsList) {
      return new target(...argumentsList)
    },
  })
  return decoratedClass
}

export const getEnv = readFileSync(join(scriptDir, '.env'), 'utf8')
  .split('\n')
  .slice(0, -1)
  .reduce((obj, line) => {
    const [name, value] = line.split('=')
    obj[name.trim()] = value.trim()
    return obj
  }, {})
